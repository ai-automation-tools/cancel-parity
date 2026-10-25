import { readFileSync } from "node:fs";

export interface Context {
  out: (s: string) => void;
  err: (s: string) => void;
}

const HELP = `cancel-parity: compares a sign-up flow with a cancel flow.

Usage:
  cancel-parity --help     Show this help
  cancel-parity --version  Print the version

The run command arrives with the first roadmap slice.
`;

const defaultContext: Context = {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
};

export async function run(argv: string[], ctx: Context = defaultContext): Promise<number> {
  const [cmd] = argv;
  if (cmd === undefined || cmd === "--help" || cmd === "-h") {
    ctx.out(HELP);
    return 0;
  }
  if (cmd === "--version" || cmd === "-v") {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    ctx.out(`${pkg.version}\n`);
    return 0;
  }
  ctx.err(`Unknown command: ${cmd}\n\n${HELP}`);
  return 2;
}
