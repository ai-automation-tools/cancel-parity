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
> **The runner, the comparison and the six checks work; the HTML report doesn't yet.**
> `cancel-parity run` runs your sign-up and cancel flows, checks every screen, compares the
> flows and exits 1 when cancel is harder. It writes JSON only until the HTML report and the
> live demo land. See the [roadmap](docs/ROADMAP.md).

## 💡 What it's for

Some subscription apps take two screens to join and six to leave, with a discount offer, a
"are you sure you want to lose everything?" page and a pre-ticked "pause instead" box along
the way. New York City's rule since 2026-10-01 says cancelling has to be as simple as
enrolling. Virginia's says at least as easy. Nobody's test suite checks it.

cancel-parity is that check. You give it two Playwright functions against your own staging
app, one that signs a test user up and one that cancels. It runs both, counts the screens,
clicks, typed fields and dialogs each took, and scans every screen for six retention
patterns regulators have objected to. Then it compares the two flows, writes a JSON and an
HTML report, and exits non-zero when cancel is harder than sign-up by more than you allow.

It only drives the browser your functions drive. No crawler, no telemetry, no account.

## 📊 Planned features

| Feature | Status |
|:---|:---|
| **Instrumented runner** | Works. `cancel-parity run` counts screens, clicks, typed fields and dialogs for each flow, with a masked screenshot per screen. What counts as a screen: [docs/screens.md](docs/screens.md). |
| **Parity comparison** | Works. Exit 1, or a failing `expect(report).toHaveCancelParity()`, when cancel takes more screens or clicks than sign-up, with a configurable tolerance. Sign-up is reported with and without payment screens. The rule: [docs/parity.md](docs/parity.md). |
| **Six per-screen checks** | Works. Retention offers, guilt copy, phone-only cancel, pre-checked keep boxes, cancel links at 11px or smaller, countdowns, on every screen of both flows. Phone-only cancel fails by default and the rest warn; each is configurable. The rules: [docs/checks.md](docs/checks.md). |
| **HTML report and live demo** | Planned (Slice 3). A fair and an unfair mock flow, with the reports CI produced. |

## 🚀 Run your flows

Not on npm yet. Build it from this repo (`npm ci && npm run build`), then put a config in your
project. `cancel-parity.config.ts` (or `.js`, `.mjs`) default-exports the flows; the ones
named `signup` and `cancel` are compared:

```ts
export default {
  baseURL: process.env.CANCEL_PARITY_BASE_URL, // your staging app, from .env
  tolerance: { screens: 0, clicks: 0 },         // the default
  checks: { "guilt-copy": "fail" },             // phone-only fails by default, the rest warn
  flows: {
    signup: async (page) => {
      await page.goto("/join");
      await page.getByLabel("Email").fill(process.env.CANCEL_PARITY_TEST_EMAIL);
      await page.getByRole("button", { name: "Start trial" }).click();
    },
    cancel: async (page) => {
      await page.goto("/account");
      await page.getByRole("button", { name: "Cancel plan" }).click();
      await page.getByRole("button", { name: "Confirm" }).click();
    },
  },
};
```

```bash
node path/to/cancel-parity/dist/cli.js run   # writes cancel-parity-report/report.json
```

It exits 1 when cancel took more screens or clicks than sign-up ("cancel took 5 screens,
sign-up took 3"), a check set to `fail` fired on a screen (phone-only cancel by default), or
a flow threw, timed out or reached no screen, and 0 otherwise.
`--config <file>` and `--out <dir>` change where it reads and writes. Inside
`@playwright/test`, `expect(report).toHaveCancelParity()` applies the same rule; see
[docs/parity.md](docs/parity.md).

## 🧑‍💻 Quick start (for contributors)

```bash
npm ci                                   # install dependencies
npx playwright install chromium          # the browser the slices test with
npm run lint && npm test && npm run build
node dist/cli.js --help
```

## ⚠️ What it is not

cancel-parity measures how your sign-up and cancel flows compare and flags patterns
regulators have objected to. It is not legal advice, and a passing result does not mean a
flow complies with any law. Ask counsel.

It won't scan sites you don't own, won't print a compliance verdict, won't enter real card
numbers, and won't run under Cypress. The full list is in the [spec](docs/product/spec.md).

## 📖 Documentation

| Section | What's inside |
|:---|:---|
| [**📚 docs/**](docs/README.md) | The roadmap, changelog, product spec, build plan and ADRs. |
| [**🧩 src/**](src/README.md) | The CLI, the instrumented runner, the six checks, the comparison and the matcher. |
| [**🌐 site/**](site/index.html) | The demo page GitHub Pages will serve. A "coming soon" shell for now. |
| [**🔒 SECURITY.md**](SECURITY.md) | How to report a vulnerability. |

---

<p align="center">
  Built with <a href="https://playwright.dev">Playwright</a> · <a href="docs/README.md">Docs</a> · <a href="LICENSE">MIT License</a>
</p>
