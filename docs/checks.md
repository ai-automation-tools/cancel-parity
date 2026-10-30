<h1 align="center">🔍 The six per-screen checks</h1>

<p align="center">
  <em>What each check looks for on every screen of every flow, how severe it is by default, and how to change that.</em>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs_home-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

A flow can be short and still hard to leave. So on every screen of every flow, the runner
also looks for six patterns regulators have objected to. The checks are `scanPage()` in
`src/checks.ts`: plain DOM code with no Playwright in it, so any runner can call it with
`page.evaluate(scanPage)`. They're deterministic text and style rules, so you can always
see why one fired.

## The checks

| Check | Fires when the screen shows | Default |
|:---|:---|:---|
| `retention-offer` | Offer copy: "Wait!", "before you go", "special offer", "50% off your next…". | warn |
| `guilt-copy` | "You'll lose…", "we'll miss you", "are you sure you want to leave". | warn |
| `phone-only` | "Call our retention team", "call us", or a 1-800 number, **and** no link or button on the same screen that cancels (its label says cancel, or end my subscription). | **fail** |
| `pre-checked-keep` | A ticked checkbox whose label says keep, pause, stay or downgrade. | warn |
| `buried-cancel` | A link or button labelled cancel (or end my subscription) rendered at 11px or smaller. | warn |
| `countdown-timer` | An element whose id or class says countdown, timer, expires or offer-ends, holding a short text such as "09:59". | warn |

The text checks read each element that holds only text, once, and skip scripts and styles.
A text that matches more than one goes to the first in the table's order. Each check is
reported at most once per screen, with the text it fired on (up to 160 characters) as
evidence. A support phone number next to a way to cancel online isn't phone-only, so that
check stays quiet on the fair flow.

## When a screen is scanned

The page runs the checks every time it reports its main content to the runner: when it
loads, after its stylesheets apply, and on every change. Findings land on the screen that
was showing, so a check fires on the screen where the user would have seen it, even if
the flow moved on a moment later. Only the top frame is scanned; an embedded payment
iframe isn't.

## Severity

`fail` makes the CLI exit 1 and `toHaveCancelParity()` fail. `warn` is reported only.
`off` drops the check. Change any of them in the config:

```ts
export default {
  checks: { "guilt-copy": "fail", "countdown-timer": "off" },
  flows: { signup, cancel },
};
```

## What it says

Each flow's totals are followed by its findings:

```
cancel: 5 screens, 4 clicks, 1 typed field, 0 dialogs
  warn: screen 1: cancel control at 11px or smaller: "Cancel plan"
  warn: screen 2: retention offer: "Wait! Stay for half price"
  warn: screen 2: countdown timer: "09:59"
  warn: screen 3: guilt copy: "We'll miss you, and you'll lose your watch history."
  fail: screen 3: phone-only cancel: "Prefer to talk it over? Call our retention team on 1-800-555-0100."
  warn: screen 3: pre-checked "keep my plan" box: "Keep my plan and pause billing for a month"
```

A `fail` finding on the `signup` or `cancel` flow is also a line in the comparison's
`failures` ([parity.md](parity.md)). On any other flow it still makes the CLI exit 1.
`report.json` lists each screen's findings under `findings`, with `check`, `severity` and
`evidence`.

The findings are evidence of a pattern on a screen, never a judgment about a law
([ADR-002](decisions/adr-002-evidence-not-verdicts.md)).

## The fixtures

`tests/checks.test.ts` gives every check a fair and an unfair screen, and runs both flows of
the StreamFlix pair under `tests/fixtures/parity/`: every check fires on its unfair cancel
screen, and none fires on sign-up or the fair cancel flow.

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="parity.md">How the flows are compared →</a>
</p>
