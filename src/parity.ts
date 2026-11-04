import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Browser } from "@playwright/test";
import type { Config } from "./config.ts";
import { compareFlows, type Comparison } from "./compare.ts";
import { renderHtml } from "./html.ts";
import { runFlows, VIEWPORT, type FlowResult } from "./runner.ts";

/** ADR-002's wording, carried by every report word for word. */
export const CLAIMS_BOUNDARY =
  "cancel-parity measures how your sign-up and cancel flows compare and flags patterns regulators have objected to. It is not legal advice, and a passing result does not mean a flow complies with any law. Ask counsel.";

export interface ParityReport {
  tool: "cancel-parity";
  version: string;
  notice: string;
  viewport: { width: number; height: number };
  flows: Record<string, FlowResult>;
  /** null unless the config has flows named `signup` and `cancel`. */
  comparison: Comparison | null;
}

export interface ParityOptions {
  /** Where report.json, report.html and the screenshots go. Default `cancel-parity-report` in the working folder. */
  outDir?: string;
  /** Reuse this browser instead of launching Chromium, such as a `@playwright/test` fixture's. */
  browser?: Browser;
  /** Heading of report.html. Default "cancel-parity report". */
  title?: string;
}

export function version(): string {
  return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
}

/** Runs every flow, compares `signup` with `cancel`, writes report.json and report.html, and returns the report. */
export async function cancelParity(config: Config, opts: ParityOptions = {}): Promise<ParityReport> {
  const outDir = resolve(opts.outDir ?? "cancel-parity-report");
  mkdirSync(outDir, { recursive: true });
  const flows = await runFlows(config, outDir, opts.browser);
  const { signup, cancel } = flows;
  const comparison =
    signup && cancel ? compareFlows(signup, cancel, { tolerance: config.tolerance, paymentUrls: config.paymentUrls }) : null;
  const report: ParityReport = {
    tool: "cancel-parity",
    version: version(),
    notice: CLAIMS_BOUNDARY,
    viewport: VIEWPORT,
    flows,
    comparison,
  };
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
  const image = (rel: string) => {
    try {
      return `data:image/png;base64,${readFileSync(join(outDir, rel)).toString("base64")}`;
    } catch {
      return null;
    }
  };
  writeFileSync(join(outDir, "report.html"), renderHtml(report, image, opts.title));
  return report;
}
