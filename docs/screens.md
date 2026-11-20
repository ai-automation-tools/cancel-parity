<h1 align="center">📏 What cancel-parity counts</h1>

<p align="center">
  <em>How a flow becomes screens, clicks, typed fields and dialogs, and what the runner can't see.</em>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/↩-docs_home-6B7280?style=for-the-badge" alt="Back to docs"></a>
</p>

---

The spec left one question to Slice 0: what counts as a screen, especially in a single-page
app. This is the answer the runner implements (`src/recorder.ts`), and the fixtures under
`tests/fixtures/` pin it with exact counts.

## Screens

A new screen starts when **the user did something on the current screen** (a click, a typed
field, the Enter key or a dialog) and then either:

- **the address changed.** The main frame committed a different URL: a full page load, a
  form post, a redirect to a payment page on another origin, or a single-page app calling
  `history.pushState`. Going back to an earlier URL counts again, because the user sat through
  that screen again.
- **the main content changed.** At least half of the words in the page's main landmark
  (`<main>` or `role="main"`, else `<body>`) differ from what it showed when the screen began.
  Only visible text counts. The share is `screenChangeThreshold` in the config (default `0.5`).

Without an action in between, a change updates the current screen instead of starting a new
one. That keeps these from inflating the count:

- a server or script redirect right after a page loads;
- a router that updates the address just after it renders the new view;
- a page that renders "Loading…" and then its real content.

A change of fewer than half the words, such as a "show details" panel opening, is not a new
screen. Several small changes add up: the comparison is always against the text the screen
started with.

## Clicks, typed fields and dialogs

| Metric | What counts | What doesn't |
|:---|:---|:---|
| **Clicks** | Every click the flow makes, in any frame, including ticking a checkbox. | Clicks the page's own scripts fire. |
| **Typed fields** | Each text field, text area or editable region the flow types into, once per field. | Typing into the same field again; choosing from a `<select>`; ticking boxes (those are clicks). |
| **Dialogs** | Browser `alert`, `confirm` and `prompt` dialogs. The runner accepts them unless the flow's own handler answers first. | In-page modals. They count as a screen if they replace most of the main landmark. |

Each count belongs to the screen that was showing when it happened. The report lists every
screen with its own counts, the checks that fired on it ([checks.md](checks.md)), and the
flow's totals.

## Screenshots

Every screen gets a PNG under `screenshots/` in the output folder, taken as soon as the
screen reports its content. Every field that can show what the flow typed or chose is
painted over in every frame: each `input` except checkboxes, radios and input buttons
(`submit`, `button`, `reset`, `image`, `hidden`), each `textarea`, and each editable region
(`[contenteditable]`). Checkboxes and buttons stay visible because they carry the page's own
words, and two checks' evidence (a pre-checked box, a tiny cancel button). A test reads the
pixels back to prove both halves. The shot runs alongside the flow,
so a screen the flow leaves within a few milliseconds may record `null`, or show the first
moment of the next action. The last screen is always captured.

## What the runner keeps out of the report

- **What was typed.** The page reports that a field was typed into, never its value.
- **Query strings and fragments.** Screen URLs are origin and path only, because tokens and
  emails ride in query strings.
- **Dialog text.** Only the count.
- **Error detail.** A flow that throws or times out records the first line of the error.
- **Control characters.** Check evidence and error lines can quote the page, so ANSI
  escapes, other control characters and bidi overrides become spaces before they reach the
  terminal, `report.json` or `report.html`.
- **The page's own say.** The in-page listener reports to the runner through
  `__cancelParity` with a nonce made for each run. The listener takes the function before the
  page's scripts run, and the runner ignores any call without the nonce, so a page can't add
  clicks, screens or findings of its own.

## Flow outcomes

| Status | Meaning | CLI exit |
|:---|:---|:---|
| `ok` | The flow finished. | 0 |
| `error` | The flow threw. What it recorded before that is kept. | 1 |
| `timeout` | The flow ran past `timeout` (default 60 s) and was stopped. | 1 |
| `empty` | The flow finished without reaching a single screen. | 1 |

A config the CLI can't load or use exits 2. Comparing the `signup` and `cancel` flows can
also exit 1; see [parity.md](parity.md).

## Not observed yet

- New tabs and popups. A flow runs in one tab.
- Mobile viewports. Every run is 1280×720 (a post-release slice adds a phone run).

---

<p align="center">
  <a href="README.md">← Docs home</a> ·
  <a href="ROADMAP.md">Roadmap →</a>
</p>
