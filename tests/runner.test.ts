import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";
import { run } from "../src/run.ts";
import { runFlow, screenshot } from "../src/runner.ts";
import type { Config, Flow } from "../src/config.ts";
import { serve } from "./fixtures/serve.ts";

const SECRET = "s3cret-Value-Never-Leaves";

let browser: Browser;
let site: Awaited<ReturnType<typeof serve>>;
let other: Awaited<ReturnType<typeof serve>>; // a second origin, like a hosted payment page

before(async () => {
  browser = await chromium.launch();
  site = await serve();
  other = await serve();
});

after(async () => {
  await browser.close();
  await site.close();
  await other.close();
});

const tmp = () => mkdtempSync(join(tmpdir(), "cancel-parity-run-"));

function go(flow: Flow, extra: Partial<Config> = {}) {
  const config: Config = { flows: { flow }, baseURL: site.url, ...extra };
  return runFlow(browser, "flow", flow, config, tmp());
}

const multipage: Flow = async (page) => {
  await page.goto("multipage/");
  await page.getByLabel("Email").fill("test@example.com");
  await page.locator("#secret").fill(SECRET);
  await page.getByLabel("I agree").check();
  await page.getByRole("button", { name: "Start trial" }).click();
  await page.getByRole("heading", { name: "Welcome" }).waitFor();
};

const spa: Flow = async (page) => {
  await page.goto("spa/");
  await page.getByRole("button", { name: "Show billing details" }).click();
  await page.getByRole("button", { name: "Continue to cancel" }).click();
  await page.getByLabel("Reason").fill("Too expensive");
  await page.getByRole("button", { name: "Confirm cancellation" }).click();
  await page.getByRole("heading", { name: "cancelled" }).waitFor();
};

const counts = (s: { clicks: number; typedFields: number; dialogs: number }) => [s.clicks, s.typedFields, s.dialogs];

test("multi-page flow: 2 screens, 2 clicks, 2 typed fields, 1 dialog", async () => {
  const r = await go(multipage);
  assert.equal(r.status, "ok");
  assert.deepEqual(r.totals, { screens: 2, clicks: 2, typedFields: 2, dialogs: 1 });
  assert.deepEqual(r.screens.map(counts), [[2, 2, 1], [0, 0, 0]]);
  assert.equal(r.screens[0].url, `${site.url}multipage/`);
  assert.equal(r.screens[1].url, `${site.url}multipage/done.html`);
});

test("SPA flow: 3 screens from main-content changes; a small change and a pushState add none", async () => {
  const r = await go(spa);
  assert.equal(r.status, "ok");
  assert.deepEqual(r.totals, { screens: 3, clicks: 3, typedFields: 1, dialogs: 0 });
  assert.deepEqual(r.screens.map(counts), [[2, 0, 0], [1, 1, 0], [0, 0, 0]]);
});

test("a cross-origin page in the middle of a flow is a screen and is counted", async () => {
  const back = `${site.url}multipage/done.html`;
  const pay = `${other.url}xorigin/pay.html?return=${encodeURIComponent(back)}`;
  const r = await go(async (page) => {
    await page.goto(`xorigin/pay.html?return=${encodeURIComponent(pay)}`);
    await page.getByRole("link", { name: "Return" }).click();
    await page.getByLabel("Name on card").fill("Test User");
    await page.getByRole("link", { name: "Return" }).click();
    await page.getByRole("heading", { name: "Welcome" }).waitFor();
  });
  assert.equal(r.status, "ok");
  assert.deepEqual(r.screens.map((s) => new URL(s.url).origin), [site.url, other.url, site.url].map((u) => new URL(u).origin));
  assert.deepEqual(r.totals, { screens: 3, clicks: 2, typedFields: 1, dialogs: 0 });
});

test("a flow that throws is reported with what it recorded", async () => {
  const r = await go(async (page) => {
    await page.goto("multipage/");
    await page.getByLabel("Email").fill("test@example.com");
    throw new Error("boom\nsecond line");
  });
  assert.equal(r.status, "error");
  assert.equal(r.error, "boom");
  assert.deepEqual(r.totals, { screens: 1, clicks: 0, typedFields: 1, dialogs: 0 });
});

test("a flow that stalls mid-flow times out with what it recorded", async () => {
  const r = await go(
    async (page) => {
      await page.goto("multipage/");
      await page.getByLabel("I agree").check();
      await page.locator("#never-appears").click();
    },
    { timeout: 1500 },
  );
  assert.equal(r.status, "timeout");
  assert.match(r.error ?? "", /did not finish within 1500 ms/);
  assert.deepEqual(r.totals, { screens: 1, clicks: 1, typedFields: 0, dialogs: 0 });
});

test("an empty flow is reported as empty", async () => {
  const r = await go(async () => {});
  assert.equal(r.status, "empty");
  assert.deepEqual(r.totals, { screens: 0, clicks: 0, typedFields: 0, dialogs: 0 });
});

const MAGENTA = [255, 0, 255]; // Playwright's mask colour

/** Takes a masked screenshot and reads back the pixel at the centre of each selector's element. */
async function shotCentres(page: Page, selectors: string[]): Promise<number[][]> {
  const file = join(tmp(), "shot.png");
  await screenshot(page, file);
  const png = readFileSync(file).toString("base64");
  const points = [];
  for (const s of selectors) {
    const box = (await page.locator(s).boundingBox())!;
    points.push({ x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) });
  }
  // Read the pixels back out of the PNG, in the browser.
  return page.evaluate(
    async ({ png, points }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      return points.map(({ x, y }) => [...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)]);
    },
    { png, points },
  );
}

test("screenshots paint over hidden-text inputs", async () => {
  const page = await browser.newPage();
  await page.goto(`${site.url}multipage/`);
  await page.locator("#secret").fill(SECRET);
  const [rgb] = await shotCentres(page, ["#secret"]);
  await page.close();
  assert.deepEqual(rgb, MAGENTA);
});

test("screenshots paint over every text input, text area and editable region, and leave boxes and buttons", async () => {
  const page = await browser.newPage();
  await page.goto(`${site.url}hardening/`);
  await page.locator("#card").fill("4242 4242 4242 4242");
  await page.locator("#notes").fill(SECRET);
  await page.locator("#bio").fill(SECRET);
  const [card, notes, bio, news, go] = await shotCentres(page, ["#card", "#notes", "#bio", "#news", "#go"]);
  await page.close();
  assert.deepEqual([card, notes, bio], [MAGENTA, MAGENTA, MAGENTA]);
  assert.notDeepEqual(news, MAGENTA);
  assert.notDeepEqual(go, MAGENTA);
});

test("a page can't feed the runner events: only calls with the run's nonce count", async () => {
  let stolen = -1;
  const r = await go(async (page) => {
    await page.goto("hardening/");
    await page.locator("h1").click();
    stolen = await page.evaluate(() => (window as unknown as { __stolen: unknown[] }).__stolen.length);
  });
  assert.equal(r.status, "ok");
  // The page forged 10 clicks and a phone-only finding; only the flow's own click counts.
  assert.deepEqual(r.totals, { screens: 1, clicks: 1, typedFields: 0, dialogs: 0 });
  assert.ok(!r.screens[0].findings.some((f) => f.check === "phone-only"));
  // The runner never called through the global the page swapped out, so the page never saw the nonce.
  assert.equal(stolen, 0);
});

test("control characters in page text and errors never reach the report or the terminal", async () => {
  const r = await go(async (page) => {
    await page.goto("hardening/");
    throw new Error(`bad${String.fromCharCode(27)}[2J${String.fromCharCode(0x202e)}page text`);
  });
  assert.equal(r.error, "bad [2J page text");
  const guilt = r.screens[0].findings.find((f) => f.check === "guilt-copy");
  assert.equal(guilt?.evidence, "We'll miss you [2J really");
});

test("cancel-parity run writes the report, and a typed secret never reaches it or the output", async () => {
  const dir = tmp();
  const configFile = join(dir, "cancel-parity.config.ts");
  writeFileSync(
    configFile,
    `export default {
  baseURL: process.env.CANCEL_PARITY_BASE_URL,
  flows: {
    signup: async (page) => {
      await page.goto("multipage/");
      await page.getByLabel("Email").fill("test@example.com");
      await page.locator("#secret").fill(process.env.CANCEL_PARITY_TEST_SECRET);
      await page.getByLabel("I agree").check();
      await page.getByRole("button", { name: "Start trial" }).click();
      await page.getByRole("heading", { name: "Welcome" }).waitFor();
    },
  },
};
`,
  );
  process.env.CANCEL_PARITY_BASE_URL = site.url;
  process.env.CANCEL_PARITY_TEST_SECRET = SECRET;
  let out = "";
  let err = "";
  const code = await run(["run", "--out", "report"], { out: (s) => (out += s), err: (s) => (err += s), cwd: dir });
  delete process.env.CANCEL_PARITY_TEST_SECRET;
  assert.equal(code, 0, err);
  assert.match(out, /signup: 2 screens, 2 clicks, 2 typed fields, 1 dialog/);

  const json = readFileSync(join(dir, "report", "report.json"), "utf8");
  const report = JSON.parse(json);
  assert.equal(report.flows.signup.totals.screens, 2);
  for (const s of report.flows.signup.screens) {
    if (s.screenshot !== null) assert.ok(existsSync(join(dir, "report", s.screenshot)), s.screenshot);
  }
  assert.ok(report.flows.signup.screens.at(-1).screenshot, "the last screen always gets a screenshot");
  const html = readFileSync(join(dir, "report", "report.html"), "utf8");
  assert.match(html, /<h1>cancel-parity report<\/h1>/);
  assert.ok(!json.includes(SECRET) && !html.includes(SECRET) && !out.includes(SECRET) && !err.includes(SECRET));
});

test("cancel-parity run exits 1 when a flow fails and 2 when the config is unusable", async () => {
  const dir = tmp();
  writeFileSync(join(dir, "bad.config.mjs"), "export default { flows: { signup: 'not a function' } };\n");
  writeFileSync(join(dir, "empty.config.mjs"), "export default { flows: { cancel: async () => {} } };\n");
  const exec = async (...argv: string[]) => {
    let err = "";
    const code = await run(argv, { out: () => {}, err: (s) => (err += s), cwd: dir });
    return { code, err };
  };
  assert.deepEqual(await exec("run", "--config", "missing.config.ts"), { code: 2, err: "Config file not found: missing.config.ts\n" });
  assert.equal((await exec("run", "--config", "bad.config.mjs")).code, 2);
  assert.equal((await exec("run")).code, 2);
  const empty = await exec("run", "--config", "empty.config.mjs");
  assert.equal(empty.code, 1);
  assert.match(empty.err, /cancel: empty \(the flow reached no screen\)/);
});
