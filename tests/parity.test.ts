import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "@playwright/test";
import { compareFlows } from "../src/compare.ts";
import { checkConfig, ConfigError } from "../src/config.ts";
import { toHaveCancelParity } from "../src/matchers.ts";
import { cancelParity, CLAIMS_BOUNDARY } from "../src/parity.ts";
import type { Screen } from "../src/recorder.ts";
import { run } from "../src/run.ts";
import type { FlowResult } from "../src/runner.ts";
import { fairCancelFlow, signupFlow, unfairCancelFlow } from "./fixtures/flows.ts";
import { serve } from "./fixtures/serve.ts";

// ADR-002: none of these may appear in what cancel-parity prints or writes.
const VERDICT_WORDS = /\b(non-compliant|compliant|legal|illegal|violation)\b/i;

let browser: Browser;
let site: Awaited<ReturnType<typeof serve>>;
let pay: Awaited<ReturnType<typeof serve>>; // a second origin, like a hosted payment page

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

const tmp = () => mkdtempSync(join(tmpdir(), "cancel-parity-parity-"));

// A finished flow made of screens given as [url, clicks, typedFields, dialogs].
function flow(...rows: [string, number, number, number][]): FlowResult {
  const screens: Screen[] = rows.map(([url, clicks, typedFields, dialogs]) => ({ url, clicks, typedFields, dialogs, screenshot: null, findings: [] }));
  const sum = (k: "clicks" | "typedFields" | "dialogs") => screens.reduce((n, s) => n + s[k], 0);
  return {
    status: "ok",
    totals: { screens: screens.length, clicks: sum("clicks"), typedFields: sum("typedFields"), dialogs: sum("dialogs") },
    screens,
  };
}

const A = "https://app.example.com/";
const PAY = "https://pay.example.net/checkout";

test("default tolerance compares screens and clicks at 0 and only reports typed fields and dialogs", () => {
  const signup = flow([A, 1, 2, 0], [A + "done", 0, 0, 0]);
  const cancel = flow([A, 1, 0, 1], [A + "sure", 1, 0, 0], [A + "done", 0, 0, 0]);
  const c = compareFlows(signup, cancel);
  assert.equal(c.pass, false);
  assert.deepEqual(c.failures, ["cancel took 3 screens, sign-up took 2", "cancel took 2 clicks, sign-up took 1"]);
  assert.deepEqual(
    c.metrics.map((m) => [m.metric, m.signup, m.cancel, m.tolerance, m.pass]),
    [
      ["screens", 2, 3, 0, false],
      ["clicks", 1, 2, 0, false],
      ["typedFields", 2, 0, null, true],
      ["dialogs", 0, 1, null, true],
    ],
  );
});

test("a configured tolerance allows that many more, and adding a metric compares it", () => {
  const signup = flow([A, 1, 0, 0], [A + "done", 0, 0, 0]);
  const cancel = flow([A, 1, 0, 1], [A + "sure", 1, 0, 0], [A + "done", 0, 0, 0]);
  assert.equal(compareFlows(signup, cancel, { tolerance: { screens: 1, clicks: 1 } }).pass, true);
  const c = compareFlows(signup, cancel, { tolerance: { screens: 1, clicks: 1, dialogs: 0 } });
  assert.deepEqual(c.failures, ["cancel took 1 dialog, sign-up took 0"]);
  const tight = compareFlows(signup, flow([A, 1, 0, 0], [A + "a", 1, 0, 0], [A + "b", 1, 0, 0], [A + "c", 0, 0, 0]), { tolerance: { screens: 1 } });
  assert.deepEqual(tight.failures, ["cancel took 4 screens, sign-up took 2 (tolerance 1)", "cancel took 3 clicks, sign-up took 1"]);
});

test("sign-up is compared with payment screens counted and reported without them", () => {
  const signup = flow([A, 1, 1, 0], [PAY, 1, 3, 0], [A + "welcome", 0, 0, 0]);
  const c = compareFlows(signup, flow([A, 1, 0, 0], [A + "sure", 1, 0, 0], [A + "done", 0, 0, 0]));
  assert.equal(c.pass, true);
  assert.deepEqual(c.signup.paymentScreens, [2]);
  assert.deepEqual(c.signup.totals, { screens: 3, clicks: 2, typedFields: 4, dialogs: 0 });
  assert.deepEqual(c.signup.withoutPayment, { screens: 2, clicks: 1, typedFields: 1, dialogs: 0 });

  const named = compareFlows(flow([A, 1, 0, 0], [A + "billing", 1, 2, 0]), flow([A, 0, 0, 0]), { paymentUrls: [/\/billing$/] });
  assert.deepEqual(named.signup.paymentScreens, [2]);
  const none = compareFlows(signup, flow([A, 0, 0, 0]), { paymentUrls: ["/nothing-matches"] });
  assert.deepEqual(none.signup.paymentScreens, []);
});

test("a flow that didn't finish never passes, and says why", () => {
  const ok = flow([A, 1, 0, 0]);
  const threw: FlowResult = { ...flow([A, 0, 0, 0]), status: "error", error: "boom" };
  const empty: FlowResult = { status: "empty", totals: { screens: 0, clicks: 0, typedFields: 0, dialogs: 0 }, screens: [] };
  assert.deepEqual(compareFlows(ok, threw).failures, ["the cancel flow stopped before it finished (error: boom)"]);
  assert.deepEqual(compareFlows(empty, ok).failures, [
    "the sign-up flow reached no screen",
    "cancel took 1 screen, sign-up took 0",
    "cancel took 1 click, sign-up took 0",
  ]);
});

test("the config rejects a tolerance or payment list it can't use", () => {
  const flows = { signup: async () => {} };
  assert.throws(() => checkConfig({ flows, tolerance: { steps: 1 } }), ConfigError);
  assert.throws(() => checkConfig({ flows, tolerance: { screens: -1 } }), ConfigError);
  assert.throws(() => checkConfig({ flows, tolerance: 2 }), ConfigError);
  assert.throws(() => checkConfig({ flows, paymentUrls: "/pay" }), ConfigError);
  assert.doesNotThrow(() => checkConfig({ flows, tolerance: { clicks: 1, dialogs: 0 }, paymentUrls: ["/pay", /checkout/] }));
});

test("fixture pairs: the fair cancel flow passes and the unfair one fails with both values named", async () => {
  const signup = signupFlow(site.url, pay.url);
  const fair = await cancelParity({ flows: { signup, cancel: fairCancelFlow(site.url) } }, { outDir: tmp(), browser });
  assert.deepEqual(fair.flows.signup.totals, { screens: 3, clicks: 2, typedFields: 2, dialogs: 0 });
  assert.deepEqual(fair.flows.cancel.totals, { screens: 3, clicks: 2, typedFields: 0, dialogs: 0 });
  assert.deepEqual(fair.comparison?.signup.withoutPayment, { screens: 2, clicks: 1, typedFields: 1, dialogs: 0 });
  assert.deepEqual(fair.comparison?.signup.paymentScreens, [2]);
  assert.equal(fair.comparison?.pass, true);
  assert.equal(toHaveCancelParity(fair).pass, true);

  const unfair = await cancelParity({ flows: { signup, cancel: unfairCancelFlow(site.url) } }, { outDir: tmp(), browser });
  assert.deepEqual(unfair.flows.cancel.totals, { screens: 5, clicks: 4, typedFields: 1, dialogs: 0 });
  assert.deepEqual(unfair.comparison?.failures, [
    "cancel took 5 screens, sign-up took 3",
    "cancel took 4 clicks, sign-up took 2",
    'cancel screen 3: phone-only cancel: "Prefer to talk it over? Call our retention team on 1-800-555-0100."',
  ]);
  const m = toHaveCancelParity(unfair);
  assert.equal(m.pass, false);
  assert.match(m.message(), /cancel took 5 screens, sign-up took 3/);
});

test("the matcher explains a report with no sign-up and cancel pair", async () => {
  const r = await cancelParity({ flows: { cancel: fairCancelFlow(site.url) } }, { outDir: tmp(), browser });
  assert.equal(r.comparison, null);
  const m = toHaveCancelParity(r);
  assert.equal(m.pass, false);
  assert.match(m.message(), /Name one flow `signup` and one `cancel`/);
});

async function cli(cancel: "fairCancelFlow" | "unfairCancelFlow" | "throws") {
  const dir = tmp();
  const flows = pathToFileURL(join(import.meta.dirname, "fixtures", "flows.ts")).href;
  const cancelFn = cancel === "throws" ? `async (page) => { await page.goto("${site.url}parity/account.html"); throw new Error("cancel button not found"); }` : `${cancel}(SITE)`;
  writeFileSync(
    join(dir, "cancel-parity.config.ts"),
    `import { signupFlow, fairCancelFlow, unfairCancelFlow } from ${JSON.stringify(flows)};
const SITE = ${JSON.stringify(site.url)};
export default {
  flows: {
    signup: signupFlow(SITE, ${JSON.stringify(pay.url)}),
    cancel: ${cancelFn},
  },
};
`,
  );
  let out = "";
  let err = "";
  const code = await run(["run", "--out", "report"], { out: (s) => (out += s), err: (s) => (err += s), cwd: dir });
  const json = readFileSync(join(dir, "report", "report.json"), "utf8");
  const html = readFileSync(join(dir, "report", "report.html"), "utf8");
  return { code, out, err, json, html };
}

test("cancel-parity run exits 0 on the fair pair and 1 on the unfair pair, naming each failing metric", async () => {
  const fair = await cli("fairCancelFlow");
  assert.equal(fair.code, 0, fair.err);
  assert.match(fair.out, /signup: 3 screens, 2 clicks, 2 typed fields, 0 dialogs \(without payment: 2 screens, 1 click, 1 typed field, 0 dialogs\)/);
  assert.match(fair.out, /Parity holds/);

  const unfair = await cli("unfairCancelFlow");
  assert.equal(unfair.code, 1);
  assert.match(unfair.out, /cancel: 5 screens, 4 clicks, 1 typed field, 0 dialogs/);
  assert.equal(
    unfair.err,
    "Parity fails:\n  cancel took 5 screens, sign-up took 3\n  cancel took 4 clicks, sign-up took 2\n" +
      '  cancel screen 3: phone-only cancel: "Prefer to talk it over? Call our retention team on 1-800-555-0100."\n',
  );
  assert.match(unfair.out, / {2}warn: screen 1: cancel control at 11px or smaller: "Cancel plan"\n/);
  assert.match(unfair.out, / {2}fail: screen 3: phone-only cancel: /);
  assert.doesNotMatch(fair.out, /warn:|fail:/);
  assert.equal(JSON.parse(unfair.json).comparison.pass, false);
});

test("a cancel flow that throws fails the comparison and exits 1", async () => {
  const r = await cli("throws");
  assert.equal(r.code, 1);
  assert.match(r.err, /cancel: error \(cancel button not found\)/);
  assert.match(r.err, /the cancel flow stopped before it finished \(error: cancel button not found\)/);
});

test("reports carry ADR-002's wording, and no output or source message gives a verdict", async () => {
  const runs = [await cli("fairCancelFlow"), await cli("unfairCancelFlow"), await cli("throws")];
  for (const r of runs) {
    assert.equal(JSON.parse(r.json).notice, CLAIMS_BOUNDARY);
    assert.ok(r.html.includes(CLAIMS_BOUNDARY));
    const text = [r.out, r.err, r.json, r.html].join("\n").replaceAll(CLAIMS_BOUNDARY, "");
    assert.doesNotMatch(text, VERDICT_WORDS);
  }
  let help = "";
  await run(["--help"], { out: (s) => (help += s), err: (s) => (help += s) });
  assert.doesNotMatch(help, VERDICT_WORDS);
  // Every message the source can print, including ones no fixture reaches.
  const srcDir = join(import.meta.dirname, "..", "src");
  for (const file of readdirSync(srcDir).filter((f) => f.endsWith(".ts"))) {
    const src = readFileSync(join(srcDir, file), "utf8").replaceAll(CLAIMS_BOUNDARY, "");
    assert.doesNotMatch(src, VERDICT_WORDS, file);
  }
});

test("the README carries ADR-002's wording word for word", () => {
  const readme = readFileSync(join(import.meta.dirname, "..", "README.md"), "utf8").replace(/\s+/g, " ");
  assert.ok(readme.includes(CLAIMS_BOUNDARY));
});
