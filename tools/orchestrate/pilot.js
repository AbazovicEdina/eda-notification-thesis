#!/usr/bin/env node
// Evaluation of the pilot (DECISIONS.md 5.9). Applies the stability
// criterion fixed in advance to the interim reports that run.js writes
// every reportEvery runs into aggregate.json, and derives the number of
// repetitions per load level for blocks 1 and 2.
//
// Criterion: a comparison counts as stable from a step on if, from that step
// to the end of the pilot, the sign and the effect class of Cliff's delta no
// longer change and the width of the confidence interval decreases by less
// than 10 % with every further step. At least one later step must confirm
// this. The number of repetitions of a load level is the largest stable step
// over all comparisons, at least minPairs. If a comparison does not become
// stable within the pilot, this is reported instead of extrapolated.
//
// Usage: node tools/orchestrate/pilot.js <campaign-directory>... [--runs baseline=90,medium=90,stress=90]
// Output: results/<timestamp>_pilot/pilot.json and pilot.md
// --runs only adds an estimate of the duration of one block for these counts.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'results');
const plan = JSON.parse(readFileSync(path.join(__dirname, 'plan.json'), 'utf-8'));

const WIDTH_THRESHOLD = 0.10;
const MIN_PAIRS = 20;
const WARMUP_RUNS = 5;

const args = process.argv.slice(2);
const runsArg = args.includes('--runs') ? args[args.indexOf('--runs') + 1] : null;
const dirs = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--runs');
if (dirs.length === 0) {
  console.error('Aufruf: node tools/orchestrate/pilot.js <kampagnen-verzeichnis>... [--runs baseline=90,medium=90,stress=90]');
  process.exit(1);
}

const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

// Returns the first stable step and, if there is none, what failed last.
function stability(steps) {
  for (let k = 0; k < steps.length - 1; k++) {
    let ok = true;
    for (let j = k + 1; j < steps.length && ok; j++) {
      if (sign(steps[j].cliffs_delta) !== sign(steps[k].cliffs_delta)) ok = false;
      if (steps[j].cliffs_magnitude !== steps[k].cliffs_magnitude) ok = false;
      const prev = steps[j - 1].ci_width_ms;
      if (prev > 0 && (prev - steps[j].ci_width_ms) / prev >= WIDTH_THRESHOLD) ok = false;
    }
    if (ok) return { stable_from: steps[k].n_pairs, reason: null };
  }
  // Which condition still fails between the last two steps
  const reasons = [];
  if (steps.length >= 2) {
    const [a, b] = steps.slice(-2);
    if (sign(a.cliffs_delta) !== sign(b.cliffs_delta)) reasons.push('Vorzeichen von δ wechselt');
    if (a.cliffs_magnitude !== b.cliffs_magnitude) reasons.push('Effektklasse wechselt');
    if (a.ci_width_ms > 0 && (a.ci_width_ms - b.ci_width_ms) / a.ci_width_ms >= WIDTH_THRESHOLD) {
      reasons.push(`Intervall wird noch um ${(100 * (a.ci_width_ms - b.ci_width_ms) / a.ci_width_ms).toFixed(0)} % schmaler`);
    }
  }
  return { stable_from: null, reason: reasons.join(', ') || 'zu wenige Zwischenstände' };
}

const comparisons = [];
const runSeconds = [];
for (const dir of dirs) {
  const file = path.join(path.resolve(dir), 'aggregate.json');
  if (!existsSync(file)) continue;
  const agg = JSON.parse(readFileSync(file, 'utf-8'));
  if (agg.phase !== 'pilot' || agg.aborted) continue;
  const runs = Object.values(agg.scenarios).reduce((s, sc) => s + sc.runs_per_config * agg.configs.length, 0);
  runSeconds.push((Date.parse(agg.finished_at) - Date.parse(agg.started_at)) / 1000 / runs);
  const groups = {};
  for (const e of agg.interim) (groups[`${e.scenario}|${e.comparison}`] ??= []).push(e);
  for (const [key, steps] of Object.entries(groups)) {
    steps.sort((x, y) => x.n_pairs - y.n_pairs);
    const [scenario, comparison] = key.split('|');
    comparisons.push({ campaign: agg.campaign_dir, scenario, comparison, steps, ...stability(steps) });
  }
}

const scenarios = plan.scenarios.map((name) => {
  const rows = comparisons.filter((c) => c.scenario === name);
  const maxPilot = Math.max(0, ...rows.map((c) => c.steps.at(-1).n_pairs));
  const unstable = rows.filter((c) => c.stable_from == null);
  const stableMax = Math.max(0, ...rows.filter((c) => c.stable_from != null).map((c) => c.stable_from));
  return {
    scenario: name,
    comparisons: rows.length,
    pilot_pairs: maxPilot,
    unstable: unstable.map((c) => c.comparison),
    // only defined when all comparisons became stable within the pilot
    required_pairs: unstable.length ? null : Math.max(MIN_PAIRS, stableMax),
  };
});

const secondsPerRun = runSeconds.length ? runSeconds.reduce((a, b) => a + b, 0) / runSeconds.length : null;
let estimate = null;
if (runsArg && secondsPerRun) {
  const counts = Object.fromEntries(runsArg.split(',').map((kv) => kv.split('=')).map(([k, v]) => [k, Number(v)]));
  const perConfig = plan.scenarios.reduce((s, name) => s + (counts[name] ?? 0) + WARMUP_RUNS, 0);
  const runs = plan.comparisons.length * 2 * perConfig;
  estimate = { counts, runs_per_block: runs, hours_per_block: (runs * secondsPerRun) / 3600 };
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(RESULTS_DIR, `${stamp}_pilot`);
mkdirSync(outDir, { recursive: true });
const result = { criterion: { width_threshold: WIDTH_THRESHOLD, min_pairs: MIN_PAIRS }, seconds_per_run: secondsPerRun, scenarios, comparisons, estimate };
writeFileSync(path.join(outDir, 'pilot.json'), JSON.stringify(result, null, 2));

const fmt = (x, d = 3) => (x == null ? '–' : x.toFixed(d));
const lines = ['# Auswertung des Pilots', '',
  `Kriterium (DECISIONS.md 5.9): Vorzeichen und Effektklasse von Cliff's Delta ändern sich nicht mehr, und das 95-%-Konfidenzintervall der Median-Differenz wird je weiterem Zwischenstand um weniger als ${WIDTH_THRESHOLD * 100} % schmaler. Mindestens ein späterer Zwischenstand bestätigt das. Mindestens ${MIN_PAIRS} Paare.`, ''];
lines.push('## Je Laststufe', '', '| Laststufe | Paare im Pilot | stabil ab (größter Wert) | nicht stabil im Pilot |', '|---|---|---|---|');
for (const s of scenarios) lines.push(`| ${s.scenario} | ${s.pilot_pairs} | ${s.required_pairs ?? '–'} | ${s.unstable.join(', ') || '–'} |`);
lines.push('', '## Je Vergleich', '');
for (const c of comparisons.sort((a, b) => plan.scenarios.indexOf(a.scenario) - plan.scenarios.indexOf(b.scenario) || a.comparison.localeCompare(b.comparison))) {
  lines.push(`### ${c.comparison}, ${c.scenario}`, '', c.stable_from != null ? `Stabil ab ${c.stable_from} Paaren.` : `Im Pilot nicht stabil (${c.reason}).`, '',
    '| Paare | Median-Differenz (ms) | Breite 95-%-KI (ms) | Cliff\'s Delta | Effektklasse |', '|---|---|---|---|---|');
  for (const e of c.steps) lines.push(`| ${e.n_pairs} | ${fmt(e.median_diff_ms)} | ${fmt(e.ci_width_ms)} | ${fmt(e.cliffs_delta)} | ${e.cliffs_magnitude} |`);
  lines.push('');
}
lines.push(`Mittlere Dauer eines Laufs einschließlich Pausen und Vorlauf: ${fmt(secondsPerRun, 1)} s.`);
if (estimate) {
  lines.push('', `Geschätzte Dauer eines Blocks mit ${Object.entries(estimate.counts).map(([k, v]) => `${k} ${v}`).join(', ')} Läufen je Konfiguration und ${WARMUP_RUNS} Warm-up-Läufen: ${estimate.runs_per_block} Läufe, ${fmt(estimate.hours_per_block, 0)} h (${fmt(estimate.hours_per_block / 24, 1)} Tage).`);
}
writeFileSync(path.join(outDir, 'pilot.md'), `${lines.join('\n')}\n`);

console.log(`Auswertung des Pilots: ${path.relative(REPO_ROOT, outDir)}`);
for (const s of scenarios) {
  console.log(`  ${s.scenario}: ${s.required_pairs != null ? `stabil ab ${s.required_pairs} Paaren` : `im Pilot (${s.pilot_pairs} Paare) nicht stabil: ${s.unstable.join(', ')}`}`);
}
console.log(`  mittlere Dauer eines Laufs: ${fmt(secondsPerRun, 1)} s`);
if (estimate) console.log(`  ein Block mit diesen Zahlen: ${estimate.runs_per_block} Läufe, etwa ${fmt(estimate.hours_per_block / 24, 1)} Tage`);
