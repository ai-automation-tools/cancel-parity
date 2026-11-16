# Open questions

## Open

### Is "Harden the runner" a release gate?
- Asked: 2026-11-13 by cancel-parity-roadmap
- Context: It is the last open item above `## After public release` in the roadmap, and only you can decide it. Today screenshots mask only inputs whose type hides what is typed, so a card number typed into a sign-up payment form on the user's own origin lands unmasked in `report.html` and the screenshot files, which teams upload as CI artifacts. "Harden the runner" masks every `input`, `textarea` and `[contenteditable]`, adds a per-run nonce to `__cancelParity`, and strips control characters from page text: one feature run with a fixture test for each. Options: (a) gate, move it above the line and the next run builds it before release; (b) not a gate, release now and keep it first after release. Recommendation: (a), because the repo's own standard says credentials never reach a report, and a card number is the likeliest secret a sign-up flow types.
- Answer:

## Answered
