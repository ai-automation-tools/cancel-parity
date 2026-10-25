# Build plan: cancel-parity

> Copied from the cancel-parity business plan (`Analysis/cancel-parity/build/build-plan.md` in the private pipeline workspace) on 2026-10-25. This copy is the one the roadmap works from.

**Spec:** [spec.md](spec.md) · **Architecture:** [adr-001-playwright-typescript-npm.md](../decisions/adr-001-playwright-typescript-npm.md), [adr-002-evidence-not-verdicts.md](../decisions/adr-002-evidence-not-verdicts.md) · **Estimate:** in the private business plan

Each slice is one roadmap feature an unattended agent can build and verify against mock flows the repo owns. No slice needs a real company's site, a real account, or a human to check it.

> **MVP = Slices 0, 1, 2 and 3 plus the release gates.** Slices 0-2 are the three features that deliver the core promise end to end (run both flows, compare them, check every screen); Slice 3 is the demo and report that let a visitor see it work. The repo goes public when these and the go-live checklist are done. Everything from Slice 4 on is built after release, and only if the 90-day test in the memo says keep going.

## Slice 0: walking skeleton, the instrumented runner (MVP)

- **Delivers:** the npm package scaffold, a `cancel-parity run` CLI, and an instrumented page that records screens, clicks, typed fields and dialogs for **one** flow on a two-page mock site, written to JSON. Playwright runs in GitHub Actions.
- **De-risks:** ADR-001's one-way door (TypeScript on Playwright) and the schedule-owning task: what counts as a screen in an SPA, and whether the run is stable in CI.
- **Done when:** fixture tests assert exact counts for a multi-page flow and an SPA flow; CI green three runs in a row.

## Slice 1: parity comparison (MVP)

- **Delivers:** both flows run from one config; the comparison with per-metric tolerance; exit code 1 on failure; `expect(result).toHaveCancelParity()` for `@playwright/test`; sign-up totals with and without payment screens.
- **De-risks:** the core promise. After this slice the tool does the one thing nothing else does.
- **Done when:** a fair fixture pair exits 0 and an unfair pair (cancel has more screens and clicks) exits 1, with both values named in the output.

## Slice 2: per-screen checks (MVP)

- **Delivers:** the six exit-friction checks ported from the parked prototype's `content.js`, run on every screen of both flows, with default severities (phone-only fails; the rest warn).
- **De-risks:** whether the heuristics hold up on a fixture set built to be fair, not just on the pages they were written for.
- **Done when:** each check fires on its unfair fixture screen and none fires on the fair flow; severity config works.

## Slice 3: report and Pages demo (MVP)

- **Delivers:** a self-contained HTML report (metrics side by side, per-screen findings with screenshots, coverage block, the ADR-002 wording); a mock StreamFlix site with fair and unfair variants; a CI job that runs both and publishes the site and both reports to GitHub Pages.
- **De-risks:** demo-ability, and the launch hook. A visitor sees a red report for the unfair flow and a green one for the fair flow without installing anything.
- **Done when:** the Pages URL shows both variants and both reports from the latest `main` build; the grep test for verdict words passes.

## Release gates (MVP)

README with install, a 10-line config example, the claims boundary and the Won't list; SECURITY.md; CONTRIBUTING.md; `npm publish --dry-run` clean; the public release checklist; Mike's approval.

## Slice 4: GitHub Action (post-release)

Wrapper Action with a job summary table. Delivers the lowest-friction way to adopt.

## Slice 5: false-positive corpus (post-release)

20+ fair flows (mock, plus patterns from vendors' published fair flows) the defaults must pass. Feeds the memo's accuracy gate.

## Slice 6: dated citation map (post-release)

Each metric linked to the rule wording it relates to (ROSCA, California ARL, NYC, Virginia, Colorado), with retrieval dates and a CI check that fails when a citation is older than 180 days.

## Slices 7-8: channel parity, mobile viewport, fairux export (post-release, Could)

## Definition of done (every slice)

Acceptance criteria pass, including the ugly cases: a flow function that throws, a timeout mid-flow, a cross-origin payment page, an empty flow. Tests run in CI against the repo's own mock site, no external network. No credential value appears in JSON, HTML or logs (masked-screenshot test). The report never contains a verdict word. README and demo reflect what shipped, not what's planned.

## Cut list (if the estimate runs over)

**Could** → channel parity, mobile viewport, fairux export. **Should** → the GitHub Action (the CLI works in any CI) and the citation map. **Must** is defended: the runner, the comparison, the six checks and the demo are the product. If any of those has to go, the spec reopens.

## What we learn, and when we'd stop

The bet is testable the day Slice 3 ships publicly: the demo is the launch post, and the first outside issue saying "I ran this on our app" is the first real evidence of pull. The memo's falsifier applies: **if, 90 days after the repo goes public, it has fewer than 15 stars and no outside issue, PR or GitHub dependent, stop post-release work and park it.** And if the MVP isn't public within 10 weeks of the first roadmap run, cut to Slices 0-2 plus a minimal demo and ship.

When this plan becomes a repo, `docs/ROADMAP.md` follows the lab's roadmap standard (`repo-docs-builder` → `references/roadmap-standard.md`): Slices 0-3 become Phases 1-4 above the go-live heading, the release gates and Definition of done become the `🚦` checklist, and Slices 4-8 plus the cut list go below it.

---

<p align="center">
  <a href="README.md">← Product</a> ·
  <a href="spec.md">Spec</a>
</p>
