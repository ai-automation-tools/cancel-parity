import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser } from "@playwright/test";
import { CHECKS, scanPage, type CheckId } from "../src/checks.ts";
import { checkConfig, ConfigError } from "../src/config.ts";
import { cancelParity } from "../src/parity.ts";
import { fairCancelFlow, signupFlow, unfairCancelFlow } from "./fixtures/flows.ts";
import { serve } from "./fixtures/serve.ts";

let browser: Browser;
let site: Awaited<ReturnType<typeof serve>>;
let pay: Awaited<ReturnType<typeof serve>>;

before(async () => {
  browser = await chromium.launch();
  site = await serve();
  pay = await serve();
});

after(async () => {
  await browser.close();
  await site.close();
  await pay.close();
});

const tmp = () => mkdtempSync(join(tmpdir(), "cancel-parity-checks-"));

// A fair and an unfair screen for each check. The unfair one fires that check
// and no other; the fair one fires nothing.
const SCREENS: Record<CheckId, { unfair: string; fair: string }> = {
  "retention-offer": {
    unfair: "<h1>Wait! Stay for half price</h1>",
    fair: "<h1>Cancel your plan</h1><p>You keep access until the end of the period.</p>",
  },
  "guilt-copy": {
    unfair: "<p>Are you sure you want to leave your watchlist behind?</p>",
    fair: "<p>Thanks for watching with StreamFlix.</p>",
  },
  "phone-only": {
    unfair: "<p>To end your plan, call our support team on 1-800-555-0100.</p>",
    fair: "<p>Questions? Call our support team on 1-800-555-0100.</p><button>Cancel subscription</button>",
  },
  "pre-checked-keep": {
    unfair: '<label><input type="checkbox" checked> Pause my plan instead</label><button>Continue</button>',
    fair: '<label><input type="checkbox"> Pause my plan instead</label><button>Continue</button>',
  },
  "buried-cancel": {
    unfair: '<a href="#" style="font-size: 11px">Cancel subscription</a>',
    fair: '<a href="#" style="font-size: 16px">Cancel subscription</a>',
  },
  "countdown-timer": {
    unfair: '<p>Offer ends in <span class="countdown">04:59</span></p>',
    fair: '<p id="renewal">Your plan renews on the 1st.</p>',
  },
};

test("each check fires on its unfair screen and nothing fires on its fair one, through page.evaluate()", async () => {
  const page = await browser.newPage();
  for (const check of CHECKS) {
    await page.setContent(`<main>${SCREENS[check].unfair}</main>`);
    assert.deepEqual((await page.evaluate(scanPage)).map((f) => f.check), [check], `${check} unfair`);
    await page.setContent(`<main>${SCREENS[check].fair}</main>`);
    assert.deepEqual(await page.evaluate(scanPage), [], `${check} fair`);
  }
  await page.close();
});

test("evidence is the text the check fired on, whitespace collapsed", async () => {
  const page = await browser.newPage();
  await page.setContent("<p>Wait!   Stay\n for half price</p><script>/* wait, before you go */</script>");
  assert.deepEqual(await page.evaluate(scanPage), [{ check: "retention-offer", evidence: "Wait! Stay for half price" }]);
  await page.close();
});

const sorted = (fs: { check: string }[]) => fs.map((f) => f.check).sort();

test("on the StreamFlix flows, every check fires on its unfair screen and none fires on sign-up or the fair cancel", async () => {
  const signup = signupFlow(site.url, pay.url);
  const unfair = await cancelParity({ flows: { signup, cancel: unfairCancelFlow(site.url) } }, { outDir: tmp(), browser });
  assert.deepEqual(unfair.flows.cancel.screens.map((s) => sorted(s.findings)), [
    ["buried-cancel"],
    ["countdown-timer", "retention-offer"],
    ["guilt-copy", "phone-only", "pre-checked-keep"],
    [],
    [],
  ]);
  const severities = Object.fromEntries(unfair.flows.cancel.screens.flatMap((s) => s.findings.map((f) => [f.check, f.severity])));
  assert.deepEqual(severities, {
    "buried-cancel": "warn",
    "countdown-timer": "warn",
    "retention-offer": "warn",
    "guilt-copy": "warn",
    "phone-only": "fail",
    "pre-checked-keep": "warn",
  });
  for (const s of unfair.flows.signup.screens) assert.deepEqual(s.findings, [], s.url);

  const fair = await cancelParity({ flows: { signup, cancel: fairCancelFlow(site.url) } }, { outDir: tmp(), browser });
  for (const s of fair.flows.cancel.screens) assert.deepEqual(s.findings, [], s.url);
});

test("severity is configurable: a warning can fail, a failure can warn, and a check can be off", async () => {
  const report = await cancelParity(
    {
      flows: { signup: signupFlow(site.url, pay.url), cancel: unfairCancelFlow(site.url) },
      tolerance: { screens: 2, clicks: 2, typedFields: 1 },
      checks: { "phone-only": "warn", "retention-offer": "fail", "countdown-timer": "off" },
    },
    { outDir: tmp(), browser },
  );
  const findings = report.flows.cancel.screens.flatMap((s) => s.findings);
  assert.ok(!findings.some((f) => f.check === "countdown-timer"));
  assert.equal(findings.find((f) => f.check === "phone-only")?.severity, "warn");
  assert.deepEqual(report.comparison?.failures, ['cancel screen 2: retention offer: "Wait! Stay for half price"']);

  const quiet = await cancelParity(
    {
      flows: { signup: signupFlow(site.url, pay.url), cancel: unfairCancelFlow(site.url) },
      tolerance: { screens: 2, clicks: 2 },
      checks: { "phone-only": "warn" },
    },
    { outDir: tmp(), browser },
  );
  assert.equal(quiet.comparison?.pass, true, "warnings alone never fail the comparison");
});

test("the config rejects a check setting it can't use", () => {
  const flows = { signup: async () => {} };
  assert.throws(() => checkConfig({ flows, checks: { "dark-pattern": "fail" } }), ConfigError);
  assert.throws(() => checkConfig({ flows, checks: { "guilt-copy": "error" } }), ConfigError);
  assert.throws(() => checkConfig({ flows, checks: "fail" }), ConfigError);
  assert.doesNotThrow(() => checkConfig({ flows, checks: { "guilt-copy": "fail", "countdown-timer": "off" } }));
});
