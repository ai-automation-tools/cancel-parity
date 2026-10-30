import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Page } from "@playwright/test";
import { checkSeverities, type CheckSeverity } from "./checks.ts";
import { checkTolerance, type Tolerance } from "./compare.ts";

/** One user journey, written or recorded with `npx playwright codegen` against your own app. */
export type Flow = (page: Page) => Promise<void>;

export interface Config {
  /**
   * Flow functions by name, for example `{ signup: async (page) => { ... }, cancel: ... }`.
   * Flows named `signup` and `cancel` are compared with each other.
   */
  flows: Record<string, Flow>;
  /** Lets flows call `page.goto("/")`. */
  baseURL?: string;
  /** Milliseconds one flow may take before it is stopped. Default 60000. */
  timeout?: number;
  /** Share of the main landmark's words that must change for an SPA update to count as a new screen. Default 0.5. */
  screenChangeThreshold?: number;
  /** How many more screens, clicks, typed fields or dialogs cancel may take than sign-up. Default `{ screens: 0, clicks: 0 }`. */
  tolerance?: Tolerance;
  /** Sign-up screens whose URL contains one of these, or matches one of these patterns, are payment screens. Default: screens on another origin. */
  paymentUrls?: (string | RegExp)[];
  /** Severity per check: "fail", "warn" or "off". Default: `phone-only` fails, the other five warn. */
  checks?: CheckSeverity;
}

export const DEFAULT_CONFIG_FILES = ["cancel-parity.config.ts", "cancel-parity.config.js", "cancel-parity.config.mjs"];

export class ConfigError extends Error {}

/** Imports a config file (its default export) and checks its shape. */
export async function loadConfig(file: string | undefined, cwd: string): Promise<Config> {
  const path = file ? resolve(cwd, file) : DEFAULT_CONFIG_FILES.map((f) => resolve(cwd, f)).find(existsSync);
  if (!path || !existsSync(path)) {
    throw new ConfigError(file ? `Config file not found: ${file}` : `No config file found. Looked for ${DEFAULT_CONFIG_FILES.join(", ")}.`);
  }
  const mod = await import(pathToFileURL(path).href);
  return checkConfig(mod.default);
}

export function checkConfig(value: unknown): Config {
  const c = value as Config | undefined;
  if (!c || typeof c !== "object") throw new ConfigError("The config file must export a config object as its default export.");
  const flows = c.flows && typeof c.flows === "object" ? Object.entries(c.flows) : [];
  if (flows.length === 0) throw new ConfigError("The config must name at least one flow under `flows`.");
  for (const [name, fn] of flows) {
    if (typeof fn !== "function") throw new ConfigError(`Flow "${name}" must be a function that takes a Playwright page.`);
  }
  if (c.timeout !== undefined && !(c.timeout > 0)) throw new ConfigError("`timeout` must be a positive number of milliseconds.");
  const t = c.screenChangeThreshold;
  if (t !== undefined && !(t > 0 && t <= 1)) throw new ConfigError("`screenChangeThreshold` must be above 0 and at most 1.");
  const tol = checkTolerance(c.tolerance);
  if (tol) throw new ConfigError(tol);
  const sev = checkSeverities(c.checks);
  if (sev) throw new ConfigError(sev);
  const p = c.paymentUrls;
  if (p !== undefined && !(Array.isArray(p) && p.every((x) => typeof x === "string" || x instanceof RegExp))) {
    throw new ConfigError("`paymentUrls` must be a list of strings or regular expressions.");
  }
  return c;
}
