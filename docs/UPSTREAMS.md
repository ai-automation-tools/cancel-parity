# Upstreams

Every external library, runtime and platform cancel-parity depends on, what the code assumes
about each, and where to check whether that assumption still holds. The biweekly
**Cancel-Parity Upstream Check** routine (`upstream/auto-*` PRs) works from this file. Keep it
current by hand too: a new dependency is a new row.

cancel-parity has no network calls of its own: it drives the browser a team's own flow functions
drive, against that team's own staging app, and reports nothing anywhere. There is no API to
track, so the upstreams are the browser automation library, the runtime and the build tools.

**Last checked** is filled in by the routine, and only with a date it actually read the source.
`—` means never checked.

## Runtime and browser automation

| Upstream | What the code assumes | Code | Check at | Last checked |
|:---|:---|:---|:---|:---|
| **Playwright** (`@playwright/test`, peer `>=1.40`, dev `^1.64.1`) | `chromium.launch()` and `Browser`/`Page` types imported from `@playwright/test`; per-run init script (`addInitScript`) and an exposed binding that takes a nonce; screenshots taken with a 5s timeout and masked over `input`, `textarea` and `[contenteditable]`; the `toHaveCancelParity()` matcher added with `expect.extend()`. Chromium is the only browser installed in CI | `src/runner.ts`, `src/matchers.ts`, `src/index.ts`, `.github/workflows/ci.yml`, `.github/workflows/pages.yml` | github.com/microsoft/playwright/releases; playwright.dev/docs/release-notes | 2026-11-26 |
| **Node.js** (`engines` `>=20.12`; CI and the Pages build on 22) | `node:util` `parseEnv` (the `.env` reader), `node:test`, `import.meta.url` for the package version, type-stripped `.ts` scripts run directly (`node scripts/demo.ts`); a `.ts` config file needs Node 22.18+. Node 20 reached end of life 2026-04-30 (nodejs/Release `schedule.json`), so `engines` still admits an EOL line; 22 is maintenance LTS to 2027-04-30 | `src/env.ts`, `src/config.ts`, `src/parity.ts`, `scripts/demo.ts`, `package.json`, `.github/workflows/ci.yml` | nodejs.org/en/about/previous-releases; nodejs.org/api/util.html#utilparseenvcontent | 2026-11-26 |

## Build and lint

| Upstream | What the code assumes | Code | Check at | Last checked |
|:---|:---|:---|:---|:---|
| **TypeScript** (`~6.0`) | `tsc -p tsconfig.build.json` emits `dist/`; `tsc --noEmit` is part of `npm run lint`; `.ts` import specifiers (`./matchers.ts`) compile. TypeScript 7.0 is out, but `typescript-eslint` 8.74.0 still peers `typescript >=4.8.4 <6.1.0`, so the `~6.0` pin holds | `package.json`, `tsconfig.json`, `tsconfig.build.json` | github.com/microsoft/TypeScript/releases | 2026-11-26 |
| **ESLint, `@eslint/js`, `typescript-eslint`** (`^9`, `^9`, `^8`) | ESLint 10 and `@eslint/js` 10 are out, and `typescript-eslint` 8.74.0 peers `eslint ^8.57 || ^9 || ^10`. Flat config in `eslint.config.js`; `npm run lint` is `eslint . && tsc --noEmit` | `eslint.config.js`, `package.json` | eslint.org/blog; github.com/typescript-eslint/typescript-eslint/releases | 2026-11-26 |
| **minimatch** (npm `overrides` `^11.0.1`) | Pinned through `overrides` so eslint's and typescript-estree's copies resolve to one patched version (Dependabot alert #1) | `package.json`, `package-lock.json` | github.com/isaacs/minimatch/releases; the repo's Dependabot alerts | 2026-11-26 |

## Platform

| Upstream | What the code assumes | Code | Check at | Last checked |
|:---|:---|:---|:---|:---|
| **GitHub Actions** (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`) | Latest majors are `checkout` v7, `setup-node` v7, `upload-pages-artifact` v5 and `deploy-pages` v5 (`checkout`, `setup-node` and `deploy-pages` run on node24). CI runs `npm ci`, `npx playwright install --with-deps chromium`, lint, test and build on `ubuntu-latest`; the Pages workflow runs `npm run demo`, stamps `__BUILD_SHA__` into `site/index.html` and deploys `site/` | `.github/workflows/ci.yml`, `.github/workflows/pages.yml` | github.com/actions/checkout/releases; github.com/actions/setup-node/releases; github.com/actions/deploy-pages/releases | 2026-11-26 |
| **GitHub Pages** | The demo is served from this repo's Pages site on the custom domain `cancel-parity-demo.ai-automation-tools.dev`, published from the `github-pages` environment by the workflow above | `.github/workflows/pages.yml`, `site/` | docs.github.com/en/pages | 2026-11-26 |
