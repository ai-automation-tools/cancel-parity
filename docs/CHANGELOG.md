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

**Added**
- `cancel-parity run [--config <file>] [--out <dir>]` runs each flow in the config on an instrumented Chromium page and writes `report.json` with its screens, clicks, typed fields and dialogs, and a screenshot per screen with hidden-text inputs painted over. A flow that throws, times out or reaches no screen keeps what it recorded and makes the CLI exit 1. Fixture tests pin exact counts for a two-page site, an SPA and a cross-origin hop. *Slice 0: Instrumented runner*

**Docs**
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
