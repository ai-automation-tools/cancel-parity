import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

// Fills `env` from a `.env` file in `dir`. A variable already set in the real
// environment wins, so CI secrets override the file.
export function loadEnv(dir: string, env: NodeJS.ProcessEnv = process.env): void {
  const file = join(dir, ".env");
  if (!existsSync(file)) return;
  for (const [key, value] of Object.entries(parseEnv(readFileSync(file, "utf8")))) {
    if (env[key] === undefined) env[key] = value;
  }
}
