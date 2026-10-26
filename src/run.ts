import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { ConfigError, loadConfig } from "./config.ts";
import { runFlows, VIEWPORT } from "./runner.ts";

export interface Context {
  out: (s: string) => void;
  err: (s: string) => void;
  cwd?: string;
}

const HELP = `cancel-parity: compares a sign-up flow with a cancel flow.

Usage:
  cancel-parity run [--config <file>] [--out <dir>]
      Run every flow in the config and write <dir>/report.json.
      --config  Defaults to cancel-parity.config.ts, .js or .mjs in this folder.
      --out     Defaults to cancel-parity-report.
      Exits 0 when every flow finished, 1 when one threw, timed out or
      reached no screen, and 2 when the config can't be used.
  cancel-parity --help     Show this help
  cancel-parity --version  Print the version
`;

const defaultContext: Context = {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
};

function version(): string {
  return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
}

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
  mkdirSync(outDir, { recursive: true });
  const flows = await runFlows(config, outDir);
  const report = { tool: "cancel-parity", version: version(), viewport: VIEWPORT, flows };
  const file = join(outDir, "report.json");
  writeFileSync(file, JSON.stringify(report, null, 2) + "\n");

  let code = 0;
  for (const [name, r] of Object.entries(flows)) {
    const t = r.totals;
    const counts = `${t.screens} screens, ${t.clicks} clicks, ${t.typedFields} typed fields, ${t.dialogs} dialogs`;
    if (r.status === "ok") {
      ctx.out(`${name}: ${counts}\n`);
    } else {
      code = 1;
      const why = r.status === "empty" ? "the flow reached no screen" : r.error;
      ctx.err(`${name}: ${r.status} (${why}). Recorded so far: ${counts}\n`);
    }
  }
  ctx.out(`Report: ${file}\n`);
  return code;
}
