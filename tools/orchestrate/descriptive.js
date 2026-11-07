#!/usr/bin/env node
// Descriptive evaluation of one block of the main measurement from the raw
// run records, without tests (DECISIONS.md 5.14, 5.18). It complements
// evaluate.js and changes neither the tests nor the assessment of the
// hypotheses.
//
// Contents: distributions of the run values per variant and load level, the
// share of Redis in the CPU time split into base load and distribution, runs
// clearly above the others, zero differences and the method of the Wilcoxon
// test per test, the resolution of the connection setup time, the
// measurement operation, the skewness in the pilot and the front Nginx.
//
// Usage: node tools/orchestrate/descriptive.js [--block 1] [--prefix <prefix>] [--results results]
// Output: results/<timestamp>_block<n>-descriptive/block<n>-descriptive.md and .json

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { median, percentile, mean } from './stats.js';
import { matchCampaigns, testsFor } from './assessment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i === -1 ? fallback : args[i + 1]; };
const BLOCK = Number(opt('block', 1));
const RESULTS = path.resolve(REPO_ROOT, opt('results', 'results'));
const plan = JSON.parse(readFileSync(path.join(__dirname, 'plan.json'), 'utf-8'));
const MiB = 2 ** 20;
// Criterion for runs clearly above the others (part c), fixed here and named in the output.
const HIGH_MS = 1.0;

const dirs = readdirSync(RESULTS).filter((d) => statSync(path.join(RESULTS, d)).isDirectory()).sort();
const readJson = (file) => JSON.parse(readFileSync(file, 'utf-8'));
const loadRuns = (dir) => {
  const p = path.join(RESULTS, dir, 'runs');
  return existsSync(p) ? readdirSync(p).filter((f) => f.endsWith('.json') && !f.startsWith('.')).sort().map((f) => readJson(path.join(p, f))) : [];
};
const num = (v, d = 3) => (v == null || !Number.isFinite(v) ? '–' : v.toFixed(d));
const pct = (v, d = 1) => (v == null || !Number.isFinite(v) ? '–' : `${(v * 100).toFixed(d)} %`);
const sorted = (a) => [...a].filter((x) => x != null && Number.isFinite(x)).sort((x, y) => x - y);
const p = (values, q) => percentile(sorted(values), q);
const skewness = (a) => {
  const n = a.length; const m = a.reduce((s, x) => s + x, 0) / n;
  const m2 = a.reduce((s, x) => s + (x - m) ** 2, 0) / n; const m3 = a.reduce((s, x) => s + (x - m) ** 3, 0) / n;
  return m2 > 0 ? m3 / m2 ** 1.5 : null;
};

// Campaigns of the block. Trial runs carry a prefix (smoke-, probe…, check-)
// and the same phase and block, so only the plain names count.
const PREFIX = opt('prefix', '');
const NAME = new RegExp(`^${PREFIX}b${BLOCK}-c\\d{2}-(${plan.scenarios.join('|')})$`);
const campaigns = [];
for (const dir of dirs) {
  const file = path.join(RESULTS, dir, 'aggregate.json');
  if (!existsSync(file)) continue;
  const agg = readJson(file);
  if (agg.phase !== 'main' || (agg.block ?? 1) !== BLOCK || agg.aborted || !NAME.test(agg.name)) continue;
  const config = readJson(path.join(RESULTS, dir, 'campaign.json'));
  const [a, b] = config.configs.map((c) => (typeof c === 'string' ? c : c.name));
  campaigns.push({ dir, name: agg.name, agg, a, b, runs: loadRuns(dir) });
}
if (!campaigns.length) {
  console.error(`Keine Kampagnen von Block ${BLOCK} in ${RESULTS}`);
  process.exit(1);
}
const all = campaigns.flatMap((c) => c.runs.map((r) => ({ ...r, _c: c })));
const measured = all.filter((r) => !r.run.warmup);
const valid = measured.filter((r) => r.run.valid);
const levels = plan.scenarios;
const vusOf = Object.fromEntries(levels.map((s) => [s, plan.scenarioLoad[s].vus]));
const cells = [...new Set(valid.map((r) => r.run.cell))].sort();
const groups = (fn) => {
  const out = [];
  for (const cell of cells) for (const level of levels) {
    const rs = valid.filter((r) => r.run.cell === cell && r.run.scenario === level);
    if (rs.length) out.push(fn(cell, level, rs));
  }
  return out;
};

const lines = [`# Beschreibende Auswertung von Block ${BLOCK}`, ''];
const json = { block: BLOCK, generated_at: new Date().toISOString(), campaigns: campaigns.length };
lines.push(`Erzeugt am ${json.generated_at} mit \`tools/orchestrate/descriptive.js\` aus den Laufprotokollen. Nur beschreibend, ohne Tests. Tests und Bewertung der Hypothesen stehen in \`evaluation.md\`.`, '');
lines.push('Werte je Variante und Laststufe über alle gültigen gewerteten Läufe von Block ' + BLOCK + '. Eine Variante, die in mehreren Vergleichen vorkommt, geht mit allen ihren Läufen ein. Perzentile nach der Methode des nächsten Rangs wie in `stats.js`.', '');

// a) Distributions of the run values
lines.push('## a) Verteilung der Lauf-Werte', '');
const measures = [
  ['latency_mean_ms', 'Latenz, Mittel je Lauf (ms)', 1, 3],
  ['connect_mean_ms', 'Verbindungsaufbau, Mittel je Lauf (ms)', 1, 2],
  ['cpu_seconds_total', 'CPU-Zeit von Variante und Redis (s)', 1, 3],
  ['working_set_peak_bytes_total', 'Spitze des Working Sets von Variante und Redis (MiB)', 1 / MiB, 1],
];
json.distributions = {};
for (const [key, label, scale, d] of measures) {
  lines.push(`### ${label}`, '', '| Variante | Laststufe | Läufe | Median | Mittelwert | p95 | p99 |', '|---|---|---|---|---|---|---|');
  json.distributions[key] = groups((cell, level, rs) => {
    const v = rs.map((r) => r.measures[key] * scale);
    const row = { cell, level, n: v.length, median: median(v), mean: mean(v), p95: p(v, 95), p99: p(v, 99) };
    lines.push(`| ${cell} | ${level} | ${row.n} | ${num(row.median, d)} | ${num(row.mean, d)} | ${num(row.p95, d)} | ${num(row.p99, d)} |`);
    return row;
  });
  lines.push('');
}
lines.push('### Latenz innerhalb der Läufe (ms)', '', 'Median über die Läufe von Median, p95 und p99 der Events eines Laufs.', '', '| Variante | Laststufe | Läufe | Median | p95 | p99 |', '|---|---|---|---|---|---|');
json.within_run = groups((cell, level, rs) => {
  const row = { cell, level, n: rs.length, median: median(rs.map((r) => r.measures.latency_median_ms)), p95: median(rs.map((r) => r.measures.latency_p95_ms)), p99: median(rs.map((r) => r.measures.latency_p99_ms)) };
  lines.push(`| ${cell} | ${level} | ${row.n} | ${num(row.median, 1)} | ${num(row.p95, 1)} | ${num(row.p99, 1)} |`);
  return row;
});
lines.push('');

// b) Redis, base load and distribution
lines.push('## b) CPU-Zeit von Variante und Redis', '');
const idleFiles = readdirSync(RESULTS).filter((f) => f.endsWith('_redis-idle.json')).sort();
const idle = idleFiles.map((f) => ({ file: f, ...readJson(path.join(RESULTS, f)) }));
const newHc = idle.find((i) => i.healthcheck?.StartInterval) ?? null;
const oldHc = idle.find((i) => !i.healthcheck?.StartInterval) ?? null;
json.redis_idle = idle;
if (idle.length) {
  lines.push('Grundlast von Redis ohne Clients und ohne Ereignisquelle, gemessen auf dem Pi:', '', '| Datei | Healthcheck | Dauer (s) | CPU-Zeit der cgroup (ms) | davon redis-server (ms) | übrige Prozesse (ms) | laufende Container |', '|---|---|---|---|---|---|---|');
  for (const i of idle) {
    lines.push(`| ${i.file} | ${i.healthcheck?.StartInterval ? 'nur beim Start alle 2 s, danach stündlich' : 'alle 2 s'} | ${i.seconds} | ${i.cpu_ms_cgroup} | ${i.cpu_ms_redis_server} | ${i.cpu_ms_other} | ${i.running_containers} |`);
  }
  lines.push('', 'Der Prozesswert von `redis-server` hat eine Auflösung von 10 ms, deshalb kann „übrige Prozesse“ leicht negativ sein. Der Messung mit dem alten Healthcheck liefen weitere Container mit, ohne Clients und ohne Ereignisquelle.', '');
}
const baseRate = newHc ? newHc.cpu_ms_cgroup / 1000 / newHc.seconds : null; // CPU seconds per second
lines.push(`Geschätzte Grundlast je Lauf = Grundlast der cgroup mit neuem Healthcheck (${newHc ? `${newHc.cpu_ms_cgroup} ms in ${newHc.seconds} s` : 'nicht gemessen'}) mal Dauer des Laufs. Verteilung = CPU-Zeit von Redis minus diese Grundlast. Die Zerlegung nimmt an, dass die Grundlast gleich bleibt und sich zur Arbeit für die Verteilung addiert. Die Bewertung von H8 bleibt davon unberührt.`, '');
lines.push('| Variante | Laststufe | Läufe | CPU Variante (s) | CPU Redis (s) | Anteil Redis | Grundlast Redis (s) | Redis ohne Grundlast (s) | Anteil Redis ohne Grundlast |', '|---|---|---|---|---|---|---|---|---|');
json.redis = groups((cell, level, rs) => {
  const base = baseRate == null ? null : median(rs.map((r) => baseRate * r.resources.wall_seconds));
  const dist = baseRate == null ? null : median(rs.map((r) => r.measures.cpu_seconds_redis - baseRate * r.resources.wall_seconds));
  const shareDist = baseRate == null ? null : median(rs.map((r) => (r.measures.cpu_seconds_redis - baseRate * r.resources.wall_seconds) / r.measures.cpu_seconds_total));
  const row = { cell, level, n: rs.length, cpu_cell: median(rs.map((r) => r.measures.cpu_seconds)), cpu_redis: median(rs.map((r) => r.measures.cpu_seconds_redis)), share: median(rs.map((r) => r.measures.cpu_seconds_redis / r.measures.cpu_seconds_total)), base, redis_without_base: dist, share_without_base: shareDist };
  lines.push(`| ${cell} | ${level} | ${row.n} | ${num(row.cpu_cell)} | ${num(row.cpu_redis)} | ${pct(row.share)} | ${num(base)} | ${num(dist)} | ${pct(shareDist)} |`);
  return row;
});
lines.push('');

// c) Runs clearly above the others
lines.push('## c) Läufe deutlich über den übrigen', '');
lines.push(`Als auffällig gilt ein Lauf, dessen Latenz-Mittel mehr als ${HIGH_MS} ms über dem Median derselben Konfiguration in derselben Kampagne liegt. Zum Vergleich steht die Zahl nach dem Kriterium „mehr als 12 % über dem Median“, mit dem DECISIONS.md 5.14 den Befund beschrieben hat. Aufgeführt sind alle Konfigurationen mit mindestens einem solchen Lauf.`, '');
lines.push('| Kampagne | Variante | Position | Partner | Läufe | über +1 ms | über +12 % | Latenz übrige / auffällige (ms) | CPU Variante übrige / auffällige (s) | Laufnummern der auffälligen | Anteil in Drittel 1, 2, 3 |', '|---|---|---|---|---|---|---|---|---|---|---|');
json.high_runs = [];
const hint = [];
for (const c of campaigns) for (const [config, position, partner] of [[c.a, 'A', c.b], [c.b, 'B', c.a]]) {
  const rs = c.runs.filter((r) => !r.run.warmup && r.run.valid && r.run.config === config).sort((x, y) => x.run.run_index - y.run.run_index);
  if (!rs.length) continue;
  const med = median(rs.map((r) => r.measures.latency_mean_ms));
  const high = rs.filter((r) => r.measures.latency_mean_ms > med + HIGH_MS);
  const high12 = rs.filter((r) => r.measures.latency_mean_ms > med * 1.12).length;
  if (!high.length && !high12) continue;
  const rest = rs.filter((r) => !high.includes(r));
  const third = (r) => Math.min(2, Math.floor(((r.run.run_index - plan_warmup(c)) - 1) / (rs.length / 3)));
  const thirds = [0, 1, 2].map((t) => high.filter((r) => third(r) === t).length);
  const m = (set, k) => median(set.map((r) => (typeof k === 'function' ? k(r) : r.measures[k])));
  const row = {
    campaign: c.name, cell: rs[0].run.cell, level: rs[0].run.scenario, position, partner, runs: rs.length, high: high.length, high_12_percent: high12,
    latency_rest: m(rest, 'latency_mean_ms'), latency_high: high.length ? m(high, 'latency_mean_ms') : null,
    cpu_rest: m(rest, 'cpu_seconds'), cpu_high: high.length ? m(high, 'cpu_seconds') : null,
    run_indices: high.map((r) => r.run.run_index), thirds,
    first: high.length ? high[0].run.started_at : null, last: high.length ? high[high.length - 1].run.started_at : null,
  };
  if (high.length) {
    for (const [k, label, f] of [
      ['latency_p99_ms', 'p99 der Latenz (ms)'], ['latency_max_ms', 'Maximum der Latenz (ms)'], ['connect_mean_ms', 'Verbindungsaufbau (ms)'],
      ['working_set_peak_bytes', 'Working Set der Variante (MiB)', (r) => r.measures.working_set_peak_bytes / MiB],
      ['cpu_seconds_redis', 'CPU Redis (s)'], ['loadgen_cpu_util_avg', 'Auslastung Lastgenerator', (r) => r.measures.loadgen_cpu_util_avg * 100],
      ['temp', 'Temperatur des Pi (°C)', (r) => r.resources.host.temp_max_c], ['data_received_bytes_per_s', 'empfangene Bytes je s'],
    ]) row[`hint_${k}`] = [m(rest, f ?? k), m(high, f ?? k)];
    hint.push(row);
  }
  json.high_runs.push(row);
  lines.push(`| ${c.name} | ${row.cell} | ${position} | ${partner} | ${row.runs} | ${row.high} | ${row.high_12_percent} | ${num(row.latency_rest, 2)} / ${num(row.latency_high, 2)} | ${num(row.cpu_rest)} / ${num(row.cpu_high)} | ${row.run_indices.join(', ') || '–'} | ${thirds.join(', ')} |`);
}
lines.push('');
if (hint.length) {
  lines.push('Weitere Werte der Laufprotokolle, Median der übrigen gegenüber Median der auffälligen Läufe, je Konfiguration mit mindestens 5 auffälligen Läufen. Sie sind Hinweise, keine Ursache.', '');
  const keys = Object.keys(hint[0]).filter((k) => k.startsWith('hint_'));
  const labels = { hint_latency_p99_ms: 'p99 (ms)', hint_latency_max_ms: 'Max (ms)', hint_connect_mean_ms: 'Aufbau (ms)', hint_working_set_peak_bytes: 'Working Set (MiB)', hint_cpu_seconds_redis: 'CPU Redis (s)', hint_loadgen_cpu_util_avg: 'Lastgenerator (%)', hint_temp: 'Temperatur (°C)', hint_data_received_bytes_per_s: 'Bytes je s' };
  lines.push(`| Kampagne | Variante | ${keys.map((k) => labels[k]).join(' | ')} |`, `|---|---|${keys.map(() => '---').join('|')}|`);
  for (const h of hint.filter((x) => x.high >= 5)) lines.push(`| ${h.campaign} | ${h.cell} | ${keys.map((k) => `${num(h[k][0], 2)} / ${num(h[k][1], 2)}`).join(' | ')} |`);
  lines.push('', 'Den Zeitpunkt einzelner Events im Messfenster und die Zahl der Prozesse enthalten die Laufprotokolle nicht.', '');
}
function plan_warmup(c) { return c.agg.settings?.warmupRuns ?? 5; }

// d) Zero differences and test method
lines.push('## d) Paare mit Differenz null und Verfahren des Wilcoxon-Tests', '');
lines.push('Paare mit einer Differenz von genau null verwirft der Wilcoxon-Test (DECISIONS.md 5.8). Bis 50 verbleibende Paare ohne Bindungen gilt der exakte Test, sonst die Normalapproximation.', '');
const { found } = matchCampaigns(plan, campaigns.map((c) => c.agg));
lines.push('| Messgröße | Nr. | Laststufe | Paare | davon Differenz null | Verfahren |', '|---|---|---|---|---|---|');
json.zero_pairs = [];
for (const family of plan.families) {
  for (const t of testsFor(plan, found, family.measure, BLOCK)) {
    const r = t.result;
    const row = { measure: family.measure, comparison_id: t.comparison_id, scenario: t.scenario, pairs: r?.n_pairs ?? null, zero: r?.n_pairs_zero_diff ?? null, method: r?.wilcoxon?.method ?? null };
    json.zero_pairs.push(row);
    lines.push(`| ${row.measure} | ${row.comparison_id} | ${row.scenario} | ${row.pairs ?? '–'} | ${row.zero ?? '–'} | ${row.method ?? '–'} |`);
  }
}
lines.push('');

// e) Resolution of the connection setup time
lines.push('## e) Auflösung des Verbindungsaufbaus', '');
lines.push('`k6/lib/delivery.js` misst die Dauer jeder Verbindung als Differenz zweier Werte von `Date.now()`, also in ganzen Millisekunden. `connect_mean_ms` ist das Mittel über die Clients eines Laufs. Es kann deshalb nur Vielfache von 1 ms geteilt durch die Zahl der Clients annehmen. Der Median der Paardifferenzen liegt bei gerader Paarzahl zwischen zwei solchen Stufen und kann deshalb auch eine halbe Stufe betragen.', '');
lines.push('| Laststufe | Clients | kleinste Stufe (ms) | Läufe | davon Mittel mal Clients ganzzahlig |', '|---|---|---|---|---|');
json.connect_resolution = levels.map((level) => {
  const rs = valid.filter((r) => r.run.scenario === level);
  const vus = vusOf[level];
  const integral = rs.filter((r) => Math.abs(r.measures.connect_mean_ms * vus - Math.round(r.measures.connect_mean_ms * vus)) < 1e-6).length;
  lines.push(`| ${level} | ${vus} | ${num(1 / vus, 3)} | ${rs.length} | ${integral} |`);
  return { level, vus, step_ms: 1 / vus, runs: rs.length, integral };
});
lines.push('');

// f) Measurement operation
lines.push('## f) Messbetrieb', '');
const schedFile = readdirSync(RESULTS).filter((f) => f.endsWith(`_schedule_block${BLOCK}.jsonl`)).sort().at(-1);
const sched = schedFile ? readFileSync(path.join(RESULTS, schedFile), 'utf-8').trim().split(/\r?\n/).map((l) => JSON.parse(l)) : [];
const start = sched.find((e) => e.event === 'schedule_started')?.t ?? null;
const end = sched.find((e) => e.event === 'schedule_finished')?.t ?? null;
const reasons = {};
for (const r of measured.filter((x) => !x.run.valid)) reasons[r.run.invalid_reason] = (reasons[r.run.invalid_reason] ?? 0) + 1;
const temps = all.map((r) => r.resources.host.temp_max_c).filter((x) => x != null);
const throttled = [...new Set(all.flatMap((r) => [r.resources.host.throttled_start, r.resources.host.throttled_end]))];
const loadgen = measured.map((r) => r.measures.loadgen_cpu_util_avg).filter((x) => x != null);
const op = {
  campaigns: campaigns.length, runs: all.length, measured: measured.length, valid: valid.length, invalid_reasons: reasons,
  schedule_start: start, schedule_end: end, hours: start && end ? (Date.parse(end) - Date.parse(start)) / 3600e3 : null,
  temp_max_c: Math.max(...temps), throttled, loadgen_util_max: Math.max(...loadgen),
};
lines.push('| Größe | Wert |', '|---|---|');
lines.push(`| Kampagnen | ${op.campaigns} |`, `| Läufe insgesamt, mit Warm-up | ${op.runs} |`, `| gewertete Läufe | ${op.measured} |`, `| davon gültig | ${op.valid} |`);
lines.push(`| ungültige gewertete Läufe nach Grund | ${Object.keys(reasons).length ? Object.entries(reasons).map(([k, v]) => `${k} ${v}`).join(', ') : 'keine'} |`);
lines.push(`| Dauer laut Zeitplan | ${start ?? '–'} bis ${end ?? '–'}, ${num(op.hours, 1)} h |`);
lines.push(`| höchste Temperatur des Pi | ${num(op.temp_max_c, 2)} °C |`, `| Drosselstatus | ${throttled.join(', ')} |`, `| höchstes Mittel der Auslastung des Lastgenerators je gewertetem Lauf | ${pct(op.loadgen_util_max, 2)} |`, '');
const controls = dirs.filter((d) => /_control-node-minimal-sse$/.test(d) && start && end && d.slice(0, 19) >= start.slice(0, 19).replace(/:/g, '-') && d.slice(0, 19) <= end.slice(0, 19).replace(/:/g, '-'));
lines.push('Kontrollmessungen im Zeitraum des Zeitplans:', '', '| Kampagne | gültige Läufe | Haltezeit (s) | Clients | Median des Latenz-Mittels (ms) | Abweichung vom ersten Tag |', '|---|---|---|---|---|---|');
op.controls = [];
let first = null;
for (const d of controls) {
  const rs = loadRuns(d).filter((r) => !r.run.warmup && r.run.valid);
  if (!rs.length) continue;
  const med = median(rs.map((r) => r.measures.latency_mean_ms));
  first ??= med;
  op.controls.push({ dir: d, runs: rs.length, hold: rs[0].load.hold_seconds, vus: rs[0].load.vus, median: med, deviation: med / first - 1 });
  lines.push(`| ${d} | ${rs.length} | ${rs[0].load.hold_seconds} | ${rs[0].load.vus} | ${num(med)} | ${pct(med / first - 1)} |`);
}
lines.push('');
json.operation = op;

// g) Skewness in the pilot
lines.push('## g) Schiefe im Pilot', '');
lines.push('Nachgerechnet aus den Pilotkampagnen (`…_pilot-c<Vergleich>-<Laststufe>`) für die Begründung des Tests in DECISIONS.md 5.8. Schiefe als drittes standardisiertes Moment.', '');
const pilots = dirs.filter((d) => /_pilot-c\d\d-(baseline|medium|stress)$/.test(d) && !/check/.test(d));
lines.push('| Kampagne | Variante | Läufe | Schiefe der Lauf-Werte | Paare | Schiefe der Paardifferenzen |', '|---|---|---|---|---|---|');
const pilotRows = [];
for (const d of pilots) {
  const rs = loadRuns(d).filter((r) => !r.run.warmup);
  const cfg = readJson(path.join(RESULTS, d, 'campaign.json')).configs.map((c) => (typeof c === 'string' ? c : c.name));
  const by = (c) => Object.fromEntries(rs.filter((r) => r.run.config === c).map((r) => [r.run.run_index, r.measures.latency_mean_ms]));
  const A = by(cfg[0]); const B = by(cfg[1]);
  const diffs = Object.keys(A).filter((k) => k in B).map((k) => A[k] - B[k]);
  const sd = skewness(diffs);
  cfg.forEach((c, i) => {
    const v = Object.values(i === 0 ? A : B);
    const s = skewness(v);
    pilotRows.push({ campaign: d, config: c, runs: v.length, skewness: s, pairs: diffs.length, diff_skewness: sd });
    lines.push(`| ${d.split('_')[1]} | ${c} | ${v.length} | ${num(s, 2)} | ${i === 0 ? diffs.length : ''} | ${i === 0 ? num(sd, 2) : ''} |`);
  });
}
const runSkews = pilotRows.map((r) => r.skewness);
const diffSkews = [...new Map(pilotRows.map((r) => [r.campaign, r.diff_skewness])).values()];
lines.push('', `Zusammengefasst liegt der Betrag der Schiefe über 1 in ${runSkews.filter((s) => Math.abs(s) > 1).length} von ${runSkews.length} Fällen, Spanne ${num(Math.min(...runSkews), 2)} bis ${num(Math.max(...runSkews), 2)}. Betrag der Schiefe der Paardifferenzen höchstens 0,76 in ${diffSkews.filter((s) => Math.abs(s) <= 0.76).length} von ${diffSkews.length} Kampagnen, größter Betrag ${num(Math.max(...diffSkews.map(Math.abs)), 2)}.`, '');
lines.push('Ein Shapiro-Wilk-Test ist nicht enthalten. Die Werkzeuge haben dafür kein geprüftes Verfahren, und eine ungeprüfte eigene Umsetzung wäre kein belastbarer Beleg.', '');
json.pilot_skewness = pilotRows;

// h) Front Nginx
lines.push('## h) Front-Nginx, beschreibend', '');
lines.push('| Variante | Laststufe | Modus | Läufe | CPU-Zeit Nginx (s) | Spitze Working Set Nginx (MiB) |', '|---|---|---|---|---|---|');
json.nginx = groups((cell, level, rs) => {
  const row = { cell, level, mode: rs[0].load.front_mode, n: rs.length, cpu: median(rs.map((r) => r.measures.cpu_seconds_nginx)), ws: median(rs.map((r) => r.measures.working_set_peak_bytes_nginx / MiB)) };
  lines.push(`| ${cell} | ${level} | ${row.mode} | ${row.n} | ${num(row.cpu)} | ${num(row.ws, 1)} |`);
  return row;
});
lines.push('');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(RESULTS, `${stamp}_block${BLOCK}-descriptive`);
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, `block${BLOCK}-descriptive.md`), `${lines.join('\n')}\n`);
writeFileSync(path.join(outDir, `block${BLOCK}-descriptive.json`), `${JSON.stringify(json, null, 1)}\n`);
console.log(`Beschreibende Auswertung: results/${path.basename(outDir)}`);
