// Builds the demo's two reports: serves site/ on 127.0.0.1, runs the mock
// StreamFlix sign-up flow against the fair and the unfair cancel flow, and
// writes <out>/fair/ and <out>/unfair/ (report.html, report.json,
// screenshots). `npm run demo` writes them to site/reports/, where the demo
// page links to them. Exits 0 when the fair pair holds and the unfair one
// fails, the outcome the demo exists to show.

import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { cancelParity, type ParityReport } from "../src/parity.ts";
import { serve } from "../tests/fixtures/serve.ts";

const SITE = join(import.meta.dirname, "..", "site");

export function signup(base: string) {
  return async (page: Page) => {
    await page.goto(`${base}streamflix/signup.html`);
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await page.getByLabel("Name on card").fill("Test User");
    await page.getByRole("link", { name: "Return to StreamFlix" }).click();
    await page.getByRole("heading", { name: "Welcome" }).waitFor();
  };
}

export function fairCancel(base: string) {
  return async (page: Page) => {
    await page.goto(`${base}streamflix/fair/account.html`);
    await page.getByRole("link", { name: "Cancel plan" }).click();
    await page.getByRole("link", { name: "Confirm cancellation" }).click();
    await page.getByRole("heading", { name: "cancelled" }).waitFor();
  };
}

export function unfairCancel(base: string) {
  return async (page: Page) => {
    await page.goto(`${base}streamflix/unfair/account.html`);
    await page.getByRole("link", { name: "Cancel plan" }).click();
    await page.getByRole("link", { name: "No thanks" }).click();
    await page.getByLabel("Reason").fill("Too expensive");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("link", { name: "Confirm cancellation" }).click();
    await page.getByRole("heading", { name: "cancelled" }).waitFor();
  };
}

/** Runs both pairs and writes their reports under `out`. */
export async function buildDemo(out: string): Promise<{ fair: ParityReport; unfair: ParityReport }> {
  const site = await serve(SITE);
  try {
    // The sandbox payment page shares the site's origin here, so name it.
    const base = { paymentUrls: ["/streamflix/pay.html"] };
    const fair = await cancelParity(
      { ...base, flows: { signup: signup(site.url), cancel: fairCancel(site.url) } },
      { outDir: join(out, "fair"), title: "StreamFlix: the fair cancel flow" },
    );
    const unfair = await cancelParity(
      { ...base, flows: { signup: signup(site.url), cancel: unfairCancel(site.url) } },
      { outDir: join(out, "unfair"), title: "StreamFlix: the unfair cancel flow" },
    );
    return { fair, unfair };
  } finally {
    await site.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(process.argv[2] ?? join(SITE, "reports"));
  const { fair, unfair } = await buildDemo(out);
  const holds = (r: ParityReport) => r.comparison?.pass === true;
  console.log(`fair: ${holds(fair) ? "parity holds" : "parity fails"}; unfair: ${holds(unfair) ? "parity holds" : "parity fails"}`);
  console.log(`Reports: ${join(out, "fair", "report.html")}, ${join(out, "unfair", "report.html")}`);
  process.exitCode = holds(fair) && !holds(unfair) ? 0 : 1;
}
