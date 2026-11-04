# AGENTS.md

Standing orders for the agent that works this repo, usually the Cancel-Parity Weekly Roadmap
routine.

## What cancel-parity is

An npm package, built on Playwright, that checks whether cancelling a subscription is as easy
as signing up for it. A team writes (or records with `npx playwright codegen`) two functions
against its own staging app: one signs a test user up, one cancels. cancel-parity runs both on
an instrumented page, counts screens, clicks, typed fields and dialogs, runs six checks on
every screen (retention offer, guilt copy, phone-only cancel, pre-checked "keep my plan" box,
a cancel control at 11px or smaller, a countdown timer), compares the flows and writes a JSON
and an HTML report. The CLI exits 1, or `expect(result).toHaveCancelParity()` fails inside
`@playwright/test`, when cancel is harder than sign-up beyond the configured tolerance or a
check fires at a failing severity.

The bet under the project: teams that own a subscription flow will run a parity check before
anyone makes them. The repo goes public at the MVP (Slices 0 to 3); whether post-release
slices get built depends on a 90-day star test that is Mike's call, not yours.

Full spec: `docs/product/spec.md`. Slice order: `docs/product/build-plan.md`. Decisions:
`docs/decisions/`. Work queue: `docs/ROADMAP.md`.

## Stack

- TypeScript 6.0, ESM (`"type": "module"`). **npm**, not pnpm or yarn. TypeScript is pinned
  to `~6.0` because `typescript-eslint` doesn't support 7.x yet.
- The published package supports Node 20.12+ (`engines`), and is built to `dist/`. Developing
  it needs **Node 22.18 or newer**, because tests run `.ts` files directly; CI uses Node 22.
- Sources import each other with `.ts` extensions (`import { run } from "./run.ts"`). Node
  strips types at runtime and `tsc` rewrites the extensions on build
  (`rewriteRelativeImportExtensions`). `erasableSyntaxOnly` is on: no enums, no namespaces,
  no parameter properties.
- Browser: `@playwright/test` is a peer dependency (users bring their own) and a dev
  dependency here. Tests need Chromium: `npx playwright install chromium` once per machine.
- Tests: `node:test` and `node:assert/strict`, files in `tests/*.test.ts`. No Jest, no Vitest.
  Mock sites and flows live under `tests/fixtures/` and are served locally by the test
  itself. The matcher gets its own test that runs through `@playwright/test`.
- Lint: ESLint 9 flat config with `typescript-eslint` recommended, plus `tsc --noEmit`.
- `src/cli.ts` is the bin entry; logic goes in modules that take their inputs as arguments
  (output functions, the page, the clock) so tests can call them without a process.
- The six checks are plain DOM code run through `page.evaluate()`. Keep metric and check code
  free of Playwright types where you can (pure functions over captured page data): ADR-001's
  seam for adding a second runner later.
- The demo lives in `site/`: the page, and the mock StreamFlix site under `site/streamflix/`
  (one sign-up flow, a fair and an unfair cancel flow). `npm run demo` (`scripts/demo.ts`)
  serves it locally, runs both pairs and writes their reports to `site/reports/` (gitignored);
  `tests/demo.test.ts` pins the outcome. GitHub Pages is not enabled yet; the live-demo item adds the
  `actions/deploy-pages` workflow. Until then, don't add a Pages workflow, or CI on `main`
  goes red.

## Verify

Run all three from the repo root. All three must pass before a PR opens.

```
npm run lint
npm test
npm run build
```

## Architecture decisions that are already made

- **ADR-001: TypeScript npm package on Playwright**, a CLI plus a `@playwright/test` matcher.
  Don't introduce a second language or runner.
- **ADR-002: evidence, never a verdict.** The words "compliant", "non-compliant", "legal",
  "illegal" and "violation" never appear in report output or CLI messages, enforced by a test
  from Slice 1 on. Every report and the README carry this text, word for word: "cancel-parity
  measures how your sign-up and cancel flows compare and flags patterns regulators have
  objected to. It is not legal advice, and a passing result does not mean a flow complies with
  any law. Ask counsel." Failures read "your cancel flow took more screens than your sign-up
  flow (6 vs 3)", never "this violates X".

## Won't (this version)

Carried from the spec. If a roadmap item seems to need one of these, stop and flag it.

- **Scan sites the user doesn't own.** No crawler, no "audit any URL" mode.
- **Say "compliant", "non-compliant", "legal" or "illegal" anywhere.** See ADR-002.
- **A hosted service, dashboard or paid tier.** The org ships free MIT tools.
- **An ML or LLM classifier.** Deterministic checks only, so a failing build can always be
  explained.
- **Handle real payments.** Sign-up runs against the team's sandbox billing; the tool never
  enters card numbers of its own.
- **Cypress support.** Playwright only.

## Standards

- **No network calls of its own, no telemetry.** cancel-parity drives only the browser the
  user's functions drive. Tests use local mock sites and never reach the internet.
- **Credentials never leave the environment.** Test-account details are read only from env
  vars the user's flow functions read. They never appear in JSON, HTML, logs or screenshots;
  screenshots mask every input whose type hides what is typed, and a test proves it.
- **Settings live in `.env`, names in `.env.example`.** The CLI loads `.env` from the working
  directory (`src/env.ts`), and a variable already in the real environment wins. Any new
  setting gets a line in `.env.example` saying where its value comes from, never the value.
  Never document Windows user environment variables or `setx`.
- Every check has a fair and an unfair fixture. The build plan's ugly cases are tests: a flow
  function that throws, a timeout mid-flow, a cross-origin payment page, an empty flow.
- No new runtime dependency without a line in the PR body saying why.
- The HTML report is one self-contained file, readable offline, with headings, contrast and
  alt text on screenshots.
- This repo goes public at graduation. Never commit `.env`, tokens, real personal data, or
  local paths like `C:\Users\...` or `D:\...`. Mock data must be obviously fictional
  (StreamFlix, `test@example.com`).
- Commit messages: plain imperative sentences ("Add the parity comparison"), no Conventional
  Commit prefixes.

## What "done" means for a roadmap item

1. The item's own text is true of the code, checked by running it.
2. `npm run lint`, `npm test` and `npm run build` pass, and new behavior has a test.
3. Anything the change made untrue is fixed: `README.md`, `docs/`, this file.
4. `docs/CHANGELOG.md` has a line for it, tagged with the roadmap phase in italics, in the
   same commit that flips the box to `- [x]` with a ` — done YYYY-MM-DD: <what landed>` note.
5. It's on a `roadmap/auto-<date>` branch with a PR into `main`. Never push to `main`.
