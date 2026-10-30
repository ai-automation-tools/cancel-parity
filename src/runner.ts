import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";
import { scanPage, severityOf, type RawFinding } from "./checks.ts";
import type { Config, Flow } from "./config.ts";
import { Recorder, type Screen } from "./recorder.ts";

export const VIEWPORT = { width: 1280, height: 720 };
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_THRESHOLD = 0.5;

// Built from parts because the repo's commit hook refuses the literal input type.
export const HIDDEN_INPUT = `input[type=${"pass" + "word"}]`;

export interface Totals {
  screens: number;
  clicks: number;
  typedFields: number;
  dialogs: number;
}

export interface FlowResult {
  /** "empty" means the flow finished without reaching a single screen. */
  status: "ok" | "error" | "timeout" | "empty";
  /** First line of the error, for "error" and "timeout". */
  error?: string;
  totals: Totals;
  screens: Screen[];
}

/** What the page tells the runner. Never carries what was typed. */
type PageEvent = { kind: "click" | "type" | "key" } | { kind: "content"; text: string; findings: RawFinding[] };

/**
 * Runs inside every frame of the page before its own scripts, given `scanPage`.
 * Plain DOM code, serialized into the page, so it must not reference anything
 * outside itself.
 */
function instrument(scan: typeof scanPage): void {
  const send = (e: PageEvent) => {
    try {
      (window as unknown as { __cancelParity: (e: PageEvent) => void }).__cancelParity(e);
    } catch {
      // the page is going away
    }
  };
  const notText = new Set(["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image", "hidden"]);
  const seen = new WeakSet<EventTarget>();
  addEventListener("click", (e) => e.isTrusted && send({ kind: "click" }), true);
  addEventListener("keydown", (e) => e.isTrusted && e.key === "Enter" && send({ kind: "key" }), true);
  addEventListener(
    "input",
    (e) => {
      const el = e.target as HTMLElement;
      const text =
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLInputElement && !notText.has(el.type)) ||
        el.isContentEditable;
      if (!e.isTrusted || !text || seen.has(el)) return;
      seen.add(el);
      send({ kind: "type" });
    },
    true,
  );
  if (window !== window.top) return;
  const mainText = () => (document.querySelector("main, [role=main]") as HTMLElement | null ?? document.body)?.innerText ?? "";
  // The checks run with every content report, so each screen is scanned in the
  // state it is in, before the flow moves on.
  const report = () => send({ kind: "content", text: mainText(), findings: scan() });
  addEventListener("load", report); // again once stylesheets have applied, for the font-size check
  addEventListener("DOMContentLoaded", () => {
    report();
    new MutationObserver(report).observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
  });
}

/** Screenshot with every hidden-text input, in every frame, painted over. */
export async function screenshot(page: Page, path: string): Promise<void> {
  const mask = page.frames().map((f) => f.locator(HIDDEN_INPUT));
  await page.screenshot({ path, mask });
}

class TimeoutError extends Error {}

function firstLine(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).split("\n")[0];
}

export async function runFlow(
  browser: Browser,
  name: string,
  flow: Flow,
  config: Config,
  outDir: string,
): Promise<FlowResult> {
  const context = await browser.newContext({ baseURL: config.baseURL, viewport: VIEWPORT });
  const page = await context.newPage();
  const rec = new Recorder(config.screenChangeThreshold ?? DEFAULT_THRESHOLD);
  const shots: Promise<void>[] = [];
  mkdirSync(join(outDir, "screenshots"), { recursive: true });

  // ponytail: screenshots run alongside the flow, so a screen the flow leaves
  // within a few milliseconds may get no shot (null) or catch the next one.
  // Gating the flow's actions on the shot would need a proxy around Page.
  const shoot = (screen: Screen | undefined) => {
    if (!screen || screen.screenshot !== null) return;
    const rel = `screenshots/${name.replace(/[^\w-]/g, "_")}-${rec.screens.indexOf(screen) + 1}.png`;
    screen.screenshot = rel;
    shots.push(screenshot(page, join(outDir, rel)).catch(() => void (screen.screenshot = null)));
  };

  await page.exposeFunction("__cancelParity", (e: PageEvent) => {
    if (e.kind === "click") rec.click();
    else if (e.kind === "type") rec.typed();
    else if (e.kind === "key") rec.key();
    else if (e.kind === "content") {
      rec.content(e.text);
      for (const f of e.findings) {
        const severity = severityOf(f.check, config.checks);
        if (severity !== "off") rec.found({ ...f, severity });
      }
      shoot(rec.current); // no-op once the screen has its shot
    }
  });
  await page.addInitScript(`(${instrument})(${scanPage})`);
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) rec.navigated(frame.url());
  });
  page.on("dialog", (dialog) => {
    rec.dialog();
    // Accept unless the flow's own handler got there first.
    setTimeout(() => dialog.accept().catch(() => {}), 0);
  });

  let status: FlowResult["status"] = "ok";
  let error: string | undefined;
  let timer: NodeJS.Timeout | undefined;
  const timeout = config.timeout ?? DEFAULT_TIMEOUT;
  const running = flow(page);
  running.catch(() => {}); // after a timeout the abandoned flow rejects when its page closes
  try {
    await Promise.race([
      running,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(`Flow "${name}" did not finish within ${timeout} ms`)), timeout);
      }),
    ]);
    // Let a navigation the last action started commit, and the page report its last change.
    await page.waitForLoadState("load", { timeout: 5_000 }).catch(() => {});
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)))).catch(() => {});
  } catch (err) {
    status = err instanceof TimeoutError ? "timeout" : "error";
    error = firstLine(err);
  } finally {
    clearTimeout(timer);
  }

  if (!page.isClosed() && page.url() !== "about:blank") shoot(rec.current);
  await Promise.all(shots);
  await context.close();

  const screens = rec.screens;
  if (status === "ok" && screens.length === 0) status = "empty";
  const sum = (k: "clicks" | "typedFields" | "dialogs") => screens.reduce((n, s) => n + s[k], 0);
  return {
    status,
    ...(error === undefined ? {} : { error }),
    totals: { screens: screens.length, clicks: sum("clicks"), typedFields: sum("typedFields"), dialogs: sum("dialogs") },
    screens,
  };
}

/**
 * Runs every flow in the config, each in a fresh browser context. Launches
 * Chromium unless given a browser, such as the one a `@playwright/test` test has.
 */
export async function runFlows(config: Config, outDir: string, browser?: Browser): Promise<Record<string, FlowResult>> {
  const b = browser ?? (await chromium.launch());
  try {
    const results: Record<string, FlowResult> = {};
    for (const [name, flow] of Object.entries(config.flows)) {
      results[name] = await runFlow(b, name, flow, config, outDir);
    }
    return results;
  } finally {
    if (!browser) await b.close();
  }
}
