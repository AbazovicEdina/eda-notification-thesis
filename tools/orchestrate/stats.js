// Statistical evaluation functions for tools/orchestrate (DECISIONS.md 5.8).
// Deliberately without an external statistics library (consistent with the
// other tools of this thesis). Each function is small enough to be followed
// when reviewing the thesis. Sources are listed in LITERATUR.md.
// Checked against examples calculated by hand in test/stats.test.js
// (`node --test tools/orchestrate/test/stats.test.js`).

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

// Percentile by the nearest-rank method (no interpolation).
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

// Descriptive statistics of a per-run distribution (DECISIONS.md 5.8,
// question 9: mean, min, max, standard deviation and variance in addition
// to median, p95 and p99).
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

// Reproducible random number generator (mulberry32) for the bootstrap. The
// same seed gives the same resamples and thus the same confidence interval
// on every re-evaluation (DECISIONS.md 5.8). Math.random() cannot be seeded.
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

// Cumulative distribution function of the standard normal distribution,
// approximation by Abramowitz & Stegun (1964), formula 7.1.26, error < 1.5e-7.
function normalCdf(z) {
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.SQRT2;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * z);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

// Exact null distribution of the rank sum W+ for n ranks 1..n (without ties).
// counts[s] is the number of the 2^n sign combinations with W+ = s.
// Exact in double precision up to n = 50 (2^50 < 2^53).
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

// Wilcoxon signed-rank test (paired, two-sided, Wilcoxon 1945) on arrays of
// equal length that are already paired, a[i] <-> b[i] (the caller pairs by
// run number, DECISIONS.md 5.8). Differences of exactly 0 are discarded
// (Wilcoxon's original procedure).
//   - without ties and n <= 50, exact p-value from the null distribution
//   - otherwise normal approximation with continuity correction and tie
//     correction of the variance (Σ(t³ − t)/48 per tie group of |d|)
// Also returns the rank-biserial correlation for paired data (Kerby 2014),
// r = (W+ − W−) / (W+ + W−), the effect size that matches the test
// (positive means a tends to be larger than b).
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

  // Mean ranks for ties, tie groups for the variance correction.
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

// Cliff's delta (Cliff 1993) as effect size, a dominance statistic over all
// combinations of both samples, δ = (#(a_i > b_j) − #(a_i < b_j)) / (n_a · n_b).
// Positive means a tends to be larger. Classification according to Romano,
// Kromrey, Coraggio & Skowronek (2006), fixed before looking at the results.
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

// ---------------------------------------------------------------------------
// Sensitivity analysis of the paired test (DECISIONS.md 5.8, fixed on
// 2026-11-08 before block 2 was evaluated). Descriptive only, the Wilcoxon
// signed-rank test stays the planned test. All functions work on the paired
// differences a[i] − b[i] and treat differences of exactly 0 as stated below.
// ---------------------------------------------------------------------------

// Quantile with linear interpolation between order statistics, the default
// of R (type 7). sortedAsc must be sorted, q lies between 0 and 1.
export function quantileLinear(sortedAsc, q) {
  if (sortedAsc.length === 0) return null;
  const h = (sortedAsc.length - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.min(lo + 1, sortedAsc.length - 1);
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (h - lo);
}

function logChoose(n, k) {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}

// Exact two-sided sign test (Fisher). Differences of exactly 0 are dropped, as
// in the Wilcoxon test. Under the null hypothesis the median of the differences
// is 0, the test needs no symmetry of the differences.
export function signTest(a, b) {
  if (a.length !== b.length) throw new Error('signTest erwartet gepaarte Arrays gleicher Länge');
  let positive = 0;
  let negative = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    if (d > 0) positive++;
    else if (d < 0) negative++;
  }
  const n = positive + negative;
  const zeros = a.length - n;
  if (n === 0) return { n, zeros, positive, negative, pValue: 1 };
  const k = Math.min(positive, negative);
  let tail = 0;
  for (let i = 0; i <= k; i++) tail += Math.exp(logChoose(n, i) - n * Math.LN2);
  return { n, zeros, positive, negative, pValue: Math.min(1, 2 * tail) };
}

// Hodges-Lehmann estimator of the paired differences, the median of all Walsh
// averages (d_i + d_j) / 2 with i ≤ j over all differences, zeros included. It
// is the location estimate that belongs to the Wilcoxon signed-rank test (the
// pseudo-median). With symmetric differences it equals their median.
export function hodgesLehmann(a, b) {
  if (a.length !== b.length) throw new Error('hodgesLehmann erwartet gepaarte Arrays gleicher Länge');
  const d = a.map((v, i) => v - b[i]);
  if (d.length === 0) return null;
  const walsh = [];
  for (let i = 0; i < d.length; i++) {
    for (let j = i; j < d.length; j++) walsh.push((d[i] + d[j]) / 2);
  }
  return median(walsh);
}

// Skewness of a sample. Bowley's quartile skewness (Q3 + Q1 − 2 Q2) / (Q3 − Q1)
// with quartiles from quantileLinear, null if the interquartile range is 0. It
// lies between −1 and 1 and is robust against single extreme values. Moment
// skewness m3 / m2^1.5 with population moments, 0 if all values are equal.
export function skewness(values) {
  if (values.length === 0) return { bowley: null, moment: null, iqr: null };
  const s = [...values].sort((x, y) => x - y);
  const q1 = quantileLinear(s, 0.25);
  const q2 = quantileLinear(s, 0.5);
  const q3 = quantileLinear(s, 0.75);
  const iqr = q3 - q1;
  const m = values.reduce((x, y) => x + y, 0) / values.length;
  const m2 = values.reduce((x, y) => x + (y - m) ** 2, 0) / values.length;
  const m3 = values.reduce((x, y) => x + (y - m) ** 3, 0) / values.length;
  return { bowley: iqr > 0 ? (q3 + q1 - 2 * q2) / iqr : null, moment: m2 > 0 ? m3 / m2 ** 1.5 : 0, iqr };
}

// Nonparametric bootstrap (Efron & Tibshirani 1993, percentile method) for
// the confidence interval of the median of the paired differences
// a[i] − b[i]. `seed` makes the result reproducible.
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

// Holm correction (Holm 1979) for a family of tests fixed in advance
// (DECISIONS.md 5.8, 5.15). Controls the family-wise error rate under any
// dependence between the tests. `tests` is an array of { pValue, ... }.
// Returns the same array, extended by `holmAlpha` (threshold at this rank),
// `pHolm` (Holm-adjusted p-value) and `significant` (sequential, from the
// first non-significant rank onward nothing is significant).
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

// Complete comparison of two configurations for ONE measure on paired
// values (same index = same run number). Below `minPairs` usable pairs
// (difference ≠ 0) the result is marked as not conclusive instead of
// silently reporting p = 1.
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

// ---------------------------------------------------------------------------
// Temporal diagnostics of the paired differences (DECISIONS.md 5.8, fixed on
// 2026-11-09 before block 2 was opened). Descriptive only. These functions
// neither test independence nor produce intervals or p-values. All of them
// work on the real run numbers, so a missing pair stays a gap and the runs are
// never renumbered as if they had been contiguous.
// ---------------------------------------------------------------------------

// Relative tolerance below which a series counts as constant. Rounding errors
// of a mean or of a fitted line must not look like variation.
const FLAT_TOLERANCE = 1e-10;

function assertSeries(values, runIndices) {
  if (values.length !== runIndices.length) throw new Error('Werte und Laufnummern müssen gleich lang sein');
  for (let i = 1; i < runIndices.length; i++) {
    if (runIndices[i] <= runIndices[i - 1]) throw new Error('Laufnummern müssen streng aufsteigen');
  }
}

function largestMagnitude(values) {
  return values.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
}

// Least-squares line over the real run numbers. trendShare is the share of the
// variance the line explains, null for a constant series. residualsFlat says
// that nothing but rounding error is left after the line.
export function linearTrendByRun(values, runIndices) {
  assertSeries(values, runIndices);
  if (values.length < 3) return null;
  const meanX = mean(runIndices);
  const meanY = mean(values);
  let sxx = 0;
  let sxy = 0;
  let sst = 0;
  for (let i = 0; i < values.length; i++) {
    sxx += (runIndices[i] - meanX) ** 2;
    sxy += (runIndices[i] - meanX) * (values[i] - meanY);
    sst += (values[i] - meanY) ** 2;
  }
  const slope = sxy / sxx;
  const residuals = values.map((v, i) => v - meanY - slope * (runIndices[i] - meanX));
  const ssr = residuals.reduce((sum, r) => sum + r * r, 0);
  const limit = (FLAT_TOLERANCE * largestMagnitude(values)) ** 2 * values.length;
  const constant = sst <= limit;
  return {
    slope,
    residuals,
    trendShare: constant ? null : 1 - ssr / sst,
    constant,
    residualsFlat: ssr <= limit,
  };
}

// Autocorrelation at lag 1 over the real run numbers. Only pairs whose run
// numbers differ by exactly 1 enter the numerator, adjacentPairs counts them.
// All values enter the mean and the denominator. The factor (n − 1) / m makes
// up for the missing products and equals 1 for a series without gaps, where
// this is the usual estimator. r is null for a constant series or without any
// adjacent pair. flatScale is the magnitude that defines "constant", for
// residuals the magnitude of the original values.
export function lag1AutocorrelationByRun(values, runIndices, flatScale = largestMagnitude(values)) {
  assertSeries(values, runIndices);
  const n = values.length;
  if (n === 0) return { r: null, adjacentPairs: 0 };
  const center = mean(values);
  let denominator = 0;
  for (const v of values) denominator += (v - center) ** 2;
  let numerator = 0;
  let adjacentPairs = 0;
  for (let i = 0; i + 1 < n; i++) {
    if (runIndices[i + 1] === runIndices[i] + 1) {
      numerator += (values[i] - center) * (values[i + 1] - center);
      adjacentPairs++;
    }
  }
  const flat = denominator <= (FLAT_TOLERANCE * flatScale) ** 2 * n;
  if (flat || adjacentPairs === 0) return { r: null, adjacentPairs };
  return { r: ((n - 1) / adjacentPairs) * (numerator / denominator), adjacentPairs };
}

// Medians of the two chronological halves, split at a fixed run number. The
// halves may differ in size. change is the second median minus the first and
// null if a half has fewer than minPerHalf observations.
export function halfMediansByRun(values, runIndices, boundary, minPerHalf) {
  assertSeries(values, runIndices);
  const first = values.filter((_, i) => runIndices[i] <= boundary);
  const second = values.filter((_, i) => runIndices[i] > boundary);
  const usable = first.length >= minPerHalf && second.length >= minPerHalf;
  return {
    n_first: first.length,
    n_second: second.length,
    median_first: first.length ? median(first) : null,
    median_second: second.length ? median(second) : null,
    change: usable ? median(second) - median(first) : null,
  };
}
