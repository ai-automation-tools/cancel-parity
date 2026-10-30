<h1 align="center">🧩 Source</h1>

<p align="center">
  <em>The CLI, the instrumented runner, the six per-screen checks, the parity comparison and its Playwright matcher.</em>
</p>

<p align="center">
  <a href="../README.md"><img src="https://img.shields.io/badge/↩-repository_root-6B7280?style=for-the-badge" alt="Repository root"></a>
</p>

---

| File | What it does |
|:---|:---|
| [**cli.ts**](cli.ts) | The `cancel-parity` bin entry. Loads `.env`, then hands the arguments to `run`. |
| [**run.ts**](run.ts) | Parses the command line, runs `cancel-parity run`, prints each flow's totals and the parity result, and returns an exit code. Takes its output functions and working folder as arguments so tests can call it without a process. |
| [**parity.ts**](parity.ts) | `cancelParity()`: runs the flows, compares `signup` with `cancel`, writes `report.json`. Holds ADR-002's wording. |
| [**compare.ts**](compare.ts) | The parity rule, tolerances and payment screens, and every message it prints. No Playwright in it ([ADR-001](../docs/decisions/adr-001-playwright-typescript-npm.md)). |
| [**checks.ts**](checks.ts) | The six per-screen checks: `scanPage()`, plain DOM code the runner runs inside the page (or `page.evaluate(scanPage)` from any runner), their default severities and the messages for findings. No Playwright in it ([ADR-001](../docs/decisions/adr-001-playwright-typescript-npm.md)). |
| [**matchers.ts**](matchers.ts) | `toHaveCancelParity()`, for `expect.extend()` in `@playwright/test`. |
| [**config.ts**](config.ts) | The config type, and loading and checking a config file. |
| [**runner.ts**](runner.ts) | Runs each flow on an instrumented Playwright page: the in-page listener (which also runs the checks), masked screenshots, the timeout. |
| [**recorder.ts**](recorder.ts) | Turns page events into screens and counts. No Playwright in it, so another runner could feed it ([ADR-001](../docs/decisions/adr-001-playwright-typescript-npm.md)). |
| [**index.ts**](index.ts) | The package's exports: `cancelParity`, `cancelParityMatchers`, `compareFlows`, `runFlows`, `scanPage`, `CHECKS`, `DEFAULT_SEVERITY`, `CLAIMS_BOUNDARY` and their types. |
| [**env.ts**](env.ts) | Reads `.env` from a folder into the environment without overwriting anything already set. |

---

<p align="center">
  <a href="../README.md">← Repository home</a>
</p>
