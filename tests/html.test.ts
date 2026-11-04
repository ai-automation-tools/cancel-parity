import { test } from "node:test";
import assert from "node:assert/strict";
import { renderHtml } from "../src/html.ts";
import { CLAIMS_BOUNDARY, type ParityReport } from "../src/parity.ts";

test("the HTML report escapes page text and says what a stopped flow left unseen", () => {
  const report: ParityReport = {
    tool: "cancel-parity",
    version: "0.0.0",
    notice: CLAIMS_BOUNDARY,
    viewport: { width: 1280, height: 720 },
    comparison: null,
    flows: {
      cancel: {
        status: "timeout",
        error: "Flow \"cancel\" did not finish within 10 ms",
        totals: { screens: 1, clicks: 0, typedFields: 0, dialogs: 0 },
        screens: [
          {
            url: "https://app.example.com/<b>",
            clicks: 0,
            typedFields: 0,
            dialogs: 0,
            screenshot: null,
            findings: [{ check: "guilt-copy", severity: "warn", evidence: "We'll miss you <script>alert(1)</script>" }],
          },
        ],
      },
    },
  };
  const html = renderHtml(report, () => null);
  assert.doesNotMatch(html, /<script|<b>/);
  assert.match(html, /&#60;script&#62;alert\(1\)&#60;\/script&#62;/);
  assert.match(html, /No comparison/);
  assert.match(html, /stopped \(timeout: Flow &#34;cancel&#34; did not finish within 10 ms\), so later screens weren&#39;t seen/);
  assert.match(html, /Screens left before a screenshot could be taken: cancel screen 1\./);
  assert.ok(html.includes(CLAIMS_BOUNDARY));
});
