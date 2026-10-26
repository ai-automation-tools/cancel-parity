<h1 align="center">🧩 Source</h1>

<p align="center">
  <em>The CLI and the instrumented runner; the comparison and the checks land with later slices.</em>
</p>

<p align="center">
  <a href="../README.md"><img src="https://img.shields.io/badge/↩-repository_root-6B7280?style=for-the-badge" alt="Repository root"></a>
</p>

---

| File | What it does |
|:---|:---|
| [**cli.ts**](cli.ts) | The `cancel-parity` bin entry. Loads `.env`, then hands the arguments to `run`. |
| [**run.ts**](run.ts) | Parses the command line, runs `cancel-parity run` and writes `report.json`, and returns an exit code. Takes its output functions and working folder as arguments so tests can call it without a process. |
| [**config.ts**](config.ts) | The config type, and loading and checking a config file. |
| [**runner.ts**](runner.ts) | Runs each flow on an instrumented Playwright page: the in-page listener, masked screenshots, the timeout. |
| [**recorder.ts**](recorder.ts) | Turns page events into screens and counts. No Playwright in it, so another runner could feed it ([ADR-001](../docs/decisions/adr-001-playwright-typescript-npm.md)). |
| [**index.ts**](index.ts) | The package's exports: the `Config` and result types, and `runFlows`. |
| [**env.ts**](env.ts) | Reads `.env` from a folder into the environment without overwriting anything already set. |

---

<p align="center">
  <a href="../README.md">← Repository home</a>
</p>
