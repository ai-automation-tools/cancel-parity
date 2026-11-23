# Open questions

## Open

### All release gates are ticked: should runs build Slice 4 and on before the 90-day test, or wait?
- Asked: 2026-11-23 by cancel-parity-roadmap
- Context: Every item above `## After public release` is `[x]` (CI green on `main` since #16), and the repo is still private. The next open roadmap item is **Slice 4: GitHub Action**, but `docs/product/build-plan.md` says "Everything from Slice 4 on is built after release, and only if the 90-day test in the memo says keep going", and `AGENTS.md` says that call is yours. The roadmap routine itself says to move below the line once nothing above it is workable, so the two disagree, and runs go quiet until you settle it. Options: (a) wait: runs stay quiet (or take only `small` maintenance items) until you make the repo public and the 90-day test says keep going; (b) build now: runs take Slice 4, then 5 and 6, before or during the 90 days, and the build plan's sentence gets changed to match; (c) build only Slice 5 (the false-positive corpus) now, since it tests the defaults the MVP already ships, and hold Slices 4 and 6-8 for the test. Recommendation: (c). The corpus protects the release itself (the build plan's accuracy gate), while the Action and the citation map only matter if people adopt the tool, which is what the test measures. Going public is the step that unblocks everything, and only you can take it.
- Answer:

## Answered

### Is "Harden the runner" a release gate?
- Asked: 2026-11-13 by cancel-parity-roadmap
- Context: It is the last open item above `## After public release` in the roadmap, and only you can decide it. Today screenshots mask only inputs whose type hides what is typed, so a card number typed into a sign-up payment form on the user's own origin lands unmasked in `report.html` and the screenshot files, which teams upload as CI artifacts. "Harden the runner" masks every `input`, `textarea` and `[contenteditable]`, adds a per-run nonce to `__cancelParity`, and strips control characters from page text: one feature run with a fixture test for each. Options: (a) gate, move it above the line and the next run builds it before release; (b) not a gate, release now and keep it first after release. Recommendation: (a), because the repo's own standard says credentials never reach a report, and a card number is the likeliest secret a sign-up flow types.
- Answer: (a) Yes, it's a gate. Move it above `## After public release`, and the next run builds it before release. (Mike, 2026-11-16)
