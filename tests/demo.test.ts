import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CLAIMS_BOUNDARY } from "../src/parity.ts";
import { buildDemo } from "../scripts/demo.ts";

const VERDICT_WORDS = /\b(non-compliant|compliant|legal|illegal|violation)\b/i;

test("the demo build: the fair StreamFlix pair holds, the unfair one fails, and both HTML reports stand alone", async () => {
  const out = mkdtempSync(join(tmpdir(), "cancel-parity-demo-"));
  const { fair, unfair } = await buildDemo(out);

  assert.equal(fair.comparison?.pass, true);
  assert.deepEqual(fair.comparison?.signup.paymentScreens, [2]);
  for (const f of Object.values(fair.flows)) assert.deepEqual(f.screens.flatMap((s) => s.findings), []);

  assert.deepEqual(unfair.comparison?.failures, [
    "cancel took 5 screens, sign-up took 3",
    "cancel took 4 clicks, sign-up took 2",
    'cancel screen 3: phone-only cancel: "Prefer to talk it over? Call our retention team on 1-800-555-0100."',
  ]);
  assert.deepEqual(
    unfair.flows.cancel.screens.map((s) => s.findings.map((f) => f.check).sort()),
    [["buried-cancel"], ["countdown-timer", "retention-offer"], ["guilt-copy", "phone-only", "pre-checked-keep"], [], []],
  );

  for (const [name, report] of [["fair", fair], ["unfair", unfair]] as const) {
    const html = readFileSync(join(out, name, "report.html"), "utf8");
    assert.ok(html.includes(CLAIMS_BOUNDARY), `${name}: ADR-002's wording`);
    assert.match(html, name === "fair" ? /Parity holds/ : /Parity fails/);
    for (const heading of ["Metrics side by side", "Coverage", "Flows run", "Viewport", "What wasn't observable"]) {
      assert.ok(html.includes(heading), `${name}: ${heading}`);
    }
    // One self-contained file: every screenshot embedded with alt text, nothing fetched, no scripts.
    const shots = Object.values(report.flows).flatMap((f) => f.screens).filter((s) => s.screenshot !== null).length;
    const imgs = [...html.matchAll(/<img src="([^"]*)" alt="([^"]+)"/g)];
    assert.equal(imgs.length, shots);
    assert.ok(imgs.every(([, src]) => src.startsWith("data:image/png;base64,")));
    assert.doesNotMatch(html, /<script|<link|src="http|url\(/i);
    assert.doesNotMatch(html.replaceAll(CLAIMS_BOUNDARY, ""), VERDICT_WORDS);
  }
});
