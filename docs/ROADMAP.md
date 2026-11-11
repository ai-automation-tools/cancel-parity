<h1 align="center">🗺️ Roadmap</h1>

<p align="center">
  <em>From an empty CLI to a public cancel-parity that fails a bad cancel flow on a live demo, in the order it has to happen.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/now-public_release-F59E0B?style=for-the-badge" alt="Now: Public release">
  <img src="https://img.shields.io/badge/stage-incubating-2ea44f?style=for-the-badge" alt="Stage: incubating">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs_home-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

The Cancel-Parity roadmap routine works this file top to bottom, one item per run, as
`roadmap/auto-` PRs: it takes the first open item that isn't `🔒 Needs owner` (or up to six
`small` ones), builds it and ticks it. **Every item above
`## After public release` is a release gate.** cancel-parity goes public when all of them are
ticked and Mike says so. Ticking an item adds its line to the [changelog](CHANGELOG.md) and
updates any doc it made stale, in the same commit.

Markers: `- [ ]` open, `- [-]` claimed by a run in progress, `- [x]` done, `- [!]` blocked
(the reason follows on the line). `small` marks docs or config a run can batch, up to six
per PR (untagged means a feature, one per run); `🔒 Needs owner` marks one only the owner can do.

The slices come from [product/build-plan.md](product/build-plan.md), which marks Slices 0 to 3
as the MVP. Slices 0 to 2 are the three features above the line; Slice 3 (the HTML report and
the Pages demo) is the live-demo item in the release phase. Every slice is tested against mock
flows this repo owns. No item needs a real company's site or a real account.

## 🧱 Slice 0: Instrumented runner

- [x] **Slice 0: walking skeleton.** `cancel-parity run` loads a config naming one flow function, runs it on an instrumented Playwright page, and writes JSON with that flow's screens (a distinct URL, or a main-landmark content change above a threshold in an SPA), clicks, typed fields, dialogs and per-screen screenshot paths. The repo carries a two-page mock site and an SPA mock under `tests/fixtures/`, served locally during tests. Fixture tests assert the exact documented counts for both, plus the ugly cases: a flow function that throws, a timeout mid-flow, an empty flow. Screenshots mask every input whose type hides what is typed, and a test proves a typed secret never appears in the JSON. Decide and document in `docs/` what counts as a screen. CI runs the fixture suite, and it is green on three consecutive runs. — done 2026-10-26: `cancel-parity run` and the instrumented runner (`src/runner.ts`, `src/recorder.ts`), two-page, SPA and cross-origin fixtures with exact counts plus the throw, timeout and empty cases, a pixel test for masked screenshots and a secret-leak test (`tests/runner.test.ts`), the screen rule in `docs/screens.md`; CI green three runs in a row on the PR

## ⚖️ Slice 1: Parity comparison

- [x] **Slice 1: parity comparison.** One config names a sign-up flow and a cancel flow; both run and are compared per metric with a configurable tolerance (default `0` on screens and clicks). The CLI exits 1 and names each failing metric with both values ("cancel took 6 screens, sign-up took 3"), and exits 0 otherwise. `expect(result).toHaveCancelParity()` applies the same rule inside `@playwright/test`. Sign-up totals are reported with and without payment screens. A fair fixture pair exits 0 and an unfair pair exits 1. No output uses the words compliant, non-compliant, legal, illegal or violation, enforced by a test ([ADR-002](decisions/adr-002-evidence-not-verdicts.md)). — done 2026-10-28: the comparison in `src/compare.ts` (default tolerance 0 on screens and clicks, payment screens by origin or `paymentUrls`), `cancelParity()` in `src/parity.ts`, the CLI exit and messages in `src/run.ts`, `toHaveCancelParity()` in `src/matchers.ts` with a spec run through `@playwright/test`; fair and unfair StreamFlix fixture pairs under `tests/fixtures/parity/`, a throwing-flow case and the verdict-word test in `tests/parity.test.ts`; the rule in `docs/parity.md`

## 🔍 Slice 2: Per-screen checks

- [x] **Slice 2: the six checks.** Port the six exit-friction heuristics (retention offer, guilt copy, phone-only cancel, a pre-checked "keep my plan" box, a cancel control at 11px or smaller, a countdown timer) as plain DOM code run through `page.evaluate()` on every screen of both flows. Phone-only cancellation fails by default; the other five warn, and each severity is configurable. An unfair fixture screen makes each check fire, and none fires anywhere on the fair flow. The check code stays runner-free (pure functions over the page), the seam [ADR-001](decisions/adr-001-playwright-typescript-npm.md) keeps for a second runner later. — done 2026-10-30: `scanPage()` in `src/checks.ts` (plain DOM code the runner runs in the page with every content report, also callable as `page.evaluate(scanPage)`), findings per screen in `report.json` and the CLI output, `checks` severities in the config (phone-only fails, the rest warn), fail findings in the comparison and the matcher; a fair and an unfair screen per check plus the StreamFlix pair (each check fires on its unfair cancel screen, none on sign-up or the fair cancel) in `tests/checks.test.ts`; the rules in `docs/checks.md`

## 🚦 Public release

- [x] `small` **CI.** `.github/workflows/ci.yml` runs `npm ci`, installs Chromium, then `npm run lint`, `npm test` and `npm run build` on push to `main` and on every PR, with `permissions: contents: read`. — done 2026-10-25: shipped with the scaffold
- [x] `small` **Security.** `SECURITY.md` says how to report a vulnerability and what counts as one. — done 2026-10-25: shipped with the scaffold
- [x] `small` **Demo shell.** `site/index.html` with the org source bar across the top and a "coming soon" body, and `site/favicon.svg`, the app icon in the shared dark-tile format. — done 2026-10-25: shipped with the scaffold
- [x] `small` **Secret scan.** `gitleaks git . --log-opts=--all` comes back clean on the full history. — done 2026-10-25: clean on the scaffold commit
- [x] `small` **README usage matches the code.** Install line, a config example of about ten lines, every command and flag run against the real build and behaving as written. The README carries ADR-002's claims-boundary text word for word and states the spec's Won't list plainly, so nobody files an issue asking it to scan competitors' sites or say "compliant". — done 2026-11-02: `README.md` now has an `npm pack` install line, a 14-line config, a table of the optional keys, every command and flag with the 0/1/2 exit codes, and the spec's six Won'ts as a list; each command was run from an `npm pack` tarball installed in a scratch project against the StreamFlix fixtures, and `tests/parity.test.ts` checks the README carries ADR-002's wording
- [x] **Live demo at `https://ai-automation-tools.dev/cancel-parity/`** (Slice 3). A self-contained HTML report (both flows' metrics side by side, per-screen findings with screenshots, a coverage block saying which flows ran, the viewport and what wasn't observable, and ADR-002's wording). A mock StreamFlix site in a fair and an unfair variant under `site/`. An `actions/deploy-pages` workflow that runs both flows on `main` and publishes the site and both reports, so a visitor sees a red report for the unfair flow and a green one for the fair flow without installing anything. The page keeps the source bar and app-icon favicon from the shell, holds no real personal data, and makes no network call needing a secret. The README hero's Live Demo badge points at it. — progress 2026-11-04: the self-contained HTML report (`src/html.ts`, written by every run as `report.html`), the mock StreamFlix site with a fair and an unfair cancel flow under `site/streamflix/`, and `npm run demo` (`scripts/demo.ts`), which runs both pairs and writes both reports to `site/reports/`, landed on `roadmap/auto-2026-11-04`. Still open: the `actions/deploy-pages` workflow (run `npm run demo`, publish `site/`) and the Pages enable call, which ship alone in their own PR, then the README's Live Demo badge; tick after that merges and the URL answers. — progress 2026-11-06: `.github/workflows/pages.yml` (on push to `main`: `npm ci`, Chromium, `npm run demo`, upload `site/`, `actions/deploy-pages`) is on `roadmap/auto-2026-11-06`, alone in its PR, and Pages is enabled with `build_type=workflow`. Tick after that PR merges and `https://ai-automation-tools.dev/cancel-parity/` serves both reports; the same run adds the README's Live Demo badge and drops the "isn't online yet" warning — done 2026-11-10: PR #7 merged (`77ee1a2`); `/cancel-parity/`, `/reports/fair/report.html` and `/reports/unfair/report.html` answer 200. The README badge is the next item
- [ ] `small` **README Live Demo badge.** The README hero gets a Live Demo badge pointing at `https://ai-automation-tools.dev/cancel-parity/`, and the "isn't online yet" warning goes
- [ ] `small` **Build stamp.** `<meta name="build" content="__BUILD_SHA__">` in `site/index.html`, and `pages.yml` replaces it with `${{ github.sha }}` before the upload; the live page shows the merge commit (the sweep holds a PR that touches `pages.yml` for Mike)
- [ ] Decide whether **Harden the runner** (below) is a release gate, since a report screenshot can capture a card number typed on a user's own sign-up payment screen; if yes, move it above this line 🔒 Needs owner

## After public release

Nothing below blocks go-live.

### 🧩 Next slices

- [ ] **Harden the runner.** `__cancelParity` takes a per-run nonce passed through `addInitScript`; screenshots mask every `input`, `textarea` and `[contenteditable]`; page text is stripped of control characters before it reaches the terminal or a report; a fixture test for each
- [ ] `small` **minimatch override.** `"overrides": { "minimatch": "^11.0.1" }` in `package.json`, `npm install`, lint and tests pass, Dependabot alert #1 closes
- [ ] **Slice 4: GitHub Action.** A wrapper Action that runs cancel-parity and posts a job summary table of both flows' metrics and findings. Tested in this repo's own CI against the mock site.
- [ ] **Slice 5: false-positive corpus.** 20 or more fair flows (mock, plus patterns from vendors' published fair flows) that the default config must pass. If more than 2 of the first 10 fail, ship the defaults as warnings until fixed (the plan's accuracy gate).
- [ ] **Slice 6: dated citation map.** The report links each metric to the rule wording it relates to (ROSCA, California ARL, NYC DCWP, Virginia, Colorado), each with a retrieval date and "relates to", never "required by". A CI check fails when a citation is older than 180 days.
- [ ] **Channel parity (Slices 7-8, Could).** Detect "email, chat or call us to cancel" and flag it when sign-up was online only.
- [ ] **Mobile viewport (Slices 7-8, Could).** A second run of both flows at a phone viewport, reported beside the desktop run.
- [ ] **fairux export (Slices 7-8, Could).** Export a captured journey in fairux's `scan-journey` format.

### 📣 Publish and promote

- [x] `small` `CONTRIBUTING.md` saying how to run the tests and add a check with its fair and unfair fixtures. — done 2026-11-09: `CONTRIBUTING.md` at the root covers setup and the three gates, the test layout (local fixtures, the matcher's `*.spec.ts` run), the six places a new check touches with its fair and unfair screens and the StreamFlix expectation, and PR rules; linked from the README's contributor quick start and docs table
- [ ] `npm publish --dry-run` is clean, then tag v0.1 and publish to npm as `cancel-parity` (free as of 2026-10-25). 🔒 Needs owner
- [ ] Launch post built on the demo ("the test for 'as easy to cancel as to sign up'"), sent where front-end and growth engineers read. 🔒 Needs owner
- [ ] Custom subdomain `cancel-parity-demo.ai-automation-tools.dev`. 🔒 Needs owner
- [ ] 90 days after the repo goes public, run the stop test: fewer than 15 stars and no outside issue, PR or GitHub dependent means stop post-release work and park it; 3 or more outside users means build the slices above. 🔒 Needs owner

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="CHANGELOG.md">Changelog →</a>
</p>
