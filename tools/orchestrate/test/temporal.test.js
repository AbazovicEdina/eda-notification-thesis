// Checks the temporal diagnosis (stats.js, assessment.js, DECISIONS.md 5.8) on
// small constructed data sets, in particular missing pairs, constant series,
// halves of different size and missing adjacent pairs.
// Run with: node --test tools/orchestrate/test/temporal.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { linearTrendByRun, lag1AutocorrelationByRun, halfMediansByRun } from '../stats.js';
import {
  temporalDiagnosisOf, temporalDiagnosisFamilies, blockComparison, campaignSpread, processContinuity,
  correctFamilies, oriented, DIAGNOSIS, TEMPORAL_HALF_BOUNDARY,
} from '../assessment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(readFileSync(path.join(__dirname, '..', 'plan.json'), 'utf-8'));
const close = (x, y, eps = 1e-12) => assert.ok(Math.abs(x - y) <= eps, `${x} ist nicht ${y}`);
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const RUNS = range(6, 95);

// Result as run.js stores it. A difference series d becomes a = d, b = 0.
const fromDiffs = (d, runs) => ({
  pairs: { run_indices: runs, dropped_run_indices: [], a: d, b: d.map(() => 0) },
  n_pairs: d.length,
  conclusive: true,
  wilcoxon: { p: 0.5, w_plus: 1, w_minus: 2 },
  cliffs_delta: 0,
  cliffs_magnitude: 'vernachlässigbar',
  rank_biserial: 0,
  median_diff: 1,
  median_diff_ci95: [0, 2],
});

test('Autokorrelation ohne Lücken ist der übliche Schätzer (von Hand gerechnet)', () => {
  const { r, adjacentPairs } = lag1AutocorrelationByRun([1, 2, 3, 4], [1, 2, 3, 4]);
  // Abweichungen −1,5 −0,5 0,5 1,5: Zähler 0,75 − 0,25 + 0,75 = 1,25, Nenner 5.
  close(r, 0.25);
  assert.equal(adjacentPairs, 3);
});

test('Autokorrelation mit Lücke nutzt nur echte Nachbarn und gleicht die fehlenden Produkte aus', () => {
  const { r, adjacentPairs } = lag1AutocorrelationByRun([1, 2, 3, 4], [1, 2, 4, 5]);
  // Nur die Paare (1,2) und (4,5): Zähler 0,75 + 0,75 = 1,5, Faktor (4 − 1) / 2.
  assert.equal(adjacentPairs, 2);
  close(r, 1.5 * (1.5 / 5));
});

test('die Lücke verändert die Autokorrelation gegenüber einer Neunummerierung', () => {
  const values = [1, 5, 2, 6, 3, 7];
  const real = lag1AutocorrelationByRun(values, [1, 2, 10, 11, 20, 21]);
  const renumbered = lag1AutocorrelationByRun(values, range(1, 6));
  assert.equal(real.adjacentPairs, 3);
  assert.equal(renumbered.adjacentPairs, 5);
  assert.notEqual(real.r, renumbered.r);
});

test('konstante Reihe und Reihe ohne Nachbarn haben keine Autokorrelation', () => {
  assert.equal(lag1AutocorrelationByRun([0.1, 0.1, 0.1, 0.1], [1, 2, 3, 4]).r, null);
  const gaps = lag1AutocorrelationByRun([1, 2, 3], [1, 3, 5]);
  assert.equal(gaps.r, null);
  assert.equal(gaps.adjacentPairs, 0);
});

test('Trend läuft über die echten Laufnummern', () => {
  const runs = [6, 7, 10, 30];
  const fit = linearTrendByRun(runs.map((x) => 2 * x + 1), runs);
  close(fit.slope, 2);
  assert.equal(fit.residualsFlat, true);
  close(fit.trendShare, 1);
  // Nach Positionen wäre dieselbe Reihe keine Gerade.
  const byPosition = linearTrendByRun(runs.map((x) => 2 * x + 1), [1, 2, 3, 4]);
  assert.equal(byPosition.residualsFlat, false);
});

test('Trendanteil einer konstanten Reihe ist nicht definiert', () => {
  const fit = linearTrendByRun([3, 3, 3, 3], [1, 2, 3, 4]);
  assert.equal(fit.constant, true);
  assert.equal(fit.trendShare, null);
});

test('Laufnummern müssen aufsteigen und zu den Werten passen', () => {
  assert.throws(() => lag1AutocorrelationByRun([1, 2], [2, 1]));
  assert.throws(() => linearTrendByRun([1, 2, 3], [1, 2]));
});

test('Hälften werden an der festen Laufnummer getrennt', () => {
  assert.equal(TEMPORAL_HALF_BOUNDARY, 50);
  const h = halfMediansByRun(RUNS.map((r) => (r <= 50 ? 1 : 4)), RUNS, 50, 10);
  assert.equal(h.n_first, 45);
  assert.equal(h.n_second, 45);
  close(h.change, 3);
});

test('fehlende Läufe ergeben ungleich große Hälften ohne Verschiebung der Grenze', () => {
  const runs = RUNS.filter((r) => ![50, 49, 7].includes(r));
  const h = halfMediansByRun(runs.map((r) => (r <= 50 ? 1 : 4)), runs, 50, 10);
  assert.equal(h.n_first, 42);
  assert.equal(h.n_second, 45);
  close(h.change, 3);
});

test('eine zu kleine Hälfte liefert keine Änderung, die Anzahlen bleiben sichtbar', () => {
  const runs = [...range(6, 12), ...range(51, 95)];
  const h = halfMediansByRun(runs.map(() => 1), runs, 50, 10);
  assert.equal(h.n_first, 7);
  assert.equal(h.n_second, 45);
  assert.equal(h.change, null);
});

test('Einordnung Reststruktur bei einem Verlauf, den eine Gerade nicht erklärt', () => {
  const d = RUNS.map((r) => Math.sin((2 * Math.PI * r) / 30));
  const out = temporalDiagnosisOf(fromDiffs(d, RUNS));
  assert.equal(out.diagnosis, DIAGNOSIS.residual);
  assert.equal(out.n_pairs, 90);
  assert.equal(out.n_adjacent_pairs, 89);
  assert.equal(out.missing_runs_inside, 0);
  assert.equal(out.n_first_half, 45);
  assert.equal(out.n_second_half, 45);
  close(out.limit, 2 / Math.sqrt(90));
});

test('Einordnung nur linearer Trend', () => {
  const d = RUNS.map((r, i) => r + (i % 2 ? 2 : -2));
  const out = temporalDiagnosisOf(fromDiffs(d, RUNS));
  assert.equal(out.diagnosis, DIAGNOSIS.trend);
  assert.ok(out.r1 > out.limit);
  assert.ok(out.r1_detrended <= out.limit);
});

test('Einordnung ohne Befund bei wechselnden Vorzeichen', () => {
  const d = RUNS.map((_, i) => (i % 2 ? 1 : -1));
  assert.equal(temporalDiagnosisOf(fromDiffs(d, RUNS)).diagnosis, DIAGNOSIS.none);
});

test('konstante Reihe ist nicht bestimmbar und nicht unauffällig', () => {
  const out = temporalDiagnosisOf(fromDiffs(RUNS.map(() => 0.25), RUNS));
  assert.equal(out.diagnosis, DIAGNOSIS.undetermined);
  assert.equal(out.reason, 'konstante Reihe');
  assert.equal(out.r1, null);
});

test('exakte Gerade ist nicht bestimmbar, weil keine Reste bleiben', () => {
  const out = temporalDiagnosisOf(fromDiffs(RUNS.map((r) => 3 * r + 1), RUNS));
  assert.equal(out.diagnosis, DIAGNOSIS.undetermined);
  assert.equal(out.r1_detrended, null);
  close(out.trend_share, 1, 1e-9);
});

test('unter 20 gültigen Paaren nicht bestimmbar', () => {
  const runs = range(6, 24);
  const out = temporalDiagnosisOf(fromDiffs(runs.map((_, i) => i * i), runs));
  assert.equal(out.n_pairs, 19);
  assert.equal(out.diagnosis, DIAGNOSIS.undetermined);
  assert.equal(out.reason, 'weniger als 20 gültige Paare');
  assert.equal(out.limit, null);
  assert.equal(out.r1, null);
});

test('genau 20 lückenlose Paare sind bestimmbar', () => {
  const runs = range(6, 25);
  const out = temporalDiagnosisOf(fromDiffs(runs.map((_, i) => (i % 2 ? 1 : -1)), runs));
  assert.equal(out.n_adjacent_pairs, 19);
  assert.equal(out.diagnosis, DIAGNOSIS.none);
});

test('zu wenige Nachbarpaare trotz genügend gültiger Paare', () => {
  const runs = range(0, 44).map((i) => 6 + 2 * i);
  const out = temporalDiagnosisOf(fromDiffs(runs.map((_, i) => i % 7), runs));
  assert.equal(out.n_pairs, 45);
  assert.equal(out.n_adjacent_pairs, 0);
  assert.equal(out.diagnosis, DIAGNOSIS.undetermined);
  assert.equal(out.reason, 'zu wenige Nachbarpaare');
});

test('fehlende Paare in der Mitte werden gezählt und nicht neu nummeriert', () => {
  const runs = RUNS.filter((r) => ![30, 31, 70].includes(r));
  const out = temporalDiagnosisOf(fromDiffs(runs.map((r) => Math.sin(r / 5)), runs));
  assert.equal(out.n_pairs, 87);
  assert.equal(out.missing_runs_inside, 3);
  assert.equal(out.n_adjacent_pairs, 84);
  assert.equal(out.n_first_half, 43);
  assert.equal(out.n_second_half, 44);
  close(out.limit, 2 / Math.sqrt(87));
});

test('die Richtung von A und B ändert das Vorzeichen der Änderung, nicht die Autokorrelation', () => {
  const d = RUNS.map((r) => r + 5 * Math.sin(r));
  const result = fromDiffs(d, RUNS);
  const flipped = oriented(result, true);
  const x = temporalDiagnosisOf(result);
  const y = temporalDiagnosisOf(flipped);
  close(x.r1, y.r1);
  close(x.r1_detrended, y.r1_detrended);
  close(x.median_change_between_halves, -y.median_change_between_halves);
  assert.deepEqual(flipped.pairs.run_indices, RUNS);
});

test('ohne gepaarte Werte gibt es keine Diagnose', () => {
  assert.equal(temporalDiagnosisOf(null), null);
  assert.equal(temporalDiagnosisOf({ pairs: { a: [1], b: [1] } }), null);
});

test('die Diagnose erzeugt weder Intervalle noch p-Werte noch Sterne', () => {
  const out = temporalDiagnosisOf(fromDiffs(RUNS.map((r) => Math.sin(r / 7)), RUNS));
  const keys = Object.keys(out).join(' ');
  assert.doesNotMatch(keys, /ci|interval|bootstrap|p_value|pValue|significant|star/i);
  assert.doesNotMatch(Object.values(DIAGNOSIS).join(' '), /signifikant|bestätigt|robust|unabhängig/i);
});

// A found map with one comparison at one level and block.
function foundWith(entries) {
  const found = new Map();
  for (const { id, scenario, block, result, medians = {} } of entries) {
    const cmp = plan.comparisons.find((c) => c.id === id);
    const configs = Object.fromEntries([[cmp.a, medians.a], [cmp.b, medians.b]]
      .filter(([, v]) => v != null)
      .map(([cell, v]) => [cell, { cell, describe: { latency_mean_ms: { median: v } } }]));
    found.set(`${id}|${scenario}|${block}`, {
      campaign: { campaign_dir: `c${id}-${block}`, scenarios: { [scenario]: { configs } } },
      entry: { measures: { latency_mean_ms: result } },
      flipped: false,
    });
  }
  return found;
}

test('je Messgröße 39 Zeilen, fehlende Tests ohne Einstufung', () => {
  const found = foundWith([{ id: 1, scenario: 'stress', block: 1, result: fromDiffs(RUNS.map((_, i) => (i % 2 ? 1 : -1)), RUNS) }]);
  const families = temporalDiagnosisFamilies(plan, found, 1);
  assert.equal(families.length, 4);
  const latency = families.find((f) => f.measure === 'latency_mean_ms');
  assert.equal(latency.rows.length, 39);
  assert.equal(latency.diagnoses, 1);
  assert.equal(latency.by_class[DIAGNOSIS.none], 1);
  assert.equal(latency.rows.filter((r) => r.diagnosis === null).length, 38);
  assert.equal(families.reduce((sum, f) => sum + f.rows.length, 0), 156);
});

test('die Zählung der Überschneidung gibt es nur für den konfirmatorischen Block', () => {
  const found = foundWith([{ id: 1, scenario: 'stress', block: 2, result: fromDiffs(RUNS.map((_, i) => (i % 2 ? 1 : -1)), RUNS) }]);
  const families = temporalDiagnosisFamilies(plan, found, 2);
  assert.equal(families[0].by_class_among_holm_decisions, null);
  assert.equal('holm_decision_of_main_analysis' in families[0].rows[0], false);
});

test('die Diagnose verändert die Holm-Korrektur nicht', () => {
  const found = foundWith([{ id: 1, scenario: 'stress', block: 1, result: fromDiffs(RUNS.map((r) => r % 5), RUNS) }]);
  const before = JSON.stringify(correctFamilies(plan, found));
  temporalDiagnosisFamilies(plan, found, 1);
  blockComparison(plan, found);
  assert.equal(JSON.stringify(correctFamilies(plan, found)), before);
});

test('Spannweite zwischen Kampagnen je Zelle und Stufe', () => {
  const cell = plan.comparisons[0].a;
  const other = plan.comparisons.find((c) => c.id !== 1 && (c.a === cell || c.b === cell));
  const medians = other.a === cell ? { a: 12 } : { b: 12 };
  const found = foundWith([
    { id: 1, scenario: 'stress', block: 1, result: fromDiffs([1, 2, 3], [6, 7, 8]), medians: { a: 10, b: 20 } },
    { id: other.id, scenario: 'stress', block: 1, result: fromDiffs([1, 2, 3], [6, 7, 8]), medians },
  ]);
  const spread = campaignSpread(plan, found, 1);
  assert.deepEqual(spread.get(`${cell}|stress|latency_mean_ms`), { campaigns: 2, range: 2 });
});

test('Vergleich der Blöcke ist beschreibend und braucht beide Blöcke', () => {
  const r1 = { ...fromDiffs([1, 2, 3], [6, 7, 8]), median_diff: 2 };
  const r2 = { ...fromDiffs([1, 2, 3], [6, 7, 8]), median_diff: 3 };
  const onlyFirst = blockComparison(plan, foundWith([{ id: 1, scenario: 'stress', block: 1, result: r1 }]));
  assert.equal(onlyFirst[0].compared, 0);
  assert.equal(onlyFirst.find((f) => f.measure === 'latency_mean_ms').rows.find((x) => x.comparison_id === 1 && x.scenario === 'stress').status, 'Block 2 fehlt');
  const both = blockComparison(plan, foundWith([
    { id: 1, scenario: 'stress', block: 1, result: r1, medians: { a: 10, b: 20 } },
    { id: 1, scenario: 'stress', block: 2, result: r2 },
  ]));
  const row = both.find((f) => f.measure === 'latency_mean_ms').rows.find((x) => x.status === 'verglichen');
  close(row.difference, 1);
  close(row.difference_percent_of_block1, 50);
  assert.equal(row.range_between_campaigns_a, 0);
  assert.equal(row.difference_to_range_sum, null);
  assert.doesNotMatch(Object.keys(row).join(' '), /replicat|significant|confirmed/i);
});

test('Prozesslaufzeiten zählen weiterlaufende Prozesse je Block', () => {
  const out = processContinuity([
    { block: 1, campaign: 'k2', started_at: '2026-11-02', cell: 'x', services: { x: ['t1'] } },
    { block: 1, campaign: 'k1', started_at: '2026-11-01', cell: 'x', services: { x: ['t1'] } },
    { block: 1, campaign: 'k3', started_at: '2026-11-03', cell: 'x', services: { x: ['t2', 't3'] } },
    { block: 2, campaign: 'k4', started_at: '2026-11-08', cell: 'x', services: { x: ['t1'] } },
  ]);
  assert.equal(out[0].campaigns, 3);
  assert.equal(out[0].campaigns_with_continued_process, 1);
  assert.equal(out[0].services_restarted_inside_a_campaign, 1);
  assert.deepEqual(out[0].cells.x, { campaigns: 3, continued: 1 });
  assert.equal(out[1].campaigns_with_continued_process, 0);
});
