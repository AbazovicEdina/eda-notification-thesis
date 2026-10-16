// Statistische Auswertungsfunktionen für tools/orchestrate (DECISIONS.md 5.8).
// Bewusst ohne externe Statistik-Bibliothek (konsistent mit den übrigen
// Tools dieser Arbeit) — jede Funktion ist einzeln klein genug, um sie beim
// Gegenlesen der Arbeit nachzuvollziehen. Quellen: siehe LITERATUR.md.
// Gegen von Hand gerechnete Beispiele geprüft: test/stats.test.js
// (`node --test "tools/orchestrate/test/*.test.js"`).

export function mean(values) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function variance(values) {
  if (values.length < 2) return null;
  const m = mean(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
}

export function stddev(values) {
  const v = variance(values);
  return v == null ? null : Math.sqrt(v);
}

// Perzentil nach der Nearest-Rank-Methode (kein Interpolieren).
export function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return null;
  return n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

// Deskriptive Kennzahlen einer Pro-Lauf-Verteilung (DECISIONS.md 5.8, zu
// Frage 9: Mittelwert/Min/Max/Standardabweichung/Varianz zusätzlich zu
// Median/p95/p99).
export function describe(values) {
  const sorted = [...values].filter((v) => v != null && Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { n: 0, mean: null, min: null, max: null, median: null, p95: null, p99: null, stddev: null, variance: null };
  }
  return {
    n: sorted.length,
    mean: mean(sorted),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: median(sorted),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    stddev: stddev(sorted),
    variance: variance(sorted),
  };
}

// Reproduzierbarer Zufallsgenerator (mulberry32) für den Bootstrap: gleicher
// Startwert -> gleiche Resamples -> gleiches Konfidenzintervall bei jeder
// Neuauswertung (DECISIONS.md 5.8). Math.random() ist nicht seedbar.
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Standardnormalverteilung, kumulative Dichtefunktion — Näherung nach
// Abramowitz & Stegun (1964), Formel 7.1.26, Fehler < 1.5e-7.
function normalCdf(z) {
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.SQRT2;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * z);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

// Exakte Nullverteilung der Rangsumme W+ für n Ränge 1..n (ohne Bindungen):
// counts[s] = Anzahl der 2^n Vorzeichenkombinationen mit W+ = s.
// Bis n = 50 in double-Genauigkeit exakt (2^50 < 2^53).
function exactSignedRankCounts(n) {
  const maxSum = (n * (n + 1)) / 2;
  const counts = new Array(maxSum + 1).fill(0);
  counts[0] = 1;
  for (let r = 1; r <= n; r++) {
    for (let s = maxSum; s >= r; s--) counts[s] += counts[s - r];
  }
  return counts;
}

const EXACT_MAX_N = 50;

// Wilcoxon-Vorzeichen-Rang-Test (gepaart, zweiseitig; Wilcoxon 1945) auf
// gleich langen, bereits gepaarten Arrays a[i] <-> b[i] (Paarbildung über
// die Laufnummer macht der Aufrufer, DECISIONS.md 5.8). Differenzen von
// exakt 0 werden verworfen (Wilcoxons ursprüngliches Verfahren).
//   - ohne Bindungen und n <= 50: exakter p-Wert aus der Nullverteilung
//   - sonst: Normalapproximation mit Stetigkeits- und Bindungskorrektur
//     der Varianz (Σ(t³ − t)/48 je Bindungsgruppe der |d|).
// Zusätzlich die rangbiseriale Korrelation für gepaarte Daten (Kerby 2014):
// r = (W+ − W−) / (W+ + W−), das zum Test passende Effektmaß
// (positiv = a tendenziell größer als b).
export function wilcoxonSignedRank(a, b) {
  if (a.length !== b.length) throw new Error('wilcoxonSignedRank erwartet gepaarte Arrays gleicher Länge');
  const diffs = [];
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    if (d !== 0) diffs.push(d);
  }
  const n = diffs.length;
  const zeros = a.length - n;
  if (n < 1) {
    return { n: 0, zeros, wPlus: 0, wMinus: 0, W: null, z: null, pValue: 1, method: 'keine Differenzen ≠ 0', rankBiserial: 0 };
  }

  const abs = diffs.map((d) => Math.abs(d));
  const order = abs.map((v, i) => i).sort((i, j) => abs[i] - abs[j]);

  // Mittlere Ränge bei Bindungen; Bindungsgruppen für die Varianzkorrektur.
  const ranks = new Array(n);
  let tieCorrection = 0;
  let hasTies = false;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && abs[order[j + 1]] === abs[order[i]]) j++;
    const t = j - i + 1;
    if (t > 1) {
      hasTies = true;
      tieCorrection += t ** 3 - t;
    }
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) ranks[order[k]] = avgRank;
    i = j + 1;
  }

  let wPlus = 0, wMinus = 0;
  for (let k = 0; k < n; k++) {
    if (diffs[k] > 0) wPlus += ranks[k];
    else wMinus += ranks[k];
  }
  const W = Math.min(wPlus, wMinus);
  const rankBiserial = (wPlus - wMinus) / (wPlus + wMinus);

  if (!hasTies && n <= EXACT_MAX_N) {
    const counts = exactSignedRankCounts(n);
    const total = 2 ** n;
    let tail = 0;
    for (let s = 0; s <= W; s++) tail += counts[s];
    return { n, zeros, wPlus, wMinus, W, z: null, pValue: Math.min(1, (2 * tail) / total), method: 'exakt', rankBiserial };
  }

  const meanW = (n * (n + 1)) / 4;
  const varW = (n * (n + 1) * (2 * n + 1)) / 24 - tieCorrection / 48;
  const z = varW > 0 ? Math.max(0, Math.abs(W - meanW) - 0.5) / Math.sqrt(varW) : 0;
  const pValue = 2 * (1 - normalCdf(z));
  return { n, zeros, wPlus, wMinus, W, z, pValue: Math.min(1, pValue), method: 'Normalapproximation (Bindungs- und Stetigkeitskorrektur)', rankBiserial };
}

// Cliff's Delta (Cliff 1993) als Effektstärke — Dominanz-Statistik über alle
// Kombinationen beider Stichproben: δ = (#(a_i > b_j) − #(a_i < b_j)) / (n_a · n_b).
// Positiv = a tendenziell größer. Einordnung nach Romano, Kromrey,
// Coraggio & Skowronek (2006), vor Sichtung der Ergebnisse festgelegt.
export function cliffsDelta(a, b) {
  let gt = 0, lt = 0;
  for (const x of a) {
    for (const y of b) {
      if (x > y) gt++;
      else if (x < y) lt++;
    }
  }
  const n = a.length * b.length;
  const delta = n === 0 ? 0 : (gt - lt) / n;
  return { delta, magnitude: cliffsMagnitude(delta) };
}

export function cliffsMagnitude(delta) {
  const absD = Math.abs(delta);
  if (absD < 0.147) return 'vernachlässigbar';
  if (absD < 0.33) return 'klein';
  if (absD < 0.474) return 'mittel';
  return 'groß';
}

// Nichtparametrischer Bootstrap (Efron & Tibshirani 1993, Perzentil-
// Methode) für das Konfidenzintervall des Medians der gepaarten
// Differenzen a[i] − b[i]. `seed` macht das Ergebnis reproduzierbar.
export function bootstrapMedianDiffCI(a, b, { resamples = 10000, alpha = 0.05, seed = 1 } = {}) {
  if (a.length !== b.length) throw new Error('bootstrapMedianDiffCI erwartet gepaarte Arrays gleicher Länge');
  const n0 = a.length;
  if (n0 === 0) return { ci: [null, null], medianDiff: null, resamples, seed };
  const rng = createRng(seed);
  const diffs = Array.from({ length: n0 }, (_, i) => a[i] - b[i]);
  const medianDiff = median(diffs);

  const resampleMedians = new Array(resamples);
  const sample = new Array(n0);
  for (let r = 0; r < resamples; r++) {
    for (let k = 0; k < n0; k++) {
      sample[k] = diffs[Math.floor(rng() * n0)];
    }
    resampleMedians[r] = median(sample);
  }
  resampleMedians.sort((x, y) => x - y);
  const lo = percentile(resampleMedians, (alpha / 2) * 100);
  const hi = percentile(resampleMedians, (1 - alpha / 2) * 100);
  return { ci: [lo, hi], medianDiff, resamples, seed };
}

// Holm-Korrektur (Holm 1979) für eine vorab festgelegte Familie von Tests
// (DECISIONS.md 5.8/5.15). Kontrolliert die familienweise Fehlerrate bei
// beliebiger Abhängigkeit zwischen den Tests. `tests`: Array von
// { pValue, ... }. Rückgabe: dasselbe Array, ergänzt um `holmAlpha`
// (Schwelle an dieser Rangstelle), `pHolm` (Holm-adjustierter p-Wert) und
// `significant` (sequentiell — ab der ersten nicht-signifikanten
// Rangstelle ist alles Weitere nicht signifikant).
export function holmCorrection(tests, alpha = 0.05) {
  const m = tests.length;
  const order = tests.map((t, i) => i).sort((i, j) => tests[i].pValue - tests[j].pValue);
  const result = tests.map((t) => ({ ...t, holmAlpha: null, pHolm: null, significant: false }));
  let stopped = false;
  let runningMax = 0;
  order.forEach((origIdx, rank) => {
    const p = tests[origIdx].pValue;
    result[origIdx].holmAlpha = alpha / (m - rank);
    runningMax = Math.max(runningMax, Math.min(1, (m - rank) * p));
    result[origIdx].pHolm = runningMax;
    if (!stopped && p <= alpha / (m - rank)) {
      result[origIdx].significant = true;
    } else {
      stopped = true;
    }
  });
  return result;
}

// Vollständiger Vergleich zweier Konfigurationen für EINE Messgröße auf
// gepaarten Werten (gleicher Index = gleiche Laufnummer). `minPairs`: unter
// dieser Zahl verwertbarer Paare (Differenz ≠ 0) wird das Ergebnis als
// nicht aussagekräftig markiert statt kommentarlos p = 1 zu melden.
export function comparePaired(a, b, { resamples = 10000, seed = 1, minPairs = 10 } = {}) {
  const w = wilcoxonSignedRank(a, b);
  const cliff = cliffsDelta(a, b);
  const ci = bootstrapMedianDiffCI(a, b, { resamples, seed });
  return {
    n_pairs: a.length,
    n_pairs_nonzero: w.n,
    n_pairs_zero_diff: w.zeros,
    conclusive: w.n >= minPairs,
    wilcoxon: { W: w.W, w_plus: w.wPlus, w_minus: w.wMinus, z: w.z, p: w.pValue, method: w.method },
    cliffs_delta: cliff.delta,
    cliffs_magnitude: cliff.magnitude,
    rank_biserial: w.rankBiserial,
    median_diff: ci.medianDiff,
    median_diff_ci95: ci.ci,
    bootstrap: { resamples: ci.resamples, seed: ci.seed },
  };
}
