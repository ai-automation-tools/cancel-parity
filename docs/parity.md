<h1 align="center">⚖️ How the flows are compared</h1>

<p align="center">
  <em>The parity rule, the tolerance, payment screens, and what the CLI and the matcher say when cancel is harder.</em>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs_home-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

The runner counts each flow ([screens.md](screens.md)). This page is the rule that compares
them, as `src/compare.ts` implements it. The fixture pair under `tests/fixtures/parity/`
pins it: a fair cancel flow that exits 0 and an unfair one that exits 1.

## Which flows

A config's flows named `signup` and `cancel` are compared. Any other flows run and are
reported, but not compared. A config without both names gets `"comparison": null` in
`report.json` and a line saying so.

## The rule

For each compared metric, cancel passes when

```
cancel ≤ sign-up + tolerance
```

| Metric | Compared by default | Default tolerance |
|:---|:---|:---|
| Screens | Yes | 0 |
| Clicks | Yes | 0 |
| Typed fields | No, reported only | none |
| Dialogs | No, reported only | none |

`tolerance` in the config changes a number or adds a metric. Metrics you leave out keep the
defaults above:

```ts
export default {
  tolerance: { clicks: 1, dialogs: 0 }, // one extra click allowed; compare dialogs too
  flows: { signup, cancel },
};
```

A flow that throws, times out or reaches no screen never passes the comparison, whatever its
counts. Its partial counts are still in the report.

## Payment screens

Sign-up often passes through a payment page, which makes sign-up longer and parity easier
to pass. cancel-parity counts those screens in the comparison and reports sign-up's totals
both ways.

A sign-up screen is a payment screen when its URL is on another origin than sign-up's first
screen, which is how hosted checkouts work. If your payment step lives on your own origin,
list it instead; this replaces the origin rule:

```ts
paymentUrls: ["/checkout", /\/billing\/card$/],
```

Strings match anywhere in the screen's URL (origin and path); regular expressions are
tested against it.

## What it says

The CLI prints each flow's totals, sign-up's without payment when it had payment screens,
then the result:

```
signup: 3 screens, 2 clicks, 2 typed fields, 0 dialogs (without payment: 2 screens, 1 click, 1 typed field, 0 dialogs)
cancel: 5 screens, 4 clicks, 1 typed field, 0 dialogs
Parity fails:
  cancel took 5 screens, sign-up took 3
  cancel took 4 clicks, sign-up took 2
```

It exits 1 when parity fails, 0 when it holds. `report.json` carries the same result under
`comparison`: `pass`, `failures`, every metric with both values and its tolerance (`null`
when not compared), and sign-up's totals with and without payment.

Every message states the two numbers and nothing else. None of them says whether a flow
meets any law ([ADR-002](decisions/adr-002-evidence-not-verdicts.md)); a test fails the build
if one ever does. `report.json` carries ADR-002's wording under `notice`.

## In `@playwright/test`

`cancelParity(config, { browser, outDir })` runs the flows with the test's browser, writes
`report.json` to `outDir` and returns the report. The matcher applies the same rule:

```ts
import { expect as baseExpect, test } from "@playwright/test";
import { cancelParity, cancelParityMatchers } from "cancel-parity";
import { signup, cancel } from "./flows";

const expect = baseExpect.extend(cancelParityMatchers);

test("cancelling is as easy as signing up", async ({ browser }, info) => {
  const report = await cancelParity({ flows: { signup, cancel } }, { browser, outDir: info.outputPath("parity") });
  expect(report).toHaveCancelParity();
});
```

A failure lists the same lines the CLI prints.

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="screens.md">What it counts →</a>
</p>
