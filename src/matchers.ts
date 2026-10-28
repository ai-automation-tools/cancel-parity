// `expect(report).toHaveCancelParity()` for @playwright/test. No Playwright
// types here: Playwright handles `.not` itself from `pass` and `message`.

import { describeMetric, type Comparison } from "./compare.ts";
import type { ParityReport } from "./parity.ts";

export function toHaveCancelParity(received: ParityReport) {
  const comparison: Comparison | null | undefined = received?.comparison;
  if (!comparison) {
    return {
      pass: false,
      name: "toHaveCancelParity",
      message: () => "The report has no comparison. Name one flow `signup` and one `cancel` in the config.",
    };
  }
  const compared = comparison.metrics.filter((m) => m.tolerance !== null);
  return {
    pass: comparison.pass,
    name: "toHaveCancelParity",
    expected: "cancel no harder than sign-up",
    actual: comparison.failures,
    message: () =>
      comparison.pass
        ? `Expected cancel to be harder than sign-up, but it was within tolerance:\n${compared.map((m) => `  ${describeMetric(m)}`).join("\n")}`
        : `Expected cancel to be no harder than sign-up, but:\n${comparison.failures.map((f) => `  ${f}`).join("\n")}`,
  };
}

/** Pass to `expect.extend()`: `const expect = baseExpect.extend(cancelParityMatchers)`. */
export const cancelParityMatchers = { toHaveCancelParity };
