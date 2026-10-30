// The six per-screen checks. `scanPage` is plain DOM code with no Playwright in
// it: the runner runs it inside the page, and any runner can call it with
// `page.evaluate(scanPage)` (ADR-001). The rules are written up in
// docs/checks.md. Every message is evidence, never a verdict (ADR-002).

export const CHECKS = ["retention-offer", "guilt-copy", "phone-only", "pre-checked-keep", "buried-cancel", "countdown-timer"] as const;
export type CheckId = (typeof CHECKS)[number];

/** "fail" makes the run fail, "warn" reports only, "off" doesn't run the check. */
export type Severity = "fail" | "warn" | "off";
export type CheckSeverity = Partial<Record<CheckId, Severity>>;

export const DEFAULT_SEVERITY: Record<CheckId, Severity> = {
  "retention-offer": "warn",
  "guilt-copy": "warn",
  "phone-only": "fail",
  "pre-checked-keep": "warn",
  "buried-cancel": "warn",
  "countdown-timer": "warn",
};

export const CHECK_NAMES: Record<CheckId, string> = {
  "retention-offer": "retention offer",
  "guilt-copy": "guilt copy",
  "phone-only": "phone-only cancel",
  "pre-checked-keep": 'pre-checked "keep my plan" box',
  "buried-cancel": "cancel control at 11px or smaller",
  "countdown-timer": "countdown timer",
};

/** What the page shows: the check that fired and the text it fired on. */
export interface RawFinding {
  check: CheckId;
  evidence: string;
}

export interface Finding extends RawFinding {
  severity: "fail" | "warn";
}

/**
 * Runs the six checks on the current document and returns what fired, at most
 * once per check. Reads the page and never changes it. Self-contained, because
 * it is serialized into the page: it must not reference anything outside itself.
 */
export function scanPage(): RawFinding[] {
  const RETENTION = /\bwait!?[,\s]|before you (go|leave)|special offer|\b\d{1,3}%\s?off (your|the) next\b/i;
  const GUILT = /you('| wi)ll (lose|miss)|we('| wi)ll miss you|are you sure you want to (leave|cancel)/i;
  const PHONE = /call (our|us|the)?\s?(retention|support|customer service|team)\b|1[-.\s]?800[-.\s]?\d{3}[-.\s]?\d{4}/i;
  const CANCEL_LABEL = /cancel( my)?( membership| subscription| account| plan)?|end( my)?( subscription| membership)/i;
  const KEEP_LABEL = /\b(pause|keep|stay|downgrade)\b/i;
  const TIMER_MARKER = /countdown|timer|expires|offer-ends/i;

  const found = new Map<CheckId, string>();
  const add = (check: CheckId, text: string) => {
    if (!found.has(check)) found.set(check, text.replace(/\s+/g, " ").trim().slice(0, 160));
  };
  const text = (el: Element) => (el.textContent ?? "").trim();
  const controls = [...document.querySelectorAll("a, button, input[type=submit], input[type=button]")];
  const label = (el: Element) => (el instanceof HTMLInputElement && el.type !== "checkbox" ? el.value : text(el));

  // Retention offers, guilt copy and phone notices are ordinary text: read each leaf element once.
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length > 0 || el.closest("script, style, noscript, template")) continue;
    const t = text(el);
    if (t.length < 6) continue;
    if (RETENTION.test(t)) add("retention-offer", t);
    else if (GUILT.test(t)) add("guilt-copy", t);
    else if (PHONE.test(t)) add("phone-only", t);
  }
  // A phone number beside a way to cancel online is a choice, not phone-only.
  if (controls.some((el) => CANCEL_LABEL.test(label(el)))) found.delete("phone-only");

  // A "keep", "pause", "stay" or "downgrade" box the page ticked for the user.
  for (const box of document.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) {
    if (!box.checked) continue;
    const l = box.closest("label")?.textContent || (box.id && document.querySelector(`label[for="${CSS.escape(box.id)}"]`)?.textContent) || "";
    if (KEEP_LABEL.test(l)) add("pre-checked-keep", l);
  }

  // A cancel control that exists but is rendered small enough to miss.
  for (const el of controls) {
    const l = label(el).trim();
    if (CANCEL_LABEL.test(l) && (parseFloat(getComputedStyle(el).fontSize) || 16) <= 11) add("buried-cancel", l);
  }

  // A countdown, marked as one by its id or class, with a short text such as "09:59".
  for (const el of document.querySelectorAll("[id], [class]")) {
    const marker = `${el.id} ${typeof el.className === "string" ? el.className : ""}`;
    const t = text(el);
    if (TIMER_MARKER.test(marker) && t.length > 0 && t.length < 40) add("countdown-timer", t);
  }

  return [...found].map(([check, evidence]) => ({ check, evidence }));
}

/** The config's severity for a check, or its default. */
export function severityOf(check: CheckId, config: CheckSeverity | undefined): Severity {
  return config?.[check] ?? DEFAULT_SEVERITY[check];
}

/** Checks the `checks` setting from a config file. Returns an error message, or null when it's usable. */
export function checkSeverities(value: unknown): string | null {
  if (value === undefined) return null;
  if (!value || typeof value !== "object") return '`checks` must be an object such as { "guilt-copy": "fail" }.';
  for (const [k, v] of Object.entries(value)) {
    if (!(CHECKS as readonly string[]).includes(k)) return `\`checks\` has an unknown check "${k}". Use ${CHECKS.join(", ")}.`;
    if (v !== "fail" && v !== "warn" && v !== "off") return `\`checks.${k}\` must be "fail", "warn" or "off".`;
  }
  return null;
}

/** 'screen 3: phone-only cancel: "Call our retention team at 1-800-555-0100"' */
export function describeFinding(screen: number, f: Finding): string {
  return `screen ${screen}: ${CHECK_NAMES[f.check]}: "${f.evidence}"`;
}

/** One line per failing-severity finding on a flow's screens, such as 'cancel screen 3: phone-only cancel: "..."'. */
export function findingFailures(label: string, screens: { findings: Finding[] }[]): string[] {
  return screens.flatMap((s, i) => s.findings.filter((f) => f.severity === "fail").map((f) => `${label} ${describeFinding(i + 1, f)}`));
}
