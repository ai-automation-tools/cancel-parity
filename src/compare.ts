// Compares a sign-up flow with a cancel flow, metric by metric. Pure: no
// Playwright, so a second runner can feed it later (ADR-001). The rules are
// written up in docs/parity.md. Every message here is evidence, never a
// verdict (ADR-002).

import { findingFailures } from "./checks.ts";
import type { FlowResult, Totals } from "./runner.ts";

export const METRICS = ["screens", "clicks", "typedFields", "dialogs"] as const;
export type Metric = (typeof METRICS)[number];

/** How many more of each metric cancel may take than sign-up. A metric left out isn't compared. */
export type Tolerance = Partial<Record<Metric, number>>;

export const DEFAULT_TOLERANCE: Tolerance = { screens: 0, clicks: 0 };

export interface CompareOptions {
  tolerance?: Tolerance;
  /**
   * Sign-up screens whose URL contains one of these strings, or matches one of
   * these patterns, are payment screens. When unset, a screen on another origin
   * than the flow's first screen is one.
   */
  paymentUrls?: (string | RegExp)[];
}

export interface MetricResult {
  metric: Metric;
  signup: number;
  cancel: number;
  /** null when the metric is reported but not compared. */
  tolerance: number | null;
  pass: boolean;
}

export interface Comparison {
  /**
   * True when both flows finished, cancel took no more than sign-up plus the
   * tolerance on every compared metric, and no check fired at "fail" on either flow.
   */
  pass: boolean;
  /** One line per reason it didn't pass, such as "cancel took 5 screens, sign-up took 3" or 'cancel screen 3: phone-only cancel: "..."'. */
  failures: string[];
  metrics: MetricResult[];
  signup: {
    /** Sign-up's totals with payment screens counted. These are the ones compared. */
    totals: Totals;
    withoutPayment: Totals;
    /** 1-based numbers of the sign-up screens counted as payment. */
    paymentScreens: number[];
  };
  cancel: { totals: Totals };
}

const NOUNS: Record<Metric, [string, string]> = {
  screens: ["screen", "screens"],
  clicks: ["click", "clicks"],
  typedFields: ["typed field", "typed fields"],
  dialogs: ["dialog", "dialogs"],
};

export function count(n: number, metric: Metric): string {
  return `${n} ${NOUNS[metric][n === 1 ? 0 : 1]}`;
}

/** "cancel took 6 screens, sign-up took 3", plus the tolerance when it isn't 0. */
export function describeMetric(m: MetricResult): string {
  const allowance = m.tolerance ? ` (tolerance ${m.tolerance})` : "";
  return `cancel took ${count(m.cancel, m.metric)}, sign-up took ${m.signup}${allowance}`;
}

function isPayment(url: string, first: string, patterns: (string | RegExp)[] | undefined): boolean {
  if (patterns) return patterns.some((p) => (typeof p === "string" ? url.includes(p) : p.test(url)));
  try {
    return new URL(url).origin !== new URL(first).origin;
  } catch {
    return false;
  }
}

function stopped(label: string, r: FlowResult): string | null {
  if (r.status === "ok") return null;
  if (r.status === "empty") return `the ${label} flow reached no screen`;
  return `the ${label} flow stopped before it finished (${r.status}: ${r.error ?? "no detail"})`;
}

export function compareFlows(signup: FlowResult, cancel: FlowResult, opts: CompareOptions = {}): Comparison {
  const tolerance = { ...DEFAULT_TOLERANCE, ...opts.tolerance };
  const first = signup.screens[0]?.url ?? "";
  const paymentScreens: number[] = [];
  const withoutPayment: Totals = { screens: 0, clicks: 0, typedFields: 0, dialogs: 0 };
  signup.screens.forEach((s, i) => {
    if (isPayment(s.url, first, opts.paymentUrls)) {
      paymentScreens.push(i + 1);
      return;
    }
    withoutPayment.screens++;
    withoutPayment.clicks += s.clicks;
    withoutPayment.typedFields += s.typedFields;
    withoutPayment.dialogs += s.dialogs;
  });

  const metrics = METRICS.map((metric): MetricResult => {
    const t = tolerance[metric];
    const a = signup.totals[metric];
    const b = cancel.totals[metric];
    return { metric, signup: a, cancel: b, tolerance: t ?? null, pass: t === undefined || b <= a + t };
  });

  const failures = [stopped("sign-up", signup), stopped("cancel", cancel)].filter((s): s is string => s !== null);
  for (const m of metrics) if (!m.pass) failures.push(describeMetric(m));
  failures.push(...findingFailures("sign-up", signup.screens), ...findingFailures("cancel", cancel.screens));

  return {
    pass: failures.length === 0,
    failures,
    metrics,
    signup: { totals: signup.totals, withoutPayment, paymentScreens },
    cancel: { totals: cancel.totals },
  };
}

/** Checks a tolerance from a config file. Returns an error message, or null when it's usable. */
export function checkTolerance(value: unknown): string | null {
  if (value === undefined) return null;
  if (!value || typeof value !== "object") return "`tolerance` must be an object such as { screens: 0, clicks: 1 }.";
  for (const [k, v] of Object.entries(value)) {
    if (!(METRICS as readonly string[]).includes(k)) return `\`tolerance\` has an unknown metric "${k}". Use ${METRICS.join(", ")}.`;
    if (!(typeof v === "number" && v >= 0)) return `\`tolerance.${k}\` must be a number, 0 or more.`;
  }
  return null;
}
