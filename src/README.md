<h1 align="center">🧩 Source</h1>

<p align="center">
  <em>The CLI and, as the slices land, the runner, the comparison and the checks.</em>
</p>

<p align="center">
  <a href="../README.md"><img src="https://img.shields.io/badge/↩-repository_root-6B7280?style=for-the-badge" alt="Repository root"></a>
</p>

---

| File | What it does |
|:---|:---|
| [**cli.ts**](cli.ts) | The `cancel-parity` bin entry. Loads `.env`, then hands the arguments to `run`. |
| [**run.ts**](run.ts) | Parses the command line and returns an exit code. Takes its output functions as arguments so tests can call it without a process. |
| [**env.ts**](env.ts) | Reads `.env` from a folder into the environment without overwriting anything already set. |

---

<p align="center">
  <a href="../README.md">← Repository home</a>
</p>
