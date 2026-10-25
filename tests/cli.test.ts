import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { loadEnv } from "../src/env.ts";

async function exec(argv: string[]) {
  let out = "";
  let err = "";
  const code = await run(argv, { out: (s) => (out += s), err: (s) => (err += s) });
  return { code, out, err };
}

test("--help prints usage and exits 0", async () => {
  const r = await exec(["--help"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /Usage:/);
});

test("--version prints the package version", async () => {
  const r = await exec(["--version"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /^\d+\.\d+\.\d+\n$/);
});

test("an unknown command exits 2", async () => {
  const r = await exec(["nope"]);
  assert.equal(r.code, 2);
  assert.match(r.err, /Unknown command: nope/);
});

test(".env fills unset variables and the real environment wins", () => {
  const dir = mkdtempSync(join(tmpdir(), "cancel-parity-env-"));
  writeFileSync(join(dir, ".env"), "FROM_FILE=file\nALREADY_SET=file\n");
  const env: NodeJS.ProcessEnv = { ALREADY_SET: "real" };
  loadEnv(dir, env);
  assert.equal(env.FROM_FILE, "file");
  assert.equal(env.ALREADY_SET, "real");
});
