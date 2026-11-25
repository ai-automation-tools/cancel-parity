<h1 align="center">📋 cancel-parity Changelog</h1>

<p align="center">
  <em>What changed in cancel-parity, newest first.</em>
</p>

<p align="center">
  <a href="ROADMAP.md"><img src="https://img.shields.io/badge/plan-ROADMAP-8B5CF6?style=for-the-badge" alt="Roadmap"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs-6B7280?style=for-the-badge" alt="Docs home"></a>
</p>

---

Entries that close a roadmap item carry the roadmap phase in italics.

## Unreleased

**Fixed**
- A stalled screenshot no longer hangs a run. Screenshots now give up after 5s and the screen keeps `screenshot: null`. Inside `@playwright/test`, which sets no action timeout, one stalled shot used to hang `cancelParity()` until the test timeout; elsewhere it cost 30s. CI is green on `main` again, and the suite runs in about 40s instead of about 296s. *Public release*

**Changed**
- Roadmap: the honestlint decision is made (2026-11-22, Mike): release without the honestlint gate. honestlint 0.3.0 on npm, its latest release, has no `roach-motel` rule (only a planned line in its README), so the memo's reconsider condition doesn't apply. *Public release*

**Added**
- `docs/UPSTREAMS.md` and `.github/dependabot.yml`: the worklist for the biweekly upstream check (Playwright, Node, the build tools, GitHub Actions and Pages) and weekly grouped Dependabot updates for npm and GitHub Actions, minor and patch only.
- Roadmap: an owner decision in the release phase on business-agent's 2026-11-05 memo (an honestlint check before going public). From the 2026-11-16 org agents usefulness review: business-agent memos on a pipeline project now reach that project's roadmap and the pipeline ledger. *Public release*
- Build stamp: the demo page carries `<meta name="build">`, which the Pages workflow fills with the commit it built from, so the live page shows which merge it is. *Public release*
- `.github/workflows/pages.yml`: on every push to `main` it runs `npm run demo` and publishes `site/` with both StreamFlix reports to GitHub Pages; the build fails unless the fair pair holds and the unfair one fails. *Public release* (part of the live-demo item)
- HTML report. Every run now writes `report.html` beside `report.json`: one self-contained file with screenshots embedded and no scripts, showing the parity result, both flows' metrics side by side (sign-up with and without payment screens), each screen's findings and screenshot, a coverage block (which flows ran and how they ended, the viewport, and what the run couldn't observe), and ADR-002's wording. *Public release* (part of the live-demo item)
- The demo's mock StreamFlix site under `site/streamflix/`, one sign-up flow and a fair and an unfair cancel flow, and `npm run demo`, which serves it locally, runs both pairs and writes their reports to `site/reports/`. The demo page now links to both flows and both reports. *Public release* (part of the live-demo item)
- Six per-screen checks: retention offer, guilt copy, phone-only cancel, a pre-checked "keep my plan" box, a cancel control at 11px or smaller, and a countdown timer, run on every screen of every flow. Phone-only cancel fails by default and the other five warn; `checks` in the config sets each to `fail`, `warn` or `off`. Findings, with the text each fired on, are listed per screen in `report.json` and under each flow in the CLI output; a `fail` finding makes the CLI exit 1 and `toHaveCancelParity()` fail. The checks are plain DOM code (`scanPage()`), exported for `page.evaluate()`. *Slice 2: Per-screen checks*
- Parity comparison. `cancel-parity run` compares the flows named `signup` and `cancel` and exits 1 when cancel takes more screens or clicks than sign-up beyond the config's `tolerance` (default 0), naming each metric with both values ("cancel took 5 screens, sign-up took 3"), or when either flow didn't finish. Sign-up totals are reported with and without payment screens (another origin by default, or `paymentUrls`). `cancelParity()` and `expect(report).toHaveCancelParity()` apply the same rule in `@playwright/test`. `report.json` carries ADR-002's wording, and a test fails if any output or source message uses a verdict word. *Slice 1: Parity comparison*
- `cancel-parity run [--config <file>] [--out <dir>]` runs each flow in the config on an instrumented Chromium page and writes `report.json` with its screens, clicks, typed fields and dialogs, and a screenshot per screen with hidden-text inputs painted over. A flow that throws, times out or reaches no screen keeps what it recorded and makes the CLI exit 1. Fixture tests pin exact counts for a two-page site, an SPA and a cross-origin hop. *Slice 0: Instrumented runner*

**Docs**
- Roadmap: **Harden the runner** is now a release gate (Mike, 2026-11-16) and sits above `## After public release`, so it ships before go-live. *Public release*
- README: a Live Demo badge in the hero pointing at `https://ai-automation-tools.dev/cancel-parity/`, and the "isn't online yet" warning replaced by a note that the demo is up and the package isn't on npm yet. *Public release*
- Roadmap rechecked against the org's 2026-11 requirements: the intro names the roadmap routine instead of its days; new release items for the README's Live Demo badge, the build stamp and an owner question on whether runner hardening is a gate; a runner-hardening item and a `minimatch` override at the top of the next slices.
- The live demo is up at `https://ai-automation-tools.dev/cancel-parity/`, serving the page and both StreamFlix reports, since PR #7 merged on 2026-11-10. *Public release*

**Security**
- Runner hardening. Screenshots now paint over every text input, text area and editable region, not only hidden-text inputs, so a card number typed on a sign-up payment screen never reaches a screenshot or `report.html`; checkboxes and input buttons stay visible as evidence. The in-page listener reports through `__cancelParity` with a per-run nonce, so a page's own scripts can't add clicks, screens or findings. Check evidence and error lines are stripped of control characters and bidi overrides before they reach the terminal or a report. A fixture test for each in `tests/runner.test.ts`. *Public release*
- `package.json` overrides the dev-only `minimatch` to `^11.0.1` (resolves to 11.0.8 everywhere), clearing GHSA-g3hv-75wg-m249 and Dependabot alert #1; `npm audit` is clean. The published package has no runtime dependencies, so users were never exposed. *Next slices*
- `CONTRIBUTING.md`: how to set up and run the tests, how the fixtures and the matcher's Playwright spec are laid out, and how to add a check with a fair and an unfair screen. *Publish and promote*
- README usage checked against the packed build: an `npm pack` install line, a shorter config example with a table of the optional keys, every command and flag with exit codes 0, 1 and 2, and the spec's Won't list spelled out. A test now fails if the README loses ADR-002's wording. *Public release*
- `docs/checks.md`: what makes each check fire, the default severities and how to change them.
- `docs/parity.md`: the comparison rule, tolerances, payment screens, and the matcher.
- `docs/screens.md`: what counts as a screen (an address change or a main-landmark change of half its words, after a user action) and what the runner keeps out of the report.

## 2026-10-25

**Added**
- Project scaffold: a TypeScript CLI that answers `--help` and `--version` and nothing else yet, with `npm run build`, `npm test` and `npm run lint` passing. It reads a `.env` from the working directory if there is one; variables already set in the environment win.
- CI on push to `main` and on every PR: lint, test and build, with Chromium installed for the Playwright slices. *Public release*
- `SECURITY.md`: how to report a vulnerability, and what counts as one here. *Public release*
- Demo shell in `site/`: the org source bar, a "coming soon" page, and the app icon as favicon. *Public release*
- Full-history secret scan with gitleaks, clean. *Public release*
- MIT license.

**Docs**
- Root README, docs hub, roadmap with release gates, and this changelog.
- The product spec, build plan and both ADRs, copied from the business plan into `docs/product/` and `docs/decisions/`.
- `AGENTS.md` for the roadmap agent, with `CLAUDE.md` importing it.

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="ROADMAP.md">← Roadmap</a>
</p>
