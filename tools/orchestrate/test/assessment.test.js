// Checks assessment.js (Holm over all planned tests, replication, hypotheses
// with G1 to G4) on small constructed data sets.
// Run with: node --test tools/orchestrate/test/assessment.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  matchCampaigns, correctFamilies, replicationOf, replicationSummary, redisShares,
  directionalCase, smallCase, multipleCase, growthCase, largerEffectCase, combine,
  firstDrop, assessH4, assessH11, assessHypotheses, OUTCOME, VERDICT, FPM_SSE_CELLS,
  sensitivityOf, sensitivityFamilies,
} from '../assessment.js';
import { wilcoxonSignedRank } from '../stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(readFileSync(path.join(__dirname, '..', 'plan.json'), 'utf-8'));
const ALL_CELLS = [...new Set(plan.comparisons.flatMap((c) => [c.a, c.b]))];

// Result of one comparison as run.js stores it in aggregate.json.
const result = ({ p = 0.001, delta = 0.8, md = -1, ci = null, conclusive = true } = {}) => ({
  n_pairs: 90,
  n_pairs_nonzero: conclusive ? 90 : 10,
  conclusive,
  wilcoxon: { p, w_plus: 10, w_minus: 20 },
  cliffs_delta: delta,
  cliffs_magnitude: Math.abs(delta) >= 0.474 ? 'groß' : 'klein',
  rank_biserial: delta,
  median_diff: md,
  median_diff_ci95: ci ?? [md - 0.1, md + 0.1],
  pairs: { a: [], b: [] },
});

// Test as it appears in a Holm-corrected family.
const tested = (opts = {}, significant = true) => ({ result: result(opts), significant, pHolm: significant ? 0.01 : 0.2 });

// Campaign aggregate with one comparison on one load level.
function campaign({ cellA, cellB, scenario = 'baseline', block = 1, measures, medians = {} }) {
  return {
    campaign_dir: `c-${cellA}-${cellB}-${scenario}-${block}`,
    phase: 'main',
    block,
    scenarios: {
      [scenario]: {
        configs: {
          A: { cell: cellA, describe: Object.fromEntries(Object.entries(medians).map(([m, v]) => [m, { median: v[0] }])) },
          B: { cell: cellB, describe: Object.fromEntries(Object.entries(medians).map(([m, v]) => [m, { median: v[1] }])) },
        },
        comparisons: [{ cell_a: cellA, cell_b: cellB, measures }],
      },
    },
  };
}

// --- Holm over all planned tests ---------------------------------------------

test('Holm: jede Familie hat 39 Tests, fehlende gehen mit p = 1 ein', () => {
  const c4 = plan.comparisons.find((c) => c.id === 4);
  const { found } = matchCampaigns(plan, [campaign({ cellA: c4.a, cellB: c4.b, measures: { latency_mean_ms: result({ p: 0.001 }) } })]);
  const families = correctFamilies(plan, found);
  assert.equal(families.length, 4);
  for (const f of families) assert.equal(f.m, 39);
  const lat = families.find((f) => f.measure === 'latency_mean_ms');
  const missing = lat.tests.filter((t) => t.status === 'fehlt');
  assert.equal(missing.length, 38);
  assert.ok(missing.every((t) => t.pValue === 1 && !t.significant));
  const measured = lat.tests.find((t) => t.comparison_id === 4 && t.scenario === 'baseline');
  // Smallest Holm threshold α/39 ≈ 0.00128, so p = 0.001 is significant, p = 0.002 would not be.
  assert.equal(measured.significant, true);
  close(measured.holmAlpha, 0.05 / 39);
});

test('Holm: p knapp über α/39 ist nicht signifikant, obwohl er allein unter α läge', () => {
  const c4 = plan.comparisons.find((c) => c.id === 4);
  const { found } = matchCampaigns(plan, [campaign({ cellA: c4.a, cellB: c4.b, measures: { latency_mean_ms: result({ p: 0.002 }) } })]);
  const lat = correctFamilies(plan, found).find((f) => f.measure === 'latency_mean_ms');
  assert.equal(lat.tests.find((t) => t.comparison_id === 4 && t.scenario === 'baseline').significant, false);
});

test('Zuordnung: umgekehrte Reihenfolge in der Kampagne wird in Planrichtung gedreht', () => {
  const c4 = plan.comparisons.find((c) => c.id === 4);
  const { found } = matchCampaigns(plan, [campaign({ cellA: c4.b, cellB: c4.a, measures: { latency_mean_ms: result({ md: 2, delta: 0.9, ci: [1.5, 2.5] }) } })]);
  const t = correctFamilies(plan, found).find((f) => f.measure === 'latency_mean_ms').tests.find((x) => x.comparison_id === 4 && x.scenario === 'baseline');
  assert.equal(t.result.median_diff, -2);
  assert.equal(t.result.cliffs_delta, -0.9);
  assert.deepEqual(t.result.median_diff_ci95, [-2.5, -1.5]);
});

test('Zuordnung: doppelt gemessener Vergleich wird gemeldet', () => {
  const c1 = plan.comparisons.find((c) => c.id === 1);
  const make = () => campaign({ cellA: c1.a, cellB: c1.b, measures: { latency_mean_ms: result() } });
  const { duplicates } = matchCampaigns(plan, [make(), make()]);
  assert.equal(duplicates.length, 1);
});

// --- Replication --------------------------------------------------------------

test('Replikation: gleiche Richtung und überlappende Intervalle', () => {
  const r = replicationOf(result({ md: -1, ci: [-1.5, -0.5] }), result({ md: -0.8, ci: [-1.2, -0.4], delta: 0.2 }));
  assert.equal(r.replicated, true);
  assert.equal(r.same_magnitude, false); // effect class only reported
});

test('Replikation: andere Richtung oder getrennte Intervalle sind nicht repliziert', () => {
  assert.equal(replicationOf(result({ md: -1, ci: [-1.5, -0.5] }), result({ md: 0.3, ci: [-0.6, 0.9] })).replicated, false);
  assert.equal(replicationOf(result({ md: -1, ci: [-1.5, -0.9] }), result({ md: -0.3, ci: [-0.5, -0.1] })).replicated, false);
});

test('Replikation: eine Median-Differenz von genau 0 ist eine eigene Richtung', () => {
  // 0 in beiden Blöcken mit überlappenden Intervallen ist repliziert.
  assert.equal(replicationOf(result({ md: 0, ci: [-0.1, 0] }), result({ md: 0, ci: [-0.1, 0.1] })).replicated, true);
  // 0 in Block 1 und eine kleine Differenz in Block 2 ist nicht repliziert, obwohl die Intervalle überlappen.
  const r = replicationOf(result({ md: 0, ci: [-0.1, 0] }), result({ md: 0.05, ci: [0, 0.1] }));
  assert.equal(r.ci_overlap, true);
  assert.equal(r.same_direction, false);
  assert.equal(r.replicated, false);
  // Ebenso umgekehrt, eine Differenz in Block 1 und 0 in Block 2.
  assert.equal(replicationOf(result({ md: -0.1, ci: [-0.2, 0] }), result({ md: 0, ci: [-0.1, 0] })).replicated, false);
});

test('Replikation: beschreibende Zusatzangaben ändern die Regel nicht', () => {
  const r = replicationOf(result({ md: -0.001, ci: [-0.03, 0.03] }), result({ md: -0.02, ci: [-0.04, -0.01], p: 0.01 }));
  assert.equal(r.ci_block1_contains_zero, true);
  assert.equal(r.block2_significant_same_direction, true);
  assert.equal(r.replicated, true);
  const s = replicationOf(result({ md: -1, ci: [-1.1, -0.9] }), result({ md: -0.95, ci: [-1.0, -0.9], p: 0.2 }));
  assert.equal(s.ci_block1_contains_zero, false);
  assert.equal(s.block2_significant_same_direction, false); // nicht signifikant
  assert.equal(s.replicated, true);
  const o = replicationOf(result({ md: -1, ci: [-1.1, -0.9] }), result({ md: 0.5, ci: [0.4, 0.6], p: 0.001 }));
  assert.equal(o.block2_significant_same_direction, false); // signifikant, aber in der Gegenrichtung
});

test('Bewertung der Hypothesen: p-Werte unter 0.001 als < 0.001', () => {
  const c = directionalCase({ result: result({ md: -1 }), significant: true, pHolm: 0.0000123 }, -1, 'Fall');
  assert.match(c.detail, /p \(Holm\) < 0\.001/);
  const d = directionalCase({ result: result({ md: -1 }), significant: true, pHolm: 0.0123 }, -1, 'Fall');
  assert.match(d.detail, /p \(Holm\) 0\.012/);
});

test('Replikation: Block 2 fehlt wird als solcher ausgewiesen', () => {
  const c1 = plan.comparisons.find((c) => c.id === 1);
  const { found } = matchCampaigns(plan, [campaign({ cellA: c1.a, cellB: c1.b, measures: { latency_mean_ms: result() } })]);
  const lat = replicationSummary(plan, found).find((r) => r.measure === 'latency_mean_ms');
  assert.equal(lat.compared, 0);
  assert.equal(lat.rows.find((r) => r.comparison_id === 1 && r.scenario === 'baseline').status, 'Block 2 fehlt');
});

// --- Exact test up to 50 pairs ---------------------------------------------------

test('Wilcoxon: exakt bis 50 Paare ohne Bindungen, darüber Normalapproximation', () => {
  const pairs = (n) => {
    const a = [];
    const b = [];
    for (let i = 1; i <= n; i++) {
      a.push(i % 3 === 0 ? -i : i); // distinct |d|, mixed signs
      b.push(0);
    }
    return [a, b];
  };
  const w50 = wilcoxonSignedRank(...pairs(50));
  const w51 = wilcoxonSignedRank(...pairs(51));
  assert.equal(w50.method, 'exakt');
  assert.notEqual(w51.method, 'exakt');
  assert.ok(w50.pValue > 0 && w50.pValue <= 1);
  assert.ok(w51.pValue > 0 && w51.pValue <= 1);
  // Both p-values describe the same pattern and are close to each other.
  assert.ok(Math.abs(w50.pValue - w51.pValue) < 0.05);
});

// --- Kinds of cases ---------------------------------------------------------------

test('G1: Richtung und Signifikanz entscheiden, Gegenteil nur bei signifikanter Gegenrichtung', () => {
  assert.equal(directionalCase(tested({ md: -1 }), -1, 'x').outcome, OUTCOME.holds);
  assert.equal(directionalCase(tested({ md: 1 }), -1, 'x').outcome, OUTCOME.opposite);
  assert.equal(directionalCase(tested({ md: -1 }, false), -1, 'x').outcome, OUTCOME.unclear);
  assert.equal(directionalCase(tested({ md: -1, conclusive: false }), -1, 'x').outcome, OUTCOME.unclear);
  assert.equal(directionalCase(null, -1, 'x').outcome, OUTCOME.unclear);
});

test('G2: |δ| < 0,33 erfüllt, Gegenteil nur mit |δ| ≥ 0,33 und Signifikanz', () => {
  assert.equal(smallCase(tested({ delta: 0.2 }), 'x').outcome, OUTCOME.holds);
  assert.equal(smallCase(tested({ delta: -0.329 }), 'x').outcome, OUTCOME.holds);
  assert.equal(smallCase(tested({ delta: 0.33 }), 'x').outcome, OUTCOME.opposite);
  assert.equal(smallCase(tested({ delta: -0.5 }, false), 'x').outcome, OUTCOME.unclear);
});

test('G3: Verhältnis der Mediane mindestens 2 und signifikant', () => {
  assert.equal(multipleCase(tested({ md: -900 }), 100, 250, 'b', 'x').outcome, OUTCOME.holds);
  assert.equal(multipleCase(tested({ md: -50 }), 100, 150, 'b', 'x').outcome, OUTCOME.opposite);
  assert.equal(multipleCase(tested({ md: -900 }, false), 100, 250, 'b', 'x').outcome, OUTCOME.unclear);
  assert.equal(multipleCase(tested({ md: 900 }), 300, 100, 'a', 'x').outcome, OUTCOME.holds);
  assert.equal(multipleCase(tested({ md: 900 }), null, 100, 'a', 'x').outcome, OUTCOME.unclear);
});

test('H3: Betrag der Median-Differenz wächst und ist bei 500 Clients signifikant', () => {
  assert.equal(growthCase(tested({ md: -0.5 }), tested({ md: 3 }), 'x').outcome, OUTCOME.holds);
  assert.equal(growthCase(tested({ md: -2 }), tested({ md: 1 }), 'x').outcome, OUTCOME.opposite);
  assert.equal(growthCase(tested({ md: 0.1 }), tested({ md: 3 }, false), 'x').outcome, OUTCOME.unclear);
});

test('Vergleich zweier Effekte (H5, H7), Effekt = b − a', () => {
  // First effect 5 (median difference −5), second effect 2.
  assert.equal(largerEffectCase(tested({ md: -5 }), tested({ md: -2 }), 'x').outcome, OUTCOME.holds);
  assert.equal(largerEffectCase(tested({ md: -2 }), tested({ md: -5 }), 'x').outcome, OUTCOME.opposite);
  assert.equal(largerEffectCase(tested({ md: -5 }, false), tested({ md: -2 }), 'x', { requireSignificant: true }).outcome, OUTCOME.unclear);
  assert.equal(largerEffectCase(tested({ md: -5 }, false), tested({ md: -2 }), 'x').outcome, OUTCOME.holds);
});

test('G4: alle erfüllt bestätigt, ein Gegenteil nicht bestätigt, sonst unentschieden', () => {
  const c = (outcome) => ({ label: 'x', outcome, detail: '' });
  assert.equal(combine([c(OUTCOME.holds), c(OUTCOME.holds)]).verdict, VERDICT.supported);
  assert.equal(combine([c(OUTCOME.holds), c(OUTCOME.opposite), c(OUTCOME.unclear)]).verdict, VERDICT.notSupported);
  assert.equal(combine([c(OUTCOME.holds), c(OUTCOME.unclear)]).verdict, VERDICT.undecided);
  assert.equal(combine([]).verdict, VERDICT.undecided);
});

// --- H8 ----------------------------------------------------------------------------

test('H8: Median des Redis-Anteils je Variante, Schwellen 25 % und 10 %', () => {
  const runs = [];
  for (const cell of ALL_CELLS) {
    const share = FPM_SSE_CELLS.includes(cell) ? 0.3 : 0.05;
    for (let i = 0; i < 30; i++) runs.push({ cell, cpu_seconds_redis: share * 10, cpu_seconds_total: 10 });
  }
  const shares = redisShares(runs);
  close(shares['php-minimal-sse'].median, 0.3);
  const h8 = assessHypotheses({ plan, families: [], found: new Map(), redis: shares }).find((h) => h.id === 'H8');
  assert.equal(h8.verdict, VERDICT.supported);
  assert.equal(h8.cases.length, 10);

  shares['node-minimal-sse'] = { runs: 30, median: 0.12 };
  assert.equal(assessHypotheses({ plan, families: [], found: new Map(), redis: shares }).find((h) => h.id === 'H8').verdict, VERDICT.notSupported);

  shares['node-minimal-sse'] = { runs: 10, median: 0.05 };
  assert.equal(assessHypotheses({ plan, families: [], found: new Map(), redis: shares }).find((h) => h.id === 'H8').verdict, VERDICT.undecided);
});

// --- Series (H4, H11) -----------------------------------------------------------------

const steps = (ratios) => [10, 50, 100, 250, 500, 750, 1000].map((clients, i) => ({ clients, served_ratio_median: ratios[i] }));
const FULL = [1, 1, 1, 1, 1, 1, 1];
const HARD = [1, 1, 1, 1, 1, 0.73, 0.55]; // pool of 550 workers
const SOFT = [1, 1, 1, 1, 1, 0.98, 0.96];

test('H4: harte Grenze nur bei PHP-FPM/SSE und dort die niedrigsten Grenzen', () => {
  assert.equal(firstDrop(steps(HARD)), 750);
  assert.equal(firstDrop(steps(SOFT)), null);
  const scaling = Object.fromEntries(ALL_CELLS.map((c) => [c, FPM_SSE_CELLS.includes(c)
    ? { steps: steps(HARD), first_clients_below_criterion: 750 }
    : { steps: steps(SOFT), first_clients_below_criterion: 750 }]));
  // Ties of the capacity limits are undecided.
  let cases = assessH4(scaling, ALL_CELLS);
  assert.equal(combine(cases).verdict, VERDICT.undecided);
  for (const c of ALL_CELLS.filter((x) => !FPM_SSE_CELLS.includes(x))) scaling[c] = { steps: steps(FULL), first_clients_below_criterion: null };
  cases = assessH4(scaling, ALL_CELLS);
  assert.equal(combine(cases).verdict, VERDICT.supported);
  scaling['node-minimal-sse'] = { steps: steps(HARD), first_clients_below_criterion: 750 };
  assert.equal(combine(assessH4(scaling, ALL_CELLS)).verdict, VERDICT.notSupported);
});

test('H4 und H11 ohne series.json sind unentschieden', () => {
  const all = assessHypotheses({ plan, families: [], found: new Map() });
  assert.equal(all.find((h) => h.id === 'H4').verdict, VERDICT.undecided);
  assert.equal(all.find((h) => h.id === 'H11').verdict, VERDICT.undecided);
});

test('H11: WebSocket mit höherer nachhaltiger Rate, Gleichstand unentschieden', () => {
  const sat = (sse, ws) => Object.fromEntries(['node-minimal', 'node-express', 'php-minimal', 'php-laravel']
    .flatMap((b) => [[`${b}-sse`, { max_sustainable_rate_per_s: sse }], [`${b}-ws`, { max_sustainable_rate_per_s: ws }]]));
  assert.equal(combine(assessH11(sat(100, 200))).verdict, VERDICT.supported);
  assert.equal(combine(assessH11(sat(200, 100))).verdict, VERDICT.notSupported);
  assert.equal(combine(assessH11(sat(200, 200))).verdict, VERDICT.undecided);
  // No sustainable rate at all counts as 0.
  assert.equal(combine(assessH11(sat(null, 50))).verdict, VERDICT.supported);
});

test('H11: eine Untergrenze entscheidet nur, wenn sie über der anderen Rate liegt', () => {
  const sat = (sse, ws) => Object.fromEntries(['node-minimal', 'node-express', 'php-minimal', 'php-laravel']
    .flatMap((b) => [[`${b}-sse`, sse], [`${b}-ws`, ws]]));
  const exact = (r) => ({ max_sustainable_rate_per_s: r, limit: 'criterion' });
  const atLeast = (r, limit = 'loadgen') => ({ max_sustainable_rate_per_s: r, limit });
  // WebSocket at least 700, SSE exactly 500: WebSocket is higher.
  assert.equal(combine(assessH11(sat(exact(500), atLeast(700)))).verdict, VERDICT.supported);
  // SSE at least 700, WebSocket exactly 500: SSE is higher.
  assert.equal(combine(assessH11(sat(atLeast(700), exact(500)))).verdict, VERDICT.notSupported);
  // WebSocket at least 300, SSE exactly 500: WebSocket could still be higher.
  assert.equal(combine(assessH11(sat(exact(500), atLeast(300)))).verdict, VERDICT.undecided);
  // SSE at least 500, WebSocket exactly 700: SSE could still be higher.
  assert.equal(combine(assessH11(sat(atLeast(500), exact(700)))).verdict, VERDICT.undecided);
  // Both passed every level: a tie as in the rule.
  assert.equal(combine(assessH11(sat(atLeast(1000, 'highest_rate'), atLeast(1000, 'highest_rate')))).verdict, VERDICT.undecided);
  // Only WebSocket passed every level.
  assert.equal(combine(assessH11(sat(exact(700), atLeast(1000, 'highest_rate')))).verdict, VERDICT.supported);
});

// --- Whole chain for single hypotheses ----------------------------------------------------

test('H6 über die ganze Kette: Kampagnen zuordnen, Holm, Bewertung', () => {
  const c4 = plan.comparisons.find((c) => c.id === 4);
  const camps = plan.scenarios.map((s) => campaign({ cellA: c4.a, cellB: c4.b, scenario: s, measures: { latency_mean_ms: result({ p: 1e-6, md: -3 }) } }));
  const { found } = matchCampaigns(plan, camps);
  const families = correctFamilies(plan, found);
  const h6 = assessHypotheses({ plan, families, found }).find((h) => h.id === 'H6');
  assert.equal(h6.verdict, VERDICT.supported);
  assert.equal(h6.counts.erfüllt, 3);
});

test('H1 nutzt die Mediane der Kampagne für das Verhältnis (G3)', () => {
  const camps = [1, 3].map((id) => {
    const c = plan.comparisons.find((x) => x.id === id);
    return campaign({
      cellA: c.a, cellB: c.b, scenario: 'stress',
      measures: { working_set_peak_bytes_total: result({ p: 1e-6, md: -900 }) },
      medians: { working_set_peak_bytes_total: [100, id === 1 ? 300 : 150] },
    });
  });
  const { found } = matchCampaigns(plan, camps);
  const h1 = assessHypotheses({ plan, families: correctFamilies(plan, found), found }).find((h) => h.id === 'H1');
  assert.equal(h1.cases[0].outcome, OUTCOME.holds);
  assert.equal(h1.cases[1].outcome, OUTCOME.opposite); // ratio 1.5
  assert.equal(h1.verdict, VERDICT.notSupported);
});

test('Alle elf Hypothesen haben eine Regel, keine bleibt ohne Fälle', () => {
  const all = assessHypotheses({ plan, families: [], found: new Map() });
  assert.equal(all.length, 11);
  for (const h of all) {
    assert.ok(h.cases.length > 0, h.id);
    assert.ok(!h.cases.some((c) => c.label === 'keine Regel umgesetzt'), h.id);
  }
});

function close(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) < eps, `${actual} ≉ ${expected}`);
}

// --- Sensitivity analysis (DECISIONS.md 5.8) -----------------------------------------

test('Sensitivität eines Tests: Vorzeichen, Hodges-Lehmann, Schiefe und Richtungen', () => {
  // 90 pairs, differences 1 for 60 pairs, -1 for 20 pairs and 0 for 10 pairs.
  const a = [...Array(60).fill(2), ...Array(20).fill(0), ...Array(10).fill(1)];
  const b = Array(90).fill(1);
  const s = sensitivityOf({ ...result({ md: 1 }), wilcoxon: { p: 0.001, w_plus: 3000, w_minus: 1000 }, pairs: { a, b } });
  assert.deepEqual(s.sign_test.positive, 60);
  assert.deepEqual(s.sign_test.negative, 20);
  assert.deepEqual(s.sign_test.zeros, 10);
  assert.ok(s.sign_test.p < 0.001);
  // 4 095 Walsh averages: −1 (210), −0.5 (200), 0 (1 255), 0.5 (600), 1 (1 830). The 2 048th
  // value is 0.5. Median (1) and pseudo-median (0.5) differ because the differences are not symmetric.
  assert.equal(s.hodges_lehmann, 0.5);
  assert.equal(s.all_same_sign, false);
  assert.deepEqual(s.direction, { median: 1, hodges_lehmann: 1, wilcoxon: 1, sign_test: 1 });
  // Without pairs there is nothing to analyse.
  assert.equal(sensitivityOf(result()), null);
});

test('Sensitivität je Familie: beide Tests über dieselben 39 Tests nach Holm, fehlende mit p = 1', () => {
  const c4 = plan.comparisons.find((c) => c.id === 4);
  // All 90 differences negative, both tests clearly significant.
  const a = Array.from({ length: 90 }, (_, i) => 1 + (i % 7) * 0.01);
  const b = a.map((v) => v + 2);
  const r = { ...result({ p: 1e-15, md: -2 }), wilcoxon: { p: 1e-15, w_plus: 0, w_minus: 4095 }, pairs: { a, b } };
  const { found } = matchCampaigns(plan, [campaign({ cellA: c4.a, cellB: c4.b, measures: { latency_mean_ms: r } })]);
  const fams = sensitivityFamilies(plan, found, 1);
  assert.equal(fams.length, 4);
  const lat = fams.find((f) => f.measure === 'latency_mean_ms');
  assert.equal(lat.m, 39);
  assert.equal(lat.measured, 1);
  const row = lat.rows.find((x) => x.comparison_id === 4 && x.scenario === 'baseline');
  assert.equal(row.wilcoxon_significant, true);
  assert.equal(row.sign_significant, true);
  assert.equal(row.all_same_sign, true);
  assert.deepEqual([lat.summary.both_significant, lat.summary.only_wilcoxon, lat.summary.only_sign_test, lat.summary.neither], [1, 0, 0, 0]);
  // Missing tests enter both corrections with p = 1 and are not significant.
  assert.ok(lat.rows.filter((x) => x.status === 'fehlt').every((x) => !x.sign_significant && !x.wilcoxon_significant));
  // The same campaign as block 2 gives an empty block 1.
  const { found: f2 } = matchCampaigns(plan, [campaign({ cellA: c4.a, cellB: c4.b, block: 2, measures: { latency_mean_ms: r } })]);
  assert.equal(sensitivityFamilies(plan, f2, 1).find((f) => f.measure === 'latency_mean_ms').measured, 0);
  assert.equal(sensitivityFamilies(plan, f2, 2).find((f) => f.measure === 'latency_mean_ms').measured, 1);
});
