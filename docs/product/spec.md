# Spec: cancel-parity, a sign-up vs cancel flow check for Playwright

> Copied from the cancel-parity business plan (`Analysis/cancel-parity/build/spec.md` in the private pipeline workspace) on 2026-10-25. This copy is the one the roadmap works from.

**Decision it serves:** the plan's decision memo (private) · **Status:** draft
**The bet being tested:** teams that own a subscription flow will run a parity check on it before anyone makes them.

## What it is, in one paragraph

A team writes (or records with `npx playwright codegen`) two short Playwright functions against its own staging app: one that signs a test user up, one that cancels. cancel-parity runs both with an instrumented page, counts what each took (screens, clicks, typed fields, dialogs, retention screens passed), runs six checks on every screen it passes through, compares the two flows, and writes a JSON and HTML report. It exits non-zero, or fails a Playwright assertion, when the cancel flow is harder than sign-up by more than the configured tolerance or a check fires at a failing severity. The report shows evidence, never a legal verdict.

## Users and jobs

- **Primary:** an engineer on a team with self-serve subscriptions and an existing Playwright suite. Jobs 1 (pre-launch check) and 2 (regression guard) from the market scan (private). `[assum]`: no interviews.
- **Secondary:** the PM or counsel who reads the HTML report. Job 3 (dated evidence file). `[assum]`.

## In scope (MVP)

### Must

- **Instrumented flow run.** As an engineer, I want to run my sign-up and cancel functions through cancel-parity, so that I get counts without hand-writing counters.
  - AC: Given the mock site's fair flow, When `cancel-parity run` executes, Then the JSON lists for each flow: screens (distinct URL or main-content change), clicks, typed fields, dialogs, and per-screen screenshots paths; counts match the fixture's documented values exactly.
- **Parity comparison.** As an engineer, I want the build to fail when cancel is harder than sign-up, so that a retention experiment can't quietly break parity.
  - AC: Given default config (`tolerance: 0` on screens and clicks), When cancel takes more screens or clicks than sign-up, Then the CLI exits 1 and the report names each metric that failed with both values. When it doesn't, Then exit 0.
  - AC: `expect(result).toHaveCancelParity()` works inside `@playwright/test` with the same rule.
- **Per-screen checks.** As an engineer, I want each screen of both flows scanned for the six exit-friction patterns, so that a flow that is short but tricky still shows up.
  - AC: Given the mock unfair flow (retention offer, guilt copy, phone-only notice, pre-checked "keep my plan" box, an 11px cancel link, a countdown), When run, Then each of the six fires on its fixture screen and none fires on the fair flow.
  - AC: phone-only cancellation ("call us to cancel" with no online completion) is a failing finding by default; the others are warnings by default, configurable.
- **Report and demo.** As a visitor, I want to see the check fail a bad flow and pass a fair one without installing anything, so that I know what it does in thirty seconds.
  - AC: GitHub Pages serves the mock StreamFlix site (fair and unfair variants) and the HTML reports CI produced from both on the latest `main` build.
  - AC: Every report carries the claims-boundary text from [ADR-002](../decisions/adr-002-evidence-not-verdicts.md) and a coverage block (flows run, viewport, what wasn't observable).

### Should (after release)

- GitHub Action wrapper that posts a job summary.
- False-positive corpus of 20+ fair flows the default config must pass.
- Dated citation map in the report: which rule's wording each metric relates to (ROSCA, California ARL, NYC DCWP, Virginia, Colorado), each with a source date and a staleness check in CI.

### Could

- Channel parity: detect "email/chat/call us to cancel" and flag when sign-up was online-only.
- A second run at a mobile viewport.
- Export a captured journey in fairux's `scan-journey` format.

## Won't (this version)

- **Scan sites the user doesn't own.** No crawler, no "audit any URL" mode. Logged-in cancel flows need the owner's test account, and pointing it at competitors invites ToS and legal trouble.
- **Say "compliant", "non-compliant", "legal" or "illegal" anywhere.** See ADR-002.
- **A hosted service, dashboard or paid tier.** The org ships free MIT tools.
- **An ML or LLM classifier.** Deterministic checks only in v1, so a failing build can always be explained.
- **Handle real payments.** Sign-up runs against the team's sandbox billing (e.g. Stripe test mode); the tool never enters card numbers of its own.
- **Cypress support.** Playwright only; see ADR-001.

## Non-functional requirements

- Runs on Node 20+ with `@playwright/test` as a peer dependency `[assum: current LTS lines]`.
- No network calls of its own: it only drives the browser the user's functions drive. No telemetry.
- Default run of both mock flows completes in under 60 s on a GitHub-hosted runner `[assum]`.
- Report HTML is a single self-contained file, readable offline, meeting basic accessibility (headings, contrast, alt text on screenshots).
- Secrets: the runner reads test-account credentials only from env vars the user's flow functions read; it never writes them to the report, and screenshots mask every input whose type hides what is typed.
- Tests: every check has a fair and an unfair fixture; CI runs the full mock-site suite on every PR.

## Mike's approval notes

Mike approved the plan by closing its `Plan approval: cancel-parity` issue (#14 in the private pipeline repo) as Completed on 2026-10-21. He left no comments, so the scope above stands as written.

## Open questions

- **What counts as a "screen" in an SPA?** URL change, or a main-landmark content change above a threshold. Decide in Slice 0 with fixtures for both; owner: the roadmap agent, by Slice 0's PR.
- **Should payment entry count toward sign-up's screens?** It inflates sign-up and makes parity easier to pass. Default: count it, and show both totals with and without it. Owner: Slice 1.
- **Package name.** `cancel-parity` on npm is assumed free; check at Slice 0.
