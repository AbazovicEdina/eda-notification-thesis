// Checks the short trial run before an unattended run (second run of
// 2026-11-16). It confirms on the real machines that every correction of the
// second run takes effect, before two weeks of measurement depend on it.
// Every check prints one line, the exit code is 0 only if all pass.
//
// Usage:
//   node tools/orchestrate/smoke-check.js --prefix precheck- [--results results]

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const prefix = opt('prefix', 'precheck-');
const resultsDir = path.resolve(ROOT, opt('results', 'results'));

const results = [];
function report(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'ok    ' : 'FEHLER'}  ${name}${detail ? `  (${detail})` : ''}`);
}
const median = (values) => {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const readJson = (file) => JSON.parse(readFileSync(file, 'utf-8'));

// Expected values, see DECISIONS.md 5.5, 5.20 and the second run.
const LARAVEL_ENV = { APP_ENV: 'production', APP_DEBUG: 'false', SESSION_DRIVER: 'cookie', CACHE_STORE: 'file' };
const MAX_WALL_DIFF_S = 0.3; // SSE and WebSocket now close at the same event
const transportOf = (config) => (/-ws$/.test(config) ? 'ws' : 'sse');

const dirs = existsSync(resultsDir)
  ? readdirSync(resultsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.includes(`_${prefix}`))
    .map((d) => path.join(resultsDir, d.name))
  : [];
report(`Kampagnen des Probelaufs gefunden (${prefix})`, dirs.length > 0, `${dirs.length}`);
const wallByComparison = new Map();

for (const dir of dirs.sort()) {
  const name = path.basename(dir).slice(path.basename(dir).indexOf('_') + 1);
  const aggFile = path.join(dir, 'aggregate.json');
  if (!existsSync(aggFile)) { report(`${name}: abgeschlossen`, false, 'aggregate.json fehlt'); continue; }
  const agg = readJson(aggFile);
  report(`${name}: abgeschlossen`, !agg.aborted && Boolean(agg.finished_at), agg.aborted ? 'abgebrochen' : '');

  const events = readFileSync(path.join(dir, 'campaign.log.jsonl'), 'utf-8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const started = events.find((e) => e.event === 'campaign_started') ?? {};
  const runFiles = readdirSync(path.join(dir, 'runs')).filter((f) => f.endsWith('.json'));
  const runs = runFiles.map((f) => readJson(path.join(dir, 'runs', f)));
  const configs = [...new Set(runs.map((r) => r.run.config))];

  const invalid = runs.filter((r) => !r.run.valid);
  report(`${name}: alle Läufe gültig`, invalid.length === 0, invalid.length ? `${invalid.length} ungültig: ${[...new Set(invalid.map((r) => r.run.invalid_reason))].join(', ')}` : `${runs.length} Läufe`);

  if (configs.length === 2) {
    report(`${name}: Reihenfolge wechselt ab`, started.alternate_order === true);
    // In every even run number the second configuration has to start first.
    const byIndex = new Map();
    for (const r of runs) byIndex.set(`${r.run.scenario}#${r.run.run_index}`, [...(byIndex.get(`${r.run.scenario}#${r.run.run_index}`) ?? []), r]);
    let wrong = 0;
    let checked = 0;
    for (const [key, pair] of byIndex) {
      if (pair.length !== 2) continue;
      const index = Number(key.split('#')[1]);
      const first = [...pair].sort((a, b) => Date.parse(a.run.started_at) - Date.parse(b.run.started_at))[0].run.config;
      const expected = index % 2 === 0 ? configs.find((c) => c !== started.configs?.[0]) : started.configs?.[0];
      checked++;
      if (first !== expected) wrong++;
    }
    report(`${name}: Reihenfolge in den Läufen tatsächlich abwechselnd`, checked > 0 && wrong === 0, `${checked - wrong} von ${checked} Paaren`);
  }

  // Laravel settings, logged per container since the second run.
  const laravel = runs.flatMap((r) => Object.entries(r.context?.containers ?? {}))
    .filter(([container]) => container.startsWith('php-laravel'));
  if (laravel.length) {
    const deviations = new Set();
    for (const [container, info] of laravel) {
      for (const [key, expected] of Object.entries(LARAVEL_ENV)) {
        const value = info.runtime_env?.[key];
        if (value !== expected) deviations.add(`${container} ${key}=${value ?? 'nicht protokolliert'}`);
      }
    }
    report(`${name}: Laravel im Produktionsbetrieb mit Cookie-Session und Datei-Cache`, deviations.size === 0, [...deviations].slice(0, 3).join(', '));
  }

  const measured = runs.filter((r) => !r.run.warmup && r.run.valid);
  const badLatency = measured.filter((r) => !(r.measures?.latency_mean_ms > 0 && r.measures.latency_mean_ms < 1000));
  report(`${name}: Latenz plausibel (über 0 und unter 1 s)`, measured.length > 0 && badLatency.length === 0, badLatency.length ? `${badLatency.length} auffällig` : '');
  // The set rate of each run, because a saturation campaign has one rate per level.
  const badSource = measured.filter((r) => !(Math.abs(r.measures?.source_rate_eps / (r.load?.event_rate_nominal_per_s ?? 1) - 1) <= 0.02));
  report(`${name}: Senderate der Quelle hält die eingestellte Rate`, measured.length > 0 && badSource.length === 0, badSource.length ? `${badSource.length} abweichend` : '');

  // SSE against WebSocket, collected over all load levels of a comparison
  // (see below), because the time to the next event varies by 0 to 1 s per run.
  if (new Set(configs.map(transportOf)).size === 2) {
    const key = name.replace(/-(baseline|medium|stress)$/, '');
    const entry = wallByComparison.get(key) ?? { sse: [], ws: [] };
    for (const r of runs.filter((x) => x.run.valid)) entry[transportOf(r.run.config)].push(r.resources?.wall_seconds);
    wallByComparison.set(key, entry);
  }
}

// SSE against WebSocket: same run length, since both close at the first event
// after the measurement window. In the first run, SSE ran about 0.4 s longer.
for (const [key, wall] of wallByComparison) {
  const sse = median(wall.sse);
  const ws = median(wall.ws);
  report(`${key}: SSE und WebSocket gleich lang gemessen (Unterschied der Mediane unter ${MAX_WALL_DIFF_S} s)`,
    Math.abs(sse - ws) < MAX_WALL_DIFF_S, `SSE ${sse?.toFixed(2)} s, WebSocket ${ws?.toFixed(2)} s, je ${wall.sse.length} und ${wall.ws.length} Läufe`);
}

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n${failed.length} von ${results.length} Prüfungen nicht bestanden.` : `\nAlle ${results.length} Prüfungen bestanden.`);
process.exit(failed.length ? 1 : 0);
