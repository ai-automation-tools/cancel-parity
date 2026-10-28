import { defineConfig } from "@playwright/test";

// Runs the matcher spec through @playwright/test. Started by tests/matcher.test.ts.
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  reporter: "line",
  outputDir: process.env.CANCEL_PARITY_PW_OUT,
  use: { browserName: "chromium" },
});
