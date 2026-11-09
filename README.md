<a id="readme-top"></a>

<h1 align="center">⚖️ cancel-parity</h1>

<p align="center">
  <em>Runs your sign-up and cancel flows in Playwright, compares them screen by screen,<br>and fails the build when cancelling is harder than signing up.</em>
</p>

<p align="center">
  <a href="docs/README.md"><strong>Explore the docs »</strong></a>
</p>

<p align="center">
  <a href="docs/ROADMAP.md">Roadmap</a>
  ·
  <a href="https://github.com/ai-automation-tools/cancel-parity/issues">Report Bug</a>
  ·
  <a href="https://github.com/ai-automation-tools/cancel-parity/issues">Request Feature</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-MVP_Prototype-F59E0B?style=for-the-badge" alt="Status: MVP prototype">
  <a href="docs/ROADMAP.md"><img src="https://img.shields.io/badge/plan-ROADMAP-8B5CF6?style=for-the-badge" alt="Roadmap"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2ea44f?style=for-the-badge" alt="License: MIT"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Playwright-1.64-2EAD33?style=flat-square&logo=playwright&logoColor=white" alt="Playwright">
  <img src="https://img.shields.io/badge/Node.js-20.12+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 20.12+">
</p>

---

> [!WARNING]
> **Everything works except the live demo, which isn't online yet.**
> `cancel-parity run` runs your sign-up and cancel flows, checks every screen, compares the
> flows, writes an HTML and a JSON report and exits 1 when cancel is harder. The demo site and
> its reports build locally with `npm run demo`; publishing them to GitHub Pages is next. See
> the [roadmap](docs/ROADMAP.md).

## 💡 What it's for

Some subscription apps take two screens to join and six to leave, with a discount offer, a
"are you sure you want to lose everything?" page and a pre-ticked "pause instead" box along
the way. New York City's rule since 2026-10-01 says cancelling has to be as simple as
enrolling. Virginia's says at least as easy. Nobody's test suite checks it.

cancel-parity is that check. You give it two Playwright functions against your own staging
app, one that signs a test user up and one that cancels. It runs both, counts the screens,
clicks, typed fields and dialogs each took, and scans every screen for six retention
patterns regulators have objected to. Then it compares the two flows, writes an HTML report
and a JSON one, and exits non-zero when cancel is harder than sign-up by
more than you allow.

It only drives the browser your functions drive. No crawler, no telemetry, no account.

## 📊 Planned features

| Feature | Status |
|:---|:---|
| **Instrumented runner** | Works. `cancel-parity run` counts screens, clicks, typed fields and dialogs for each flow, with a masked screenshot per screen. What counts as a screen: [docs/screens.md](docs/screens.md). |
| **Parity comparison** | Works. Exit 1, or a failing `expect(report).toHaveCancelParity()`, when cancel takes more screens or clicks than sign-up, with a configurable tolerance. Sign-up is reported with and without payment screens. The rule: [docs/parity.md](docs/parity.md). |
| **Six per-screen checks** | Works. Retention offers, guilt copy, phone-only cancel, pre-checked keep boxes, cancel links at 11px or smaller, countdowns, on every screen of both flows. Phone-only cancel fails by default and the rest warn; each is configurable. The rules: [docs/checks.md](docs/checks.md). |
| **HTML report** | Works. `report.html` is one self-contained file: both flows' metrics side by side, each screen's findings and screenshot, and a coverage block saying which flows ran, at what viewport, and what wasn't observable. |
| **Live demo** | Planned. The mock StreamFlix site in `site/`, a fair and an unfair cancel flow, and their reports (`npm run demo` builds them) go on GitHub Pages next. |

## 🚀 Run your flows

### Install

It isn't on npm yet. Pack it from a clone of this repo, then install the tarball beside
Playwright in your project:

```bash
npm ci && npm run build && npm pack       # in this repo: writes cancel-parity-0.0.0.tgz
npm install --save-dev @playwright/test path/to/cancel-parity-0.0.0.tgz   # in your project
npx playwright install chromium
```

### Configure

`cancel-parity.config.mjs` (or `.js`, or `.ts` on Node 22.18+) default-exports your flows.
The ones named `signup` and `cancel` are compared:

```js
export default {
  baseURL: process.env.CANCEL_PARITY_BASE_URL, // your staging app, from .env
  flows: {
    signup: async (page) => {
      await page.goto("/join");
      await page.getByLabel("Email").fill(process.env.CANCEL_PARITY_TEST_EMAIL);
      await page.getByRole("button", { name: "Start trial" }).click();
    },
    cancel: async (page) => {
      await page.goto("/account");
      await page.getByRole("button", { name: "Cancel plan" }).click();
    },
  },
};
```

Put the two variables in a `.env` beside the config ([.env.example](.env.example) has the
names); a variable already in your environment wins. Optional keys:

| Key | Default | What it changes |
|:---|:---|:---|
| `tolerance` | `{ screens: 0, clicks: 0 }` | How many more of each metric cancel may take. Add `typedFields` or `dialogs` to compare those too. |
| `checks` | `phone-only` fails, the rest warn | `{ "guilt-copy": "fail", "countdown-timer": "off" }`. Check names: [docs/checks.md](docs/checks.md). |
| `paymentUrls` | screens on another origin | Which sign-up screens are payment screens. |
| `timeout` | `60000` | Milliseconds one flow may take. |
| `screenChangeThreshold` | `0.5` | Share of the main landmark's words that must change for an SPA update to be a new screen. |

### Run

```bash
npx cancel-parity run                       # reads cancel-parity.config.*, writes cancel-parity-report/
npx cancel-parity run --config ci.config.mjs --out reports/parity
npx cancel-parity --help                    # or -h
npx cancel-parity --version                 # or -v
```

`run` prints each flow's totals and findings, then the comparison, and writes
`report.html` (one file, screenshots embedded, readable offline), `report.json` and a masked
screenshot per screen to the `--out` folder. It exits:

- **1** when cancel took more screens or clicks than sign-up plus the tolerance ("cancel took
  4 screens, sign-up took 2 (tolerance 1)"), a check set to `fail` fired on a screen
  (phone-only cancel by default), or a flow threw, timed out or reached no screen;
- **2** when the config can't be found or used (an unknown check name, a bad tolerance);
- **0** otherwise.

Inside `@playwright/test`, `expect(report).toHaveCancelParity()` applies the same rule; see
[docs/parity.md](docs/parity.md).

## 🧑‍💻 Quick start (for contributors)

```bash
npm ci                                   # install dependencies
npx playwright install chromium          # the browser the slices test with
npm run lint && npm test && npm run build
node dist/cli.js --help
npm run demo                             # builds the demo's two reports into site/reports/
```

How the tests are laid out and how to add a check with its fair and unfair fixtures:
[CONTRIBUTING.md](CONTRIBUTING.md).

## ⚠️ What it is not

cancel-parity measures how your sign-up and cancel flows compare and flags patterns
regulators have objected to. It is not legal advice, and a passing result does not mean a
flow complies with any law. Ask counsel.

Some things it won't do, on purpose. Please don't open an issue asking for them:

- **Scan sites you don't own.** There's no crawler and no "audit any URL" mode. It runs only
  the flows you write against your own staging app, with your own test account. Pointing it at
  a competitor's site is not a use it supports.
- **Say "compliant", "non-compliant", "legal" or "illegal".** It reports evidence, never a
  verdict ([ADR-002](docs/decisions/adr-002-evidence-not-verdicts.md)).
- **Run as a hosted service, dashboard or paid tier.** It's a free MIT tool you run yourself.
- **Use an ML or LLM classifier.** The checks are deterministic, so a failing build can always
  be explained.
- **Handle real payments.** Sign-up runs against your sandbox billing; it never enters card
  numbers of its own.
- **Run under Cypress.** Playwright only ([ADR-001](docs/decisions/adr-001-playwright-typescript-npm.md)).

The reasons are in the [spec](docs/product/spec.md).

## 📖 Documentation

| Section | What's inside |
|:---|:---|
| [**📚 docs/**](docs/README.md) | The roadmap, changelog, product spec, build plan and ADRs. |
| [**🧩 src/**](src/README.md) | The CLI, the instrumented runner, the six checks, the comparison and the matcher. |
| [**🌐 site/**](site/index.html) | The demo page GitHub Pages will serve, and the mock StreamFlix site with a fair and an unfair cancel flow. |
| [**🤝 CONTRIBUTING.md**](CONTRIBUTING.md) | Running the tests, and adding a check with its fair and unfair fixtures. |
| [**🔒 SECURITY.md**](SECURITY.md) | How to report a vulnerability. |

---

<p align="center">
  Built with <a href="https://playwright.dev">Playwright</a> · <a href="docs/README.md">Docs</a> · <a href="LICENSE">MIT License</a>
</p>
