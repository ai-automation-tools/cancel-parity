# Contributing to cancel-parity

Thanks for helping. This file covers running the tests and adding a check. What the tool
won't do, on purpose, is under "What it is not" in the [README](README.md); please read that
before proposing a feature.

## Set up and run the tests

You need **Node 22.18 or newer** to develop (the tests run `.ts` files directly; the published
package itself supports Node 20.12+). Use npm, not pnpm or yarn.

```bash
npm ci                            # install dependencies
npx playwright install chromium   # once per machine; the tests drive Chromium
npm run lint                      # ESLint, then tsc --noEmit
npm test                          # node --test over tests/*.test.ts
npm run build                     # compile to dist/
```

All three must pass before a PR. CI runs the same steps on every PR.

- Tests use `node:test` and `node:assert/strict`, one file per area in `tests/*.test.ts`.
  Run one file with `node --test tests/checks.test.ts`.
- Every test serves its own mock site from `tests/fixtures/` on `127.0.0.1`
  (`tests/fixtures/serve.ts`). No test may reach the internet, and no fixture may copy a
  real company's site. Mock data stays obviously fictional: StreamFlix, `test@example.com`.
- The `toHaveCancelParity()` matcher is tested through `@playwright/test`:
  `tests/matcher.test.ts` runs the specs under `tests/playwright/`. Name those specs
  `*.spec.ts` so `node --test` doesn't pick them up.
- `npm run demo` builds the demo's two reports into `site/reports/`, and
  `tests/demo.test.ts` pins their outcome.

## Add a check

The checks live in `src/checks.ts`. They are deterministic text and style rules, never a
classifier, so a failing build can always be explained. A new check touches these places.
Once you add the id, `npm run lint` flags the two maps in step 2 and the test table in
step 4 until each has an entry for it.

1. **`CHECKS`**: add the check's id, such as `"fake-check"`.
2. **`DEFAULT_SEVERITY`** and **`CHECK_NAMES`**: its default (`warn` unless the pattern
   blocks cancelling outright) and the words the CLI and report show for it.
3. **`scanPage()`**: the rule itself. It is serialized into the page and run there, so it
   must not reference anything outside its own body: no imports, no module constants, no
   Playwright. Read the DOM, never change it, and call `add(check, text)` with the text the
   check fired on as evidence.
4. **A fair and an unfair screen** in the `SCREENS` table in `tests/checks.test.ts`. The
   unfair screen must fire your check and no other; the fair one must fire nothing. Make the
   fair screen a near miss (the same words in an honest context), since that's what keeps
   false positives out.
5. **The StreamFlix flows.** The test that runs `tests/fixtures/parity/` pins exactly which
   checks fire on each screen of the unfair cancel flow and that none fires on sign-up or the
   fair cancel flow. Put an instance of the pattern on an unfair cancel screen and update
   that expectation; if your rule fires on a fair screen, fix the rule, not the fixture.
6. **`docs/checks.md`**: a row in the table saying what makes it fire and its default.

The report shows evidence, never a legal judgment
([ADR-002](docs/decisions/adr-002-evidence-not-verdicts.md)). A check's name and messages
describe what's on the screen ("retention offer", "cancel control at 11px or smaller"), and
`tests/parity.test.ts` fails if any source file or output uses a verdict word.

## Pull requests

- Commit messages are plain imperative sentences ("Add the countdown check"), with no
  Conventional Commit prefix.
- New behavior needs a test. Update `README.md` and `docs/` where the change makes them
  wrong, and add a line to `docs/CHANGELOG.md` under `## Unreleased`.
- No new runtime dependency without a sentence in the PR saying why a few lines of code
  wouldn't do.
- Never commit `.env`, credentials, real personal data or local paths. Test-account details
  come from environment variables your flow functions read, and they must never reach a
  report, screenshot or log.

Found a security problem? Don't open an issue; see [SECURITY.md](SECURITY.md).
