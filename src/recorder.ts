// Turns the raw events of one flow run into screens and counts. Pure: no
// Playwright and no DOM, so a second runner can feed it later (ADR-001).
// The rules are written up in docs/screens.md.

export interface Screen {
  /** Origin and path only: query strings and fragments can carry tokens. */
  url: string;
  clicks: number;
  typedFields: number;
  dialogs: number;
  /** Path relative to the output folder, or null if the screen was left before it could be captured. */
  screenshot: string | null;
}

/** Share of words that differ between two texts: 0 is identical, 1 shares nothing. */
export function changeRatio(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  const longest = Math.max(wa.length, wb.length);
  if (longest === 0) return 0;
  const counts = new Map<string, number>();
  for (const w of wa) counts.set(w, (counts.get(w) ?? 0) + 1);
  let shared = 0;
  for (const w of wb) {
    const n = counts.get(w) ?? 0;
    if (n > 0) {
      shared++;
      counts.set(w, n - 1);
    }
  }
  return 1 - shared / longest;
}

function words(s: string): string[] {
  return s.toLowerCase().split(/\s+/).filter(Boolean);
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

export class Recorder {
  readonly screens: Screen[] = [];
  private readonly threshold: number;
  private url = "";
  private baseline: string | null = null;
  /** A click, typed field, Enter key or dialog since the current screen began. */
  private acted = false;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  get current(): Screen | undefined {
    return this.screens.at(-1);
  }

  /** The main frame committed `url`. Returns true when that starts a new screen. */
  navigated(url: string): boolean {
    if (url === "about:blank" || url === this.url) return false;
    this.url = url;
    this.baseline = null;
    if (this.current && !this.acted) {
      // A redirect or a router updating the address after rendering: same screen.
      this.current.url = displayUrl(url);
      return false;
    }
    this.start(url);
    return true;
  }

  /** The main landmark's visible text changed. Returns true when that starts a new screen. */
  content(text: string): boolean {
    if (!this.current) return false;
    if (this.baseline === null || this.baseline.trim() === "") {
      this.baseline = text;
      return false;
    }
    if (changeRatio(this.baseline, text) < this.threshold) return false;
    this.baseline = text;
    if (!this.acted) return false; // content settling on its own, not a step the user took
    this.start(this.url);
    return true;
  }

  click(): void {
    this.act().clicks++;
  }

  typed(): void {
    this.act().typedFields++;
  }

  key(): void {
    this.act();
  }

  dialog(): void {
    this.act().dialogs++;
  }

  private act(): Screen {
    this.acted = true;
    // Events before the first screen (there shouldn't be any) land on a placeholder.
    return this.current ?? this.start("about:blank");
  }

  private start(url: string): Screen {
    const screen: Screen = { url: displayUrl(url), clicks: 0, typedFields: 0, dialogs: 0, screenshot: null };
    this.screens.push(screen);
    this.acted = false;
    return screen;
  }
}
