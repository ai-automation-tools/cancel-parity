import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

// toHaveCancelParity() has to work inside @playwright/test itself, so this runs
// the spec in tests/playwright/ through Playwright's own runner.
test("expect(report).toHaveCancelParity() passes the fair pair and fails the unfair one in @playwright/test", () => {
  const cli = join(createRequire(import.meta.url).resolve("@playwright/test/package.json"), "..", "cli.js");
  const config = join(import.meta.dirname, "playwright", "playwright.config.ts");
  const r = spawnSync(process.execPath, [cli, "test", "--config", config], {
    encoding: "utf8",
    env: { ...process.env, CI: "1", CANCEL_PARITY_PW_OUT: mkdtempSync(join(tmpdir(), "cancel-parity-pw-")) },
  });
  const output = r.stdout + r.stderr;
  assert.equal(r.status, 0, output);
  assert.match(output, /2 passed/);
});
