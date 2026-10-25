#!/usr/bin/env node
import { loadEnv } from "./env.ts";
import { run } from "./run.ts";

loadEnv(process.cwd());
process.exitCode = await run(process.argv.slice(2));
