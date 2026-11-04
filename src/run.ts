import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { describeFinding } from "./checks.ts";
import { count, describeMetric, METRICS, type Comparison } from "./compare.ts";
import { ConfigError, loadConfig } from "./config.ts";
import { cancelParity, version } from "./parity.ts";
import type { Totals } from "./runner.ts";

export interface Context {
  out: (s: string) => void;
  err: (s: string) => void;
  cwd?: string;
}

const HELP = `cancel-parity: compares a sign-up flow with a cancel flow.

Usage:
  cancel-parity run [--config <file>] [--out <dir>]
      Run every flow in the config, compare the flows named signup and
      cancel, and write <dir>/report.json and <dir>/report.html.
      --config  Defaults to cancel-parity.config.ts, .js or .mjs in this folder.
      --out     Defaults to cancel-parity-report.
      Exits 1 when cancel took more than sign-up plus the config's
      tolerance on a compared metric (screens and clicks by default), a
      check set to "fail" fired on a screen (phone-only cancel by default),
      or a flow threw, timed out or reached no screen; 2 when the config
      can't be used; 0 otherwise.
  cancel-parity --help     Show this help
  cancel-parity --version  Print the version
`;

const defaultContext: Context = {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
};

export async function run(argv: string[], ctx: Context = defaultContext): Promise<number> {
  const [cmd, ...rest] = argv;
  if (cmd === undefined || cmd === "--help" || cmd === "-h") {
    ctx.out(HELP);
    return 0;
  }
  if (cmd === "--version" || cmd === "-v") {
    ctx.out(`${version()}\n`);
    return 0;
  }
  if (cmd === "run") return runCommand(rest, ctx);
  ctx.err(`Unknown command: ${cmd}\n\n${HELP}`);
  return 2;
}

async function runCommand(args: string[], ctx: Context): Promise<number> {
  const cwd = ctx.cwd ?? process.cwd();
  let opts: { config?: string; out?: string };
  try {
    opts = parseArgs({ args, options: { config: { type: "string" }, out: { type: "string" } } }).values;
  } catch (err) {
    ctx.err(`${(err as Error).message}\n\n${HELP}`);
    return 2;
  }
  let config;
  try {
    config = await loadConfig(opts.config, cwd);
  } catch (err) {
    ctx.err(`${err instanceof ConfigError ? err.message : `Could not load the config: ${(err as Error).message}`}\n`);
    return 2;
  }
  const outDir = resolve(cwd, opts.out ?? "cancel-parity-report");
  const report = await cancelParity(config, { outDir });

  let code = 0;
  for (const [name, r] of Object.entries(report.flows)) {
    const counts = summary(r.totals);
    const without =
      name === "signup" && report.comparison?.signup.paymentScreens.length
        ? ` (without payment: ${summary(report.comparison.signup.withoutPayment)})`
        : "";
    if (r.status === "ok") {
      ctx.out(`${name}: ${counts}${without}\n`);
    } else {
      code = 1;
      const why = r.status === "empty" ? "the flow reached no screen" : r.error;
      ctx.err(`${name}: ${r.status} (${why}). Recorded so far: ${counts}\n`);
    }
    r.screens.forEach((s, i) =>
      s.findings.forEach((f) => {
        if (f.severity === "fail") code = 1;
        ctx.out(`  ${f.severity}: ${describeFinding(i + 1, f)}\n`);
      }),
    );
  }
  if (report.comparison) {
    if (!report.comparison.pass) code = 1;
    parity(report.comparison, ctx);
  } else {
    ctx.out("No comparison: name one flow `signup` and one `cancel` in the config to compare them.\n");
  }
  ctx.out(`Report: ${join(outDir, "report.html")} (data: report.json)\n`);
  return code;
}

function summary(t: Totals): string {
  return METRICS.map((m) => count(t[m], m)).join(", ");
}

function parity(c: Comparison, ctx: Context): void {
  if (c.pass) {
    const lines = c.metrics.filter((m) => m.tolerance !== null).map((m) => `  ${describeMetric(m)}\n`);
    ctx.out(`Parity holds: cancel is within tolerance of sign-up.\n${lines.join("")}`);
  } else {
    ctx.err(`Parity fails:\n${c.failures.map((f) => `  ${f}\n`).join("")}`);
  }
}
