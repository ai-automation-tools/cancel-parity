# ADR-001: Ship as a TypeScript npm package built on Playwright, with a CLI and a test matcher

> Copied from the cancel-parity business plan (`Analysis/cancel-parity/build/adr-001-playwright-typescript-npm.md` in the private pipeline workspace) on 2026-10-25. This copy is the one the roadmap works from.

**Status:** proposed · **Reversibility:** one-way (language and host runner)
**Serves:** [spec.md](../product/spec.md)

## Context

The tool has to drive a real browser through a team's own logged-in flows, run in their CI, and be built and verified by unattended agents against mock flows the repo owns. Its users already have an E2E suite; the less new tooling they adopt, the better its odds. Playwright's test runner logged 293.9M npm downloads in 30 days `[fact, B: research/npm-downloads-analogs.md]`, and `@axe-core/playwright` shows a compliance check living inside Playwright is a known pattern. cloakscan already runs headless-Chromium fixture tests in GitHub Actions `[fact, B]`.

## Options considered

1. **TypeScript package on Playwright: a CLI plus a `@playwright/test` fixture and `expect` matcher** (chosen). Cost: build only; GitHub Actions and Pages are free for public repos.
2. **Python on Playwright for Python.** Fine library, but most front-end teams' E2E suites are JS/TS; it would mean a second toolchain for them.
3. **Framework-neutral: consume HAR files or recorded journeys** (fairux's approach). No browser dependency, but the team has to capture flows some other way, which is the step nobody does. Steelman: it would also cover Cypress and Selenium users. Rejected for the MVP; the fairux export (a Could) keeps a door open.
4. **Cypress plugin.** Large user base too, but its single-tab, in-browser model makes counting cross-origin navigations (payment pages, SSO) harder.

## Decision

Option 1. The users' flows are most likely already scripted in Playwright, and the team can record new ones with `playwright codegen`, so the tool asks for two functions and nothing else.

## Exit cost

Moving to another language after release means a rewrite and breaking every user's config: about the whole MVP again (~6.5 weeks `[est]`). Adding a second runner (Cypress) later is additive if the metric and check code stays runner-free (pure functions over captured DOM snapshots), which is the seam to keep.

## Cost envelope

$0 at launch and at target scale: public repo, GitHub Actions minutes, GitHub Pages, npm. No servers.

## Consequences

- Peer dependency on `@playwright/test`; the package must tolerate a range of Playwright versions, tested in CI against the oldest and newest supported.
- The six checks run inside `page.evaluate()`, so they are plain DOM code and can be shared with the parked exit-friction extension later.
- First bottleneck: SPA screen detection and Playwright flake in CI, both owned by Slice 0.
