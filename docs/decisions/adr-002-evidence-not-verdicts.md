# ADR-002: The report presents evidence and never a legal verdict

> Copied from the cancel-parity business plan (`Analysis/cancel-parity/build/adr-002-evidence-not-verdicts.md` in the private pipeline workspace) on 2026-10-25. This copy is the one the roadmap works from.

**Status:** proposed · **Reversibility:** one-way once public (users would rely on any verdict it gave)
**Serves:** [spec.md](../product/spec.md)

## Context

The laws this tool is about use qualitative standards. NYC requires cancellation "as simple as enrollment" with no step or click maximum `[fact, A/B: research/nyc-click-to-cancel-rule-2026.md]`; Virginia says "at least as easy" `[fact, B]`; ROSCA requires a "simple mechanism." The 2024 FTC rule was vacated and no successor has been proposed `[fact, B]`. A step count is evidence about parity, not a legal test of it. The 2024 regulator sweep itself said it was "not reported whether these identified practices were used in an unlawful way" `[fact, A]`. A free tool that printed "compliant" would be the thing a company points to after it gets sued, and the org would be the one that said it.

## Options considered

1. **Evidence only** (chosen): metrics, per-screen findings, screenshots, a pass/fail against the *user's own configured thresholds*, and fixed wording that this is not legal advice and that a pass is not a finding of compliance.
2. **A compliance score per jurisdiction.** More marketable, and what SuitProof-style products imply. Rejected: it claims a legal judgment the org can't stand behind, and it goes stale whenever a rule changes.

## Decision

Option 1. Concretely:

- The words "compliant", "non-compliant", "legal", "illegal", "violation" never appear in report output or the CLI, enforced by a test that greps the report templates and messages.
- Every report and the README carry: "cancel-parity measures how your sign-up and cancel flows compare and flags patterns regulators have objected to. It is not legal advice, and a passing result does not mean a flow complies with any law. Ask counsel."
- Pass/fail is "your cancel flow took more screens than your sign-up flow (6 vs 3)", never "this violates X."
- The post-release citation map links each metric to the rule wording it relates to, with a retrieval date, and says "relates to", not "required by."

## Exit cost

Low now. After release, adding verdicts later would be a product change; removing them after users relied on them would be the costly direction, which is why they never go in.

## Cost envelope

$0. One test and fixed copy.

## Consequences

- Less punchy marketing. The launch line is "the test for 'as easy to cancel as to sign up'", not "make your app compliant."
- Matches fairux's boundary ("Not a legal tool"), which keeps the two tools consistent if they interoperate.
- Repo-level: MIT license's warranty disclaimer plus this ADR; the public release checklist should confirm the wording before the repo goes public.
