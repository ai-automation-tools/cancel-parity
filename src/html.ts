// Renders a ParityReport as one self-contained HTML file: styles inline,
// screenshots embedded as data URIs, no scripts and no network. Pure: the
// caller reads the screenshots. Every word is evidence, never a verdict
// (ADR-002); the claims-boundary text comes from the report itself.

import { CHECK_NAMES } from "./checks.ts";
import { count, describeMetric, METRICS, type Metric } from "./compare.ts";
import type { ParityReport } from "./parity.ts";
import type { FlowResult } from "./runner.ts";

const LABELS: Record<Metric, string> = { screens: "Screens", clicks: "Clicks", typedFields: "Typed fields", dialogs: "Dialogs" };

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function banner(r: ParityReport): string {
  const c = r.comparison;
  if (!c) return `<section class="banner none"><h2>No comparison</h2><p>Name one flow <code>signup</code> and one <code>cancel</code> in the config to compare them.</p></section>`;
  if (c.pass) {
    const lines = c.metrics.filter((m) => m.tolerance !== null).map((m) => `<li>${esc(describeMetric(m))}</li>`);
    return `<section class="banner pass"><h2>Parity holds: cancel is within tolerance of sign-up</h2><ul>${lines.join("")}</ul></section>`;
  }
  return `<section class="banner fail"><h2>Parity fails</h2><ul>${c.failures.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></section>`;
}

function metricsTable(r: ParityReport): string {
  const c = r.comparison;
  if (!c) return "";
  const pay = c.signup.paymentScreens.length > 0;
  const rows = c.metrics.map((m) => {
    const result = m.tolerance === null ? "reported only" : m.pass ? "within tolerance" : "over tolerance";
    return `<tr><th scope="row">${LABELS[m.metric]}</th><td>${m.signup}</td>${pay ? `<td>${c.signup.withoutPayment[m.metric]}</td>` : ""}<td>${m.cancel}</td><td>${m.tolerance ?? "not compared"}</td><td class="${m.tolerance !== null && !m.pass ? "bad" : ""}">${result}</td></tr>`;
  });
  return `<section><h2>Metrics side by side</h2>
<table><thead><tr><th scope="col">Metric</th><th scope="col">Sign-up</th>${pay ? '<th scope="col">Sign-up without payment</th>' : ""}<th scope="col">Cancel</th><th scope="col">Tolerance</th><th scope="col">Result</th></tr></thead>
<tbody>${rows.join("")}</tbody></table>
${pay ? `<p>Sign-up screens counted as payment: ${c.signup.paymentScreens.join(", ")}. The comparison counts them.</p>` : ""}</section>`;
}

function coverage(r: ParityReport): string {
  const flows = Object.entries(r.flows).map(([name, f]) => {
    const why = f.status === "ok" ? "finished" : f.status === "empty" ? "reached no screen" : `stopped (${f.status}: ${f.error ?? "no detail"}), so later screens weren't seen`;
    return `<li><strong>${esc(name)}</strong>: ${esc(why)}; ${f.totals.screens} ${f.totals.screens === 1 ? "screen" : "screens"} recorded</li>`;
  });
  const unshot = Object.entries(r.flows).flatMap(([name, f]) =>
    f.screens.flatMap((s, i) => (s.screenshot === null ? [`${name} screen ${i + 1}`] : [])),
  );
  const gaps = [
    "Steps outside the browser: emails, phone calls, chat, and anything the flow functions didn't do.",
    "Content inside frames: clicks and typing there are counted, but the six checks read only the top-level page.",
    `Other screen sizes: every flow ran at ${r.viewport.width}×${r.viewport.height}; a phone layout may differ.`,
    "What was typed: field values are never recorded, and inputs that hide what is typed are painted over in screenshots.",
  ];
  if (unshot.length) gaps.push(`Screens left before a screenshot could be taken: ${unshot.join(", ")}.`);
  return `<section><h2>Coverage</h2>
<h3>Flows run</h3><ul>${flows.join("")}</ul>
<h3>Viewport</h3><p>${r.viewport.width}×${r.viewport.height}, Chromium.</p>
<h3>What wasn't observable</h3><ul>${gaps.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></section>`;
}

function flowSection(name: string, f: FlowResult, payment: number[], image: (rel: string) => string | null): string {
  const totals = METRICS.map((m) => count(f.totals[m], m)).join(", ");
  const screens = f.screens.map((s, i) => {
    const n = i + 1;
    const findings = s.findings.length
      ? `<ul class="findings">${s.findings.map((x) => `<li class="${x.severity}"><span class="sev">${x.severity}</span> ${esc(CHECK_NAMES[x.check])}: “${esc(x.evidence)}”</li>`).join("")}</ul>`
      : `<p class="quiet">No check fired on this screen.</p>`;
    const src = s.screenshot === null ? null : image(s.screenshot);
    const shot = src
      ? `<img src="${src}" alt="Screenshot of ${esc(name)} screen ${n}, ${esc(s.url)}" loading="lazy">`
      : `<p class="quiet">No screenshot: the flow left this screen before one could be taken.</p>`;
    return `<li class="screen"><h4>Screen ${n}${payment.includes(n) ? " (payment)" : ""}</h4>
<p class="url">${esc(s.url)}</p>
<p>${count(s.clicks, "clicks")}, ${count(s.typedFields, "typedFields")}, ${count(s.dialogs, "dialogs")}</p>
${findings}${shot}</li>`;
  });
  const status = f.status === "ok" ? "" : `<p class="bad">This flow ${f.status === "empty" ? "reached no screen" : `stopped: ${esc(f.status)} (${esc(f.error ?? "no detail")})`}.</p>`;
  return `<section><h3>${esc(name)}</h3><p>${totals}</p>${status}<ol class="screens">${screens.join("")}</ol></section>`;
}

const CSS = `
:root{color-scheme:light;--fg:#18181b;--mid:#3f3f46;--line:#d4d4d8;--pass:#166534;--pass-bg:#dcfce7;--fail:#991b1b;--fail-bg:#fee2e2;--warn:#854d0e;--warn-bg:#fef9c3}
*{box-sizing:border-box}
body{margin:0 auto;max-width:1100px;padding:24px 20px 48px;color:var(--fg);background:#fff;font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
h1{font-size:26px;margin:0 0 4px}h2{font-size:20px;margin:32px 0 8px}h3{font-size:17px;margin:20px 0 6px}h4{margin:0 0 4px}
.meta,.quiet,.url{color:var(--mid)}.url{font-family:ui-monospace,monospace;font-size:13px;word-break:break-all}
.notice{border-left:4px solid var(--mid);background:#f4f4f5;padding:10px 14px}
.banner{border-radius:8px;padding:12px 18px;margin-top:20px}.banner h2{margin:0 0 6px}
.pass{background:var(--pass-bg);color:var(--pass)}.fail,.banner.fail{background:var(--fail-bg);color:var(--fail)}.none{background:#f4f4f5}
table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--line);padding:6px 10px;text-align:left}
td.bad,p.bad{color:var(--fail);font-weight:600}
.screens{padding-left:0;list-style:none}.screen{border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin:12px 0}
.screen img{display:block;width:100%;height:auto;border:1px solid var(--line);margin-top:8px}
.findings{padding-left:0;list-style:none}.findings li{padding:4px 8px;border-radius:4px;margin:4px 0}
li.warn{background:var(--warn-bg);color:var(--warn)}li.fail{background:var(--fail-bg);color:var(--fail)}
.sev{font-weight:700;text-transform:uppercase;font-size:12px;margin-right:4px}
`;

/**
 * The report as a complete HTML document. `image` turns a screenshot path from
 * the report into an embeddable URL (a data URI), or null to leave it out.
 */
export function renderHtml(r: ParityReport, image: (rel: string) => string | null, title = "cancel-parity report"): string {
  const payment = r.comparison?.signup.paymentScreens ?? [];
  const flows = Object.entries(r.flows).map(([name, f]) => flowSection(name, f, name === "signup" ? payment : [], image));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<header>
<h1>${esc(title)}</h1>
<p class="meta">cancel-parity ${esc(r.version)} · ${Object.keys(r.flows).length} flows · ${r.viewport.width}×${r.viewport.height}</p>
<p class="notice">${esc(r.notice)}</p>
</header>
<main>
${banner(r)}
${metricsTable(r)}
<section><h2>Flows, screen by screen</h2>${flows.join("\n")}</section>
${coverage(r)}
</main>
</body>
</html>
`;
}
