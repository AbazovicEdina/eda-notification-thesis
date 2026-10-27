#!/usr/bin/env node
// Beschreibende Auswertung der Skalierungsreihe, des Sättigungstests und des
// Ansturms über alle Zellen (DECISIONS.md 5.9, 5.10, 5.17, 5.23). Je Zelle: die
// Stufen mit bedienten Clients, Verbindungsaufbau, Latenz, CPU und Speicher
// bzw. mit Zustellquote und p95-Latenz, dazu Kapazitätsgrenze und höchste
// nachhaltige Event-Rate, beim Ansturm rechtzeitig verbundene und bediente
// Clients, Speicherspitze laut Kernel und Gründe ungültiger Läufe. Zusätzlich
// stehen SSE und WebSocket je Sprache und Variante nebeneinander (Hypothesen
// H4 und H11). Keine Signifikanztests: Jede Zelle wird in einer eigenen
// Kampagne gemessen, die Werte sind nicht gepaart.
//
// Aufruf: node tools/orchestrate/series.js <kampagnen-verzeichnis>... [--include-aborted]
// Ergebnis: results/<zeitstempel>_series/series.json und series.md

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'results');

const args = process.argv.slice(2);
const includeAborted = args.includes('--include-aborted');
const dirs = args.filter((a) => !a.startsWith('--'));
if (dirs.length === 0) {
  console.error('Aufruf: node tools/orchestrate/series.js <kampagnen-verzeichnis>... [--include-aborted]');
  process.exit(1);
}

const notes = [];
const series = { scaling: {}, saturation: {}, storm: {} };
const duplicates = [];

for (const dir of dirs) {
  const file = path.join(path.resolve(dir), 'aggregate.json');
  if (!existsSync(file)) {
    notes.push(`${dir}: keine aggregate.json, übersprungen`);
    continue;
  }
  const agg = JSON.parse(readFileSync(file, 'utf-8'));
  if (!['scaling', 'saturation', 'storm'].includes(agg.phase)) {
    notes.push(`${agg.campaign_dir}: Phase "${agg.phase}", nicht Teil dieser Auswertung`);
    continue;
  }
  if (agg.aborted && !includeAborted) {
    notes.push(`${agg.campaign_dir}: abgebrochen (${agg.abort_reason}), übersprungen (--include-aborted zum Einbeziehen)`);
    continue;
  }
  const summary = agg[agg.phase];
  if (!summary) {
    notes.push(`${agg.campaign_dir}: keine vollständige Stufe, übersprungen`);
    continue;
  }
  for (const [configName, entry] of Object.entries(summary.configs)) {
    const cell = agg.configs.find((c) => c.name === configName)?.cell ?? configName;
    const target = series[agg.phase];
    if (target[cell]) duplicates.push(`${agg.phase} ${cell}: ${target[cell].campaign} und ${agg.campaign_dir}`);
    // Beim Ansturm ist der Eintrag eine Liste von Stufen (stormSummary in run.js).
    target[cell] = Array.isArray(entry)
      ? { campaign: agg.campaign_dir, config: configName, steps: entry }
      : { campaign: agg.campaign_dir, config: configName, criteria: summary.criteria, ...entry };
  }
}
if (duplicates.length) {
  console.error('Mehrfach gemessene Zellen. Eindeutig festlegen, welche Kampagne zählt:');
  for (const d of duplicates) console.error(`  ${d}`);
  process.exit(1);
}

// SSE- und WebSocket-Zelle derselben Sprache und Variante (ohne Queue-Zellen,
// zu denen es keine WebSocket-Entsprechung gibt).
const transportPairs = [...new Set(Object.keys({ ...series.scaling, ...series.saturation })
  .filter((c) => /-(sse|ws)$/.test(c))
  .map((c) => c.replace(/-(sse|ws)$/, '')))]
  .sort()
  .map((base) => ({ base, sse: `${base}-sse`, ws: `${base}-ws` }));

const transport = transportPairs.map(({ base, sse, ws }) => {
  const sc = { sse: series.scaling[sse], ws: series.scaling[ws] };
  const sa = { sse: series.saturation[sse], ws: series.saturation[ws] };
  const clients = [...new Set([...(sc.sse?.steps ?? []), ...(sc.ws?.steps ?? [])].map((s) => s.clients))].sort((a, b) => a - b);
  const stepOf = (x, n) => x?.steps.find((s) => s.clients === n) ?? null;
  return {
    variant: base,
    scaling: clients.map((n) => ({ clients: n, sse: stepOf(sc.sse, n), ws: stepOf(sc.ws, n) })),
    scaling_limit: { sse: sc.sse?.first_clients_below_criterion ?? null, ws: sc.ws?.first_clients_below_criterion ?? null },
    max_sustainable_rate_per_s: { sse: sa.sse?.max_sustainable_rate_per_s ?? null, ws: sa.ws?.max_sustainable_rate_per_s ?? null },
    measured: {
      scaling: { sse: Boolean(sc.sse), ws: Boolean(sc.ws) },
      saturation: { sse: Boolean(sa.sse), ws: Boolean(sa.ws) },
    },
  };
});

const generatedAt = new Date();
const outDir = path.join(RESULTS_DIR, `${generatedAt.toISOString().replace(/[:.]/g, '-')}_series`);
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'series.json'), JSON.stringify({
  schema: 'eda-thesis/series/1',
  generated_at: generatedAt.toISOString(),
  notes,
  scaling: series.scaling,
  saturation: series.saturation,
  storm: series.storm,
  transport,
}, null, 2));

// Markdown mit Dezimalpunkt (die Arbeit wird auf Englisch verfasst).
const num = (v, digits = 1) => (v == null || Number.isNaN(v) ? '–' : Number(v).toFixed(digits));
const pct = (v) => (v == null ? '–' : `${(100 * v).toFixed(1)} %`);
const mib = (v) => (v == null ? '–' : (v / 2 ** 20).toFixed(0));
const lines = [
  '# Skalierungsreihe und Sättigungstest',
  '',
  `Erzeugt: ${generatedAt.toISOString()}. Beschreibende Auswertung ohne Signifikanztests. Jeder Wert ist der Median über die gültigen Läufe einer Stufe.`,
  '',
];

const scalingCells = Object.keys(series.scaling).sort();
if (scalingCells.length) {
  lines.push('## Skalierungsreihe', '');
  const crit = series.scaling[scalingCells[0]].criteria;
  lines.push(`Kapazitätsgrenze: kleinste Clientzahl, bei der im Median weniger als ${pct(crit?.minServedRatio)} der Clients bedient werden.`, '');
  lines.push('| Zelle | Kapazitätsgrenze (Clients) | Kampagne |', '|---|---|---|');
  for (const cell of scalingCells) {
    const s = series.scaling[cell];
    lines.push(`| ${cell} | ${s.first_clients_below_criterion ?? 'nicht erreicht'} | ${s.campaign} |`);
  }
  lines.push('');
  for (const cell of scalingCells) {
    lines.push(`### ${cell}`, '');
    lines.push('| Clients | bedient | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Latenz p95 (ms) | CPU (Kerne) | Working Set gesamt (MiB) |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const st of series.scaling[cell].steps) {
      lines.push(`| ${st.clients} | ${pct(st.served_ratio_median)} | ${num(st.connect_mean_median_ms)} | ${num(st.latency_mean_median_ms, 2)} | ${num(st.latency_p95_median_ms)} | ${num(st.cpu_cores_avg_median, 2)} | ${mib(st.working_set_peak_total_median_bytes)} |`);
    }
    lines.push('');
  }
}

const saturationCells = Object.keys(series.saturation).sort();
if (saturationCells.length) {
  lines.push('## Sättigungstest', '');
  const crit = series.saturation[saturationCells[0]].criteria;
  lines.push(`Nachhaltig ist eine Rate, wenn im Median mindestens ${pct(crit?.minDeliveryRatio)} der Events zugestellt werden und die p95-Latenz höchstens ${crit?.maxP95LatencyMs} ms beträgt, auf dieser und allen niedrigeren Stufen.`, '');
  lines.push('| Zelle | höchste nachhaltige Rate (Events/s) | Kampagne |', '|---|---|---|');
  for (const cell of saturationCells) {
    const s = series.saturation[cell];
    lines.push(`| ${cell} | ${s.max_sustainable_rate_per_s ?? 'keine'} | ${s.campaign} |`);
  }
  lines.push('');
  for (const cell of saturationCells) {
    lines.push(`### ${cell}`, '');
    lines.push('| Rate (Events/s) | Zustellung | Latenz p95 (ms) | CPU (Kerne) | nachhaltig |');
    lines.push('|---|---|---|---|---|');
    for (const st of series.saturation[cell].steps) {
      lines.push(`| ${st.rate_per_s} | ${pct(st.delivery_ratio_median)} | ${num(st.latency_p95_median_ms)} | ${num(st.cpu_cores_avg_median, 2)} | ${st.pass ? 'ja' : 'nein'} |`);
    }
    lines.push('');
  }
}

const stormCells = Object.keys(series.storm).sort();
if (stormCells.length) {
  lines.push('## Ansturm', '');
  lines.push('Alle Clients verbinden sich im selben Moment, etwa nach einem Neustart des Servers. Jede Zelle wird einzeln gemessen. Die Speicherspitze laut Kernel ist der größte Höchstwert über die Läufe, als Summe über die Container der Zelle.', '');
  lines.push('| Zelle | Clients | gültig | rechtzeitig verbunden | bedient (Median, Minimum) | Verbindungsaufbau (ms) | Latenz Mittel (ms) | Speicherspitze laut Kernel (MiB) | Gründe ungültiger Läufe |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const cell of stormCells) {
    for (const st of series.storm[cell].steps) {
      const reasons = Object.entries(st.invalid_reasons ?? {}).map(([r, n]) => `${r} (${n})`).join(', ') || '–';
      lines.push(`| ${cell} | ${st.clients} | ${st.runs_valid}/${st.runs} | ${pct(st.connected_ratio_median)} | ${pct(st.served_ratio_median)}, ${pct(st.served_ratio_min)} | `
        + `${num(st.connect_mean_median_ms)} | ${num(st.latency_mean_median_ms, 2)} | ${mib(st.mem_peak_kernel_max_bytes)} | ${reasons} |`);
    }
  }
  lines.push('');
}

if (transport.length) {
  lines.push('## SSE und WebSocket im Vergleich', '');
  lines.push('Gleiche Sprache und Variante, unterschiedlicher Transport. Beschreibend, da die Zellen in getrennten Kampagnen gemessen werden. Gepaarte Tests zum Transport enthalten nur die Vergleiche 12 und 13 der Hauptmessung (evaluation.md).', '');
  lines.push('| Variante | Kapazitätsgrenze SSE | Kapazitätsgrenze WS | höchste Rate SSE (Events/s) | höchste Rate WS (Events/s) |');
  lines.push('|---|---|---|---|---|');
  // „–" = nicht gemessen; „nicht erreicht" bzw. „keine" = gemessen, Kriterium nie bzw. schon auf der ersten Stufe verfehlt.
  const val = (v, measured, none) => (measured ? (v ?? none) : '–');
  for (const t of transport) {
    const { scaling: ms, saturation: mr } = t.measured;
    lines.push(`| ${t.variant} | ${val(t.scaling_limit.sse, ms.sse, 'nicht erreicht')} | ${val(t.scaling_limit.ws, ms.ws, 'nicht erreicht')} | `
      + `${val(t.max_sustainable_rate_per_s.sse, mr.sse, 'keine')} | ${val(t.max_sustainable_rate_per_s.ws, mr.ws, 'keine')} |`);
  }
  lines.push('', '„–" bedeutet: nicht gemessen.', '');
  for (const t of transport.filter((x) => x.measured.scaling.sse && x.measured.scaling.ws)) {
    lines.push(`### ${t.variant}: SSE gegen WS je Clientzahl`, '');
    lines.push('| Clients | bedient SSE | bedient WS | Latenz SSE (ms) | Latenz WS (ms) | Working Set SSE (MiB) | Working Set WS (MiB) |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const r of t.scaling) {
      lines.push(`| ${r.clients} | ${pct(r.sse?.served_ratio_median)} | ${pct(r.ws?.served_ratio_median)} | ${num(r.sse?.latency_mean_median_ms, 2)} | ${num(r.ws?.latency_mean_median_ms, 2)} | ${mib(r.sse?.working_set_peak_total_median_bytes)} | ${mib(r.ws?.working_set_peak_total_median_bytes)} |`);
    }
    lines.push('');
  }
}

if (notes.length) lines.push('## Hinweise', '', ...notes.map((n) => `- ${n}`), '');
writeFileSync(path.join(outDir, 'series.md'), lines.join('\n'));

console.log(`Skalierung und Sättigung: ${path.relative(REPO_ROOT, outDir)}`);
const complete = (m) => m.sse && m.ws;
console.log(`  Skalierung: ${scalingCells.length} Zellen, Sättigung: ${saturationCells.length} Zellen, Ansturm: ${stormCells.length} Zellen, vollständige SSE/WS-Paare: `
  + `${transport.filter((t) => complete(t.measured.scaling)).length} (Skalierung), ${transport.filter((t) => complete(t.measured.saturation)).length} (Sättigung)`);
for (const n of notes) console.log(`  Hinweis: ${n}`);
