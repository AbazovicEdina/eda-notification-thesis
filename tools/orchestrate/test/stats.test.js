// Prüft stats.js und pairing.js gegen von Hand gerechnete Werte.
// Ausführen: node --test tools/orchestrate/test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  describe, median, createRng, wilcoxonSignedRank, cliffsDelta,
  bootstrapMedianDiffCI, holmCorrection, comparePaired,
} from '../stats.js';
import { pairByRunIndex } from '../pairing.js';

const close = (actual, expected, eps = 1e-4) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} ≉ ${expected}`);

test('describe: Mittelwert, Median (gerade n), Stichproben-Varianz', () => {
  const d = describe([1, 2, 3, 4]);
  assert.equal(d.n, 4);
  assert.equal(d.mean, 2.5);
  assert.equal(d.median, 2.5);
  close(d.variance, 1.6667); // Σ(x − 2,5)² / (n − 1) = 5 / 3
  assert.equal(d.min, 1);
  assert.equal(d.max, 4);
});

test('describe ignoriert null und NaN', () => {
  assert.equal(describe([1, null, NaN, 3]).n, 2);
});

test('Wilcoxon exakt, n = 5, alle Differenzen positiv: p = 2/32', () => {
  const w = wilcoxonSignedRank([2, 3, 4, 5, 6], [1, 1, 1, 1, 1]);
  assert.equal(w.method, 'exakt');
  assert.equal(w.W, 0);
  close(w.pValue, 0.0625);
  assert.equal(w.rankBiserial, 1);
});

test('Wilcoxon exakt, n = 6, W = 0: p = 2/64 (Tabellen-Kritischwert für α = 0,05)', () => {
  const w = wilcoxonSignedRank([2, 3, 4, 5, 6, 7], [1, 1, 1, 1, 1, 1]);
  close(w.pValue, 0.03125);
});

test('Wilcoxon exakt, n = 6, W = 2: p = 2 · 3/64', () => {
  // Differenzen 1, −2, 3, 4, 5, 6 -> W− = 2; Teilmengen der Ränge mit
  // Summe ≤ 2: {}, {1}, {2} -> 3 von 64
  const w = wilcoxonSignedRank([2, 1, 4, 5, 6, 7], [1, 3, 1, 1, 1, 1]);
  assert.equal(w.W, 2);
  close(w.pValue, 0.09375);
});

test('Wilcoxon mit Bindungen: Normalapproximation mit Bindungskorrektur', () => {
  // Differenzen −2, 2, −5, 2, −5 -> |d| 2,2,2 (Rang 2) und 5,5 (Rang 4,5)
  // W+ = 4, W− = 11, W = 4; Var = 5·6·11/24 − (3³−3 + 2³−2)/48 = 13,125
  // z = (|4 − 7,5| − 0,5) / √13,125 = 0,8281 -> p = 0,4077
  const w = wilcoxonSignedRank([10, 20, 30, 40, 50], [12, 18, 35, 38, 55]);
  assert.equal(w.wPlus, 4);
  assert.equal(w.wMinus, 11);
  assert.match(w.method, /Normalapproximation/);
  close(w.z, 0.8281);
  close(w.pValue, 0.4077, 5e-4);
  close(w.rankBiserial, (4 - 11) / 15);
});

test('Wilcoxon verwirft Differenzen von 0 und meldet sie', () => {
  const w = wilcoxonSignedRank([1, 1, 2], [1, 1, 1]);
  assert.equal(w.n, 1);
  assert.equal(w.zeros, 2);
});

test('Wilcoxon verlangt gepaarte Arrays gleicher Länge', () => {
  assert.throws(() => wilcoxonSignedRank([1, 2], [1]));
});

test("Cliff's Delta und Einordnung nach Romano et al. (2006)", () => {
  // a = 1,2,3 vs. b = 2,3,4: 1× a > b, 6× a < b -> (1 − 6)/9
  const c = cliffsDelta([1, 2, 3], [2, 3, 4]);
  close(c.delta, -5 / 9);
  assert.equal(c.magnitude, 'groß');
  assert.equal(cliffsDelta([1, 2], [1, 2]).magnitude, 'vernachlässigbar');
});

test('Holm: Schwellen, Abbruch und adjustierte p-Werte', () => {
  const r = holmCorrection([{ pValue: 0.01 }, { pValue: 0.04 }, { pValue: 0.03 }, { pValue: 0.005 }], 0.05);
  assert.deepEqual(r.map((t) => t.significant), [true, false, false, true]);
  close(r[3].holmAlpha, 0.0125);
  close(r[0].holmAlpha, 0.05 / 3);
  // adjustiert: 4·0,005 = 0,02; 3·0,01 = 0,03; 2·0,03 = 0,06; max(0,06, 1·0,04) = 0,06
  assert.deepEqual(r.map((t) => Number(t.pHolm.toFixed(4))), [0.03, 0.06, 0.06, 0.02]);
});

test('Bootstrap ist mit gleichem Seed reproduzierbar', () => {
  const a = [5, 7, 9, 4, 6, 8, 7, 5];
  const b = [4, 6, 7, 4, 5, 6, 6, 5];
  const x = bootstrapMedianDiffCI(a, b, { resamples: 2000, seed: 42 });
  const y = bootstrapMedianDiffCI(a, b, { resamples: 2000, seed: 42 });
  assert.deepEqual(x.ci, y.ci);
  assert.equal(x.medianDiff, median([1, 1, 2, 0, 1, 2, 1, 0]));
  assert.ok(x.ci[0] <= x.medianDiff && x.medianDiff <= x.ci[1]);
});

test('createRng: deterministisch und im Bereich [0, 1)', () => {
  const r1 = createRng(7);
  const r2 = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const v = r1();
    assert.equal(v, r2());
    assert.ok(v >= 0 && v < 1);
  }
});

test('comparePaired markiert zu wenige verwertbare Paare als nicht aussagekräftig', () => {
  const res = comparePaired([1, 1, 1, 2], [1, 1, 1, 1], { resamples: 100, minPairs: 3 });
  assert.equal(res.n_pairs, 4);
  assert.equal(res.n_pairs_nonzero, 1);
  assert.equal(res.conclusive, false);
});

test('Paarbildung über die Laufnummer: ein Ausfall verschiebt nichts', () => {
  const run = (i, v, valid = true) => ({ run_index: i, valid, v });
  const A = [run(6, 10), run(7, 11), run(8, 99, false), run(9, 13), run(10, 14)];
  const B = [run(6, 20), run(7, 21), run(8, 22), run(9, 23), run(10, 24)];
  const p = pairByRunIndex(A, B, (r) => r.v);
  assert.deepEqual(p.indices, [6, 7, 9, 10]);
  assert.deepEqual(p.a, [10, 11, 13, 14]);
  assert.deepEqual(p.b, [20, 21, 23, 24]);
  assert.deepEqual(p.dropped, [8]);
});

test('Paarbildung: fehlender Messwert (null) zählt als unvollständiges Paar', () => {
  const A = [{ run_index: 1, valid: true, v: null }, { run_index: 2, valid: true, v: 3 }];
  const B = [{ run_index: 1, valid: true, v: 1 }, { run_index: 2, valid: true, v: 4 }, { run_index: 3, valid: true, v: 5 }];
  const p = pairByRunIndex(A, B, (r) => r.v);
  assert.deepEqual(p.indices, [2]);
  assert.deepEqual(p.dropped, [1, 3]);
});
