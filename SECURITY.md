# Security policy

cancel-parity drives a browser through your own sign-up and cancel flows, inside your CI. It
makes no network calls of its own and sends no telemetry. It reads test-account details only
from the environment your flow functions read, and it must never write them to a report, a
screenshot or a log. A bug that breaks any of those promises is a security bug.

## Reporting a vulnerability

Report it privately through GitHub's security advisories: open the repository's
**Security** tab and click **Report a vulnerability**
(`https://github.com/ai-automation-tools/cancel-parity/security/advisories/new`). Please don't
open a public issue for it.

Say what you found, the steps or flow that show it, and the Node and Playwright versions you
saw it on. You'll get a reply within a week. Once a fix ships, the advisory is published with
credit to you unless you'd rather stay anonymous.

## What counts

- A login secret, token or other credential showing up in the JSON report, the HTML report, a
  screenshot or log output.
- cancel-parity making a network request the user's own flow functions didn't make.
- A page under test changing what the runner records (counts, screens or findings) through
  the runner's own channel, or getting a terminal escape sequence into the CLI output.
- A report or CLI message that states a legal verdict ("compliant", "illegal" and the like).
  The tool reports evidence only; see `docs/decisions/adr-002-evidence-not-verdicts.md`.

A check that misfires on an ordinary flow is a bug, not a vulnerability. Open a normal issue
for that.

## Supported versions

Only the latest release gets fixes.
