// Evaluation logic shared by evaluate.js and the unit tests (DECISIONS.md
// 5.8, 5.18). Pure functions without file access:
//   - assign the measured comparisons to the comparisons planned in plan.json
//   - Holm correction per family over all planned tests, missing ones with p = 1
//   - replication of block 1 by block 2
//   - assessment of hypotheses H1 to H11 with the general rules G1 to G4
//
// Each hypothesis is split into cases. A case is "erfüllt" (condition
// holds), "gegenteil" (the data show the opposite) or "unklar" (missing,
// fewer than 20 usable pairs, or not decidable). G4 combines the cases. A
// hypothesis is supported if all cases hold, not supported if at least one
// case shows the opposite, and undecided otherwise. What counts as the
// opposite for each kind of case is fixed in DECISIONS.md 5.18 and below.

import { holmCorrection, signTest, hodgesLehmann, skewness, linearTrendByRun, lag1AutocorrelationByRun, halfMediansByRun } from './stats.js';

export const VERDICT = { supported: 'bestätigt', notSupported: 'nicht bestätigt', undecided: 'unentschieden' };
export const OUTCOME = { holds: 'erfüllt', opposite: 'gegenteil', unclear: 'unklar' };

// PHP-FPM variants with Server-Sent Events (H4, H8)
export const FPM_SSE_CELLS = ['php-minimal-sse', 'php-laravel-sse', 'php-laravel-sse-queue'];
// Thresholds of H8 and the minimum number of runs per variant
export const H8_SUBSTANTIAL = 0.25;
export const H8_SMALL = 0.10;
export const MIN_PAIRS = 20;
// Drop of the served ratio between two consecutive steps that counts as a hard limit (H4)
export const H4_DROP = 0.05;
// Effect size threshold of G2
export const SMALL_DELTA = 0.33;

// ---------------------------------------------------------------------------
// Assignment, Holm correction, replication
// ---------------------------------------------------------------------------

// Bring the result of a campaign comparison into the planned direction (a = plan.a).
export function oriented(result, flipped) {
  if (!flipped || !result.wilcoxon) return result;
  const [lo, hi] = result.median_diff_ci95;
  return {
    ...result,
    wilcoxon: { ...result.wilcoxon, w_plus: result.wilcoxon.w_minus, w_minus: result.wilcoxon.w_plus },
    cliffs_delta: -result.cliffs_delta,
    rank_biserial: -result.rank_biserial,
    median_diff: result.median_diff == null ? null : -result.median_diff,
    median_diff_ci95: [hi == null ? null : -hi, lo == null ? null : -lo],
    pairs: { ...result.pairs, a: result.pairs.b, b: result.pairs.a },
  };
}

// Assign the comparisons of the campaigns to the planned ones, separately per
// block. Key `${planId}|${scenario}|${block}` -> { campaign, entry, flipped }.
export function matchCampaigns(plan, campaigns) {
  const found = new Map();
  const duplicates = [];
  const notes = [];
  for (const agg of campaigns) {
    const block = agg.block ?? 1;
    for (const [scenarioName, scenario] of Object.entries(agg.scenarios)) {
      if (scenario.incomplete) continue;
      for (const entry of scenario.comparisons) {
        const p = plan.comparisons.find((c) =>
          (c.a === entry.cell_a && c.b === entry.cell_b) || (c.a === entry.cell_b && c.b === entry.cell_a));
        if (!p) {
          notes.push(`${agg.campaign_dir}: Vergleich ${entry.cell_a} vs. ${entry.cell_b} ist nicht geplant — nicht in der Holm-Familie`);
          continue;
        }
        const key = `${p.id}|${scenarioName}|${block}`;
        if (found.has(key)) duplicates.push(`Vergleich ${p.id}, ${scenarioName}, Block ${block}: ${found.get(key).campaign.campaign_dir} und ${agg.campaign_dir}`);
        found.set(key, { campaign: agg, entry, flipped: p.a !== entry.cell_a });
      }
    }
  }
  return { found, duplicates, notes };
}

// All planned tests of one measure and block. Missing tests enter with p = 1,
// so that leaving tests out cannot make the correction milder.
export function testsFor(plan, found, measure, block) {
  const tests = [];
  for (const cmp of plan.comparisons) {
    for (const scenarioName of plan.scenarios) {
      const hit = found.get(`${cmp.id}|${scenarioName}|${block}`);
      const raw = hit?.entry.measures?.[measure];
      const result = raw?.wilcoxon ? oriented(raw, hit.flipped) : null;
      tests.push({
        comparison_id: cmp.id,
        question: cmp.question,
        a: cmp.a,
        b: cmp.b,
        scenario: scenarioName,
        campaign: hit?.campaign.campaign_dir ?? null,
        status: result ? (result.conclusive ? 'gemessen' : 'nicht aussagekräftig') : 'fehlt',
        pValue: result ? result.wilcoxon.p : 1,
        result,
      });
    }
  }
  return tests;
}

// Holm correction per family over all planned tests of the confirmatory block.
export function correctFamilies(plan, found) {
  return plan.families.map((family) => {
    const corrected = holmCorrection(testsFor(plan, found, family.measure, plan.confirmatoryBlock), plan.alpha);
    return { ...family, block: plan.confirmatoryBlock, alpha: plan.alpha, m: corrected.length, tests: corrected };
  });
}

// Sensitivity analysis of the paired test (DECISIONS.md 5.8, fixed on
// 2026-11-08 before block 2 was evaluated). The Wilcoxon signed-rank test
// assumes that the paired differences are roughly symmetric. Only then does a
// significant result speak about their median, otherwise about the
// Hodges-Lehmann pseudo-median. Per test this reports the skewness of the
// differences, the Hodges-Lehmann estimator and the exact sign test, which needs
// no symmetry and tests the median directly. Descriptive only, the decisions of
// the thesis stay with the Wilcoxon test (correctFamilies).
const dir = (v) => (v == null ? null : v > 0 ? 1 : v < 0 ? -1 : 0);
export function sensitivityOf(result) {
  const a = result?.pairs?.a;
  const b = result?.pairs?.b;
  if (!a?.length || a.length !== b?.length) return null;
  const diffs = a.map((v, i) => v - b[i]);
  const sign = signTest(a, b);
  const hl = hodgesLehmann(a, b);
  const skew = skewness(diffs);
  const median = result.median_diff ?? null;
  return {
    n_pairs: a.length,
    sign_test: { positive: sign.positive, negative: sign.negative, zeros: sign.zeros, p: sign.pValue },
    median_diff: median,
    hodges_lehmann: hl,
    iqr_diff: skew.iqr,
    // Distance between median and pseudo-median in interquartile ranges of the differences.
    median_hl_distance_iqr: skew.iqr > 0 && median != null ? Math.abs(hl - median) / skew.iqr : null,
    skew_bowley: skew.bowley,
    skew_moment: skew.moment,
    // All differences other than 0 point the same way, so the conclusion does not depend on the shape.
    all_same_sign: sign.n > 0 && (sign.positive === 0 || sign.negative === 0),
    direction: {
      median: dir(median),
      hodges_lehmann: dir(hl),
      wilcoxon: dir((result.wilcoxon?.w_plus ?? 0) - (result.wilcoxon?.w_minus ?? 0)),
      sign_test: dir(sign.positive - sign.negative),
    },
  };
}

// All planned tests of one block per family, with the Wilcoxon test and the
// sign test each Holm-corrected over the same 39 tests (missing ones with p = 1).
// For the confirmatory block the Wilcoxon column equals correctFamilies. For the
// replication block it is computed the same way for comparability, but it is
// descriptive and does not change the replication rule.
export function sensitivityFamilies(plan, found, block) {
  return plan.families.map((family) => {
    const tests = testsFor(plan, found, family.measure, block);
    const wilcoxon = holmCorrection(tests, plan.alpha);
    const sens = tests.map((t) => sensitivityOf(t.result));
    const sign = holmCorrection(tests.map((t, i) => ({ pValue: sens[i]?.sign_test.p ?? 1 })), plan.alpha);
    const rows = tests.map((t, i) => ({
      comparison_id: t.comparison_id,
      a: t.a,
      b: t.b,
      scenario: t.scenario,
      status: t.status,
      cliffs_delta: t.result?.cliffs_delta ?? null,
      wilcoxon_p: t.result ? t.pValue : null,
      wilcoxon_p_holm: wilcoxon[i].pHolm,
      wilcoxon_significant: wilcoxon[i].significant,
      sign_p_holm: sign[i].pHolm,
      sign_significant: sign[i].significant,
      ...(sens[i] ?? {}),
    }));
    const measured = rows.filter((r) => r.sign_test);
    const count = (f) => measured.filter(f).length;
    const band = (key, edges) => edges.map(([lo, hi]) => count((r) => r[key] != null && Math.abs(r[key]) >= lo && Math.abs(r[key]) < hi));
    return {
      measure: family.measure,
      block,
      alpha: plan.alpha,
      m: tests.length,
      measured: measured.length,
      summary: {
        both_significant: count((r) => r.wilcoxon_significant && r.sign_significant),
        only_wilcoxon: count((r) => r.wilcoxon_significant && !r.sign_significant),
        only_sign_test: count((r) => !r.wilcoxon_significant && r.sign_significant),
        neither: count((r) => !r.wilcoxon_significant && !r.sign_significant),
        // Bands of the absolute value: below 0.1, 0.1 to below 0.3, 0.3 to below 0.5, from 0.5.
        bowley_bands: band('skew_bowley', [[0, 0.1], [0.1, 0.3], [0.3, 0.5], [0.5, Infinity]]),
        bowley_undefined: count((r) => r.skew_bowley == null),
        // Bands of the absolute value: below 0.5, 0.5 to below 1, 1 to below 2, from 2.
        moment_bands: band('skew_moment', [[0, 0.5], [0.5, 1], [1, 2], [2, Infinity]]),
        // Bands in interquartile ranges: below 0.05, 0.05 to below 0.1, 0.1 to below 0.25, from 0.25.
        distance_bands: band('median_hl_distance_iqr', [[0, 0.05], [0.05, 0.1], [0.1, 0.25], [0.25, Infinity]]),
        median_vs_hodges_lehmann_opposite: count((r) => r.direction.median && r.direction.hodges_lehmann && r.direction.median !== r.direction.hodges_lehmann),
        wilcoxon_vs_sign_test_opposite: count((r) => r.direction.wilcoxon && r.direction.sign_test && r.direction.wilcoxon !== r.direction.sign_test),
        significant_median_against_wilcoxon: count((r) => r.wilcoxon_significant && r.direction.median && r.direction.median !== r.direction.wilcoxon),
        strongly_skewed: count((r) => r.skew_bowley != null && Math.abs(r.skew_bowley) >= 0.5),
        strongly_skewed_all_same_sign: count((r) => r.skew_bowley != null && Math.abs(r.skew_bowley) >= 0.5 && r.all_same_sign),
      },
      rows,
    };
  });
}

// Temporal diagnosis of the paired differences (DECISIONS.md 5.8, fixed on
// 2026-11-09 before block 2 was opened). Descriptive only. The classes are
// diagnostic labels. They are no test of independence and confirm no decision
// of the Wilcoxon test. The limit 2 / √n is a heuristic. A missing pair stays
// a gap (stats.js), and whatever cannot be determined is labeled as such
// instead of counting as unremarkable.
export const DIAGNOSIS = {
  none: 'ohne Befund',
  trend: 'nur linearer Trend',
  residual: 'Reststruktur',
  undetermined: 'nicht bestimmbar',
};
export const TEMPORAL_MIN_ADJACENT = 19;
export const TEMPORAL_HALF_BOUNDARY = 50;
export const TEMPORAL_MIN_PER_HALF = 10;

// Diagnosis of one paired result. Null if the result holds no paired values.
export function temporalDiagnosisOf(result) {
  const a = result?.pairs?.a;
  const b = result?.pairs?.b;
  const runs = result?.pairs?.run_indices;
  if (!a?.length || a.length !== b?.length || a.length !== runs?.length) return null;
  const diffs = a.map((v, i) => v - b[i]);
  const n = diffs.length;
  const expectedRuns = runs[n - 1] - runs[0] + 1;
  const counts = {
    n_pairs: n,
    run_first: runs[0],
    run_last: runs[n - 1],
    missing_runs_inside: expectedRuns - n,
    n_adjacent_pairs: lag1AutocorrelationByRun(diffs, runs).adjacentPairs,
  };
  const halves = halfMediansByRun(diffs, runs, TEMPORAL_HALF_BOUNDARY, TEMPORAL_MIN_PER_HALF);
  const halfCounts = { n_first_half: halves.n_first, n_second_half: halves.n_second };
  const blank = { limit: null, r1: null, r1_detrended: null, trend_share: null, median_change_between_halves: null };
  if (n < MIN_PAIRS) return { ...counts, ...halfCounts, ...blank, diagnosis: DIAGNOSIS.undetermined, reason: 'weniger als 20 gültige Paare' };
  if (counts.n_adjacent_pairs < TEMPORAL_MIN_ADJACENT) return { ...counts, ...halfCounts, ...blank, diagnosis: DIAGNOSIS.undetermined, reason: 'zu wenige Nachbarpaare' };

  const limit = 2 / Math.sqrt(n);
  const scale = diffs.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  const trend = linearTrendByRun(diffs, runs);
  const r1 = lag1AutocorrelationByRun(diffs, runs).r;
  const r1Detrended = trend.residualsFlat ? null : lag1AutocorrelationByRun(trend.residuals, runs, scale).r;
  let diagnosis;
  let reason = null;
  if (r1 == null) {
    diagnosis = DIAGNOSIS.undetermined;
    reason = 'konstante Reihe';
  } else if (r1Detrended == null) {
    diagnosis = DIAGNOSIS.undetermined;
    reason = 'keine Reste nach dem linearen Trend';
  } else if (r1Detrended > limit) {
    diagnosis = DIAGNOSIS.residual;
  } else if (r1 > limit) {
    diagnosis = DIAGNOSIS.trend;
  } else {
    diagnosis = DIAGNOSIS.none;
  }
  return {
    ...counts,
    ...halfCounts,
    limit,
    r1,
    r1_detrended: r1Detrended,
    trend_share: trend.trendShare,
    median_change_between_halves: halves.change,
    diagnosis,
    reason,
  };
}

// All planned tests of one block per measure. For the confirmatory block the
// overlap with the Holm decisions is counted as a plain count, for no other
// purpose than to make the numbers in DECISIONS.md 5.8 traceable.
export function temporalDiagnosisFamilies(plan, found, block) {
  return plan.families.map((family) => {
    const tests = testsFor(plan, found, family.measure, block);
    const holm = block === plan.confirmatoryBlock ? holmCorrection(tests, plan.alpha) : null;
    const rows = tests.map((t, i) => {
      const d = temporalDiagnosisOf(t.result);
      return {
        comparison_id: t.comparison_id,
        a: t.a,
        b: t.b,
        scenario: t.scenario,
        status: t.status,
        ...(d ?? { diagnosis: null }),
        ...(holm ? { holm_decision_of_main_analysis: holm[i].significant } : {}),
      };
    });
    const measured = rows.filter((r) => r.diagnosis);
    const countOf = (list) => Object.fromEntries(Object.values(DIAGNOSIS).map((k) => [k, list.filter((r) => r.diagnosis === k).length]));
    return {
      measure: family.measure,
      block,
      diagnoses: measured.length,
      with_gaps: measured.filter((r) => r.missing_runs_inside > 0).length,
      by_class: countOf(measured),
      by_class_among_holm_decisions: holm ? countOf(measured.filter((r) => r.holm_decision_of_main_analysis)) : null,
      rows,
    };
  });
}

// Median of one cell per campaign of a block and its range over the campaigns.
export function campaignSpread(plan, found, block) {
  const medians = new Map();
  for (const family of plan.families) {
    for (const cmp of plan.comparisons) {
      for (const scenario of plan.scenarios) {
        const hit = found.get(`${cmp.id}|${scenario}|${block}`);
        if (!hit) continue;
        for (const config of Object.values(hit.campaign.scenarios?.[scenario]?.configs ?? {})) {
          const value = config.describe?.[family.measure]?.median;
          if (value == null) continue;
          const key = `${config.cell}|${scenario}|${family.measure}`;
          if (!medians.has(key)) medians.set(key, []);
          medians.get(key).push(value);
        }
      }
    }
  }
  return new Map([...medians].map(([key, list]) => [key, { campaigns: list.length, range: Math.max(...list) - Math.min(...list) }]));
}

// Descriptive comparison of the two blocks. Difference of the estimates in
// units and in percent of block 1, and its ratio to the sum of the ranges of
// both cells over the campaigns of block 1, because the difference contains
// both cells. No decision follows from it, the replication rule is unchanged.
export function blockComparison(plan, found) {
  const spread = campaignSpread(plan, found, plan.confirmatoryBlock);
  return plan.families.map((family) => {
    const first = testsFor(plan, found, family.measure, plan.confirmatoryBlock);
    const second = testsFor(plan, found, family.measure, plan.replicationBlock);
    const rows = first.map((t, i) => {
      const r1 = t.result;
      const r2 = second[i].result;
      const base = { comparison_id: t.comparison_id, scenario: t.scenario };
      if (!r1 || !r2 || r1.median_diff == null || r2.median_diff == null) return { ...base, status: !r1 ? 'Block 1 fehlt' : 'Block 2 fehlt' };
      const difference = r2.median_diff - r1.median_diff;
      const rangeA = spread.get(`${t.a}|${t.scenario}|${family.measure}`)?.range ?? null;
      const rangeB = spread.get(`${t.b}|${t.scenario}|${family.measure}`)?.range ?? null;
      const rangeSum = rangeA == null || rangeB == null ? null : rangeA + rangeB;
      return {
        ...base,
        status: 'verglichen',
        median_block1: r1.median_diff,
        median_block2: r2.median_diff,
        difference,
        difference_percent_of_block1: r1.median_diff === 0 ? null : (100 * difference) / Math.abs(r1.median_diff),
        range_between_campaigns_a: rangeA,
        range_between_campaigns_b: rangeB,
        difference_to_range_sum: rangeSum ? Math.abs(difference) / rangeSum : null,
      };
    });
    return { measure: family.measure, compared: rows.filter((r) => r.status === 'verglichen').length, rows };
  });
}

// Process lifetimes per block. entries: { block, campaign, started_at, cell,
// services: { service: [start times] } }. A campaign counts as continued for a
// cell if a process of the cell has a start time that an earlier campaign of
// the same block already had.
export function processContinuity(entries) {
  const blocks = [...new Set(entries.map((e) => e.block))].sort((x, y) => x - y);
  return blocks.map((block) => {
    const list = entries.filter((e) => e.block === block).sort((x, y) => x.started_at.localeCompare(y.started_at));
    const seen = new Map();
    const cells = {};
    const continuedCampaigns = new Set();
    let restartedInside = 0;
    for (const e of list) {
      cells[e.cell] ??= { campaigns: 0, continued: 0 };
      cells[e.cell].campaigns++;
      let continued = false;
      for (const [service, starts] of Object.entries(e.services)) {
        if (starts.length > 1) restartedInside++;
        if (!seen.has(service)) seen.set(service, new Set());
        if (starts.some((s) => seen.get(service).has(s))) continued = true;
      }
      for (const [service, starts] of Object.entries(e.services)) starts.forEach((s) => seen.get(service).add(s));
      if (continued) {
        cells[e.cell].continued++;
        continuedCampaigns.add(e.campaign);
      }
    }
    return {
      block,
      campaigns: new Set(list.map((e) => e.campaign)).size,
      campaigns_with_continued_process: continuedCampaigns.size,
      services_restarted_inside_a_campaign: restartedInside,
      cells,
    };
  });
}

// Replication (block 2 against block 1). Replicated if the direction of the
// median difference is the same and the 95 % intervals overlap. The effect
// class is reported but is not a condition (plan.json, decisionRules). A
// median difference of exactly 0 is a direction of its own, so it only
// matches 0 (DECISIONS.md 5.8, made explicit on 2026-11-07).
// Also reported, only descriptively and without changing the rule, whether
// the interval of block 1 contains 0 and whether block 2 alone, without the
// Holm correction, is significant in the same direction.
const sign = (v) => (v == null || v === 0 ? 0 : Math.sign(v));
export function replicationOf(r1, r2, alpha = 0.05) {
  const [lo1, hi1] = r1.median_diff_ci95;
  const [lo2, hi2] = r2.median_diff_ci95;
  const sameDirection = sign(r1.median_diff) === sign(r2.median_diff);
  const ciOverlap = lo1 != null && lo2 != null && lo1 <= hi2 && lo2 <= hi1;
  return {
    delta_block1: r1.cliffs_delta,
    delta_block2: r2.cliffs_delta,
    same_direction: sameDirection,
    same_magnitude: r1.cliffs_magnitude === r2.cliffs_magnitude,
    ci_overlap: ciOverlap,
    replicated: sameDirection && ciOverlap,
    ci_block1_contains_zero: lo1 != null && hi1 != null && lo1 <= 0 && hi1 >= 0,
    block2_significant_same_direction: r2.wilcoxon?.p != null && r2.wilcoxon.p <= alpha
      && sign(r2.median_diff) !== 0 && sign(r2.median_diff) === sign(r1.median_diff),
  };
}

export function replicationSummary(plan, found) {
  return plan.families.map((family) => {
    const b1 = testsFor(plan, found, family.measure, plan.confirmatoryBlock);
    const b2 = testsFor(plan, found, family.measure, plan.replicationBlock);
    const rows = b1.map((t1, i) => {
      const r1 = t1.result;
      const r2 = b2[i].result;
      if (!r1 || !r2) return { comparison_id: t1.comparison_id, scenario: t1.scenario, status: !r1 ? 'Block 1 fehlt' : 'Block 2 fehlt' };
      return { comparison_id: t1.comparison_id, scenario: t1.scenario, status: 'verglichen', ...replicationOf(r1, r2, plan.alpha) };
    });
    const compared = rows.filter((r) => r.status === 'verglichen');
    return {
      measure: family.measure,
      compared: compared.length,
      same_direction: compared.filter((r) => r.same_direction).length,
      same_magnitude: compared.filter((r) => r.same_magnitude).length,
      ci_overlap: compared.filter((r) => r.ci_overlap).length,
      replicated: compared.filter((r) => r.replicated).length,
      ci_block1_contains_zero: compared.filter((r) => r.ci_block1_contains_zero).length,
      block2_significant_same_direction: compared.filter((r) => r.block2_significant_same_direction).length,
      rows,
    };
  });
}

// ---------------------------------------------------------------------------
// Inputs of the hypotheses
// ---------------------------------------------------------------------------

// Median of one measure for one cell in the campaign of a planned comparison
// (block 1), from the descriptive statistics of that campaign (G3).
export function cellMedian(found, plan, comparisonId, scenario, cell, measure) {
  const hit = found.get(`${comparisonId}|${scenario}|${plan.confirmatoryBlock}`);
  const configs = hit?.campaign.scenarios?.[scenario]?.configs ?? {};
  const config = Object.values(configs).find((c) => c.cell === cell);
  return config?.describe?.[measure]?.median ?? null;
}

// Median share of Redis in the CPU time per cell (H8), from single runs:
// [{ cell, cpu_seconds_redis, cpu_seconds_total }] of the valid, measured
// runs of block 1 at the stress level, across all campaigns of the cell.
export function redisShares(runs) {
  const byCell = new Map();
  for (const r of runs) {
    if (r.cpu_seconds_total == null || r.cpu_seconds_redis == null || r.cpu_seconds_total <= 0) continue;
    if (!byCell.has(r.cell)) byCell.set(r.cell, []);
    byCell.get(r.cell).push(r.cpu_seconds_redis / r.cpu_seconds_total);
  }
  const out = {};
  for (const [cell, shares] of byCell) {
    const s = [...shares].sort((x, y) => x - y);
    const mid = Math.floor(s.length / 2);
    out[cell] = { runs: s.length, median: s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2 };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Kinds of cases
// ---------------------------------------------------------------------------

const fmtNum = (v, d = 3) => (v == null ? '–' : Number(v).toFixed(d));
// p-values below 0.001 as "< 0.001", as in the test tables of evaluate.js.
const fmtP = (v) => (v == null ? '–' : v < 0.001 ? '< 0.001' : Number(v).toFixed(3));

// Look up the Holm-corrected test of a comparison, load level and measure.
function lookup(families, measure, comparisonId, scenario) {
  const test = families.find((f) => f.measure === measure)?.tests
    .find((t) => t.comparison_id === comparisonId && t.scenario === scenario);
  return test ?? null;
}

// Usable result: measured with at least MIN_PAIRS non-zero pairs (G4).
function usable(test) {
  return test?.result && test.result.conclusive && test.result.median_diff != null;
}

function unusableReason(test) {
  if (!test?.result) return 'fehlt';
  if (!test.result.conclusive) return `weniger als ${MIN_PAIRS} verwertbare Paare`;
  return 'keine Median-Differenz';
}

// G1, directional claim. `expect` is the expected sign of the median
// difference a − b (-1: a smaller, +1: a larger). Opposite: significant in the
// other direction.
export function directionalCase(test, expect, label) {
  if (!usable(test)) return { label, outcome: OUTCOME.unclear, detail: unusableReason(test) };
  const md = test.result.median_diff;
  const detail = `Median-Diff ${fmtNum(md)}, p (Holm) ${fmtP(test.pHolm)}`;
  if (test.significant && Math.sign(md) === expect) return { label, outcome: OUTCOME.holds, detail };
  if (test.significant && Math.sign(md) === -expect) return { label, outcome: OUTCOME.opposite, detail };
  return { label, outcome: OUTCOME.unclear, detail: `${detail}, nicht signifikant` };
}

// G2, at most a small difference. Holds with |δ| < 0.33. Opposite only with
// |δ| ≥ 0.33 together with a significant difference (as worded in H2).
export function smallCase(test, label) {
  if (!usable(test)) return { label, outcome: OUTCOME.unclear, detail: unusableReason(test) };
  const d = test.result.cliffs_delta;
  const detail = `δ ${fmtNum(d)}, p (Holm) ${fmtP(test.pHolm)}`;
  if (Math.abs(d) < SMALL_DELTA) return { label, outcome: OUTCOME.holds, detail };
  if (test.significant) return { label, outcome: OUTCOME.opposite, detail };
  return { label, outcome: OUTCOME.unclear, detail: `${detail}, nicht signifikant` };
}

// G3, a multiple. `larger` is 'a' or 'b', the side expected to be at least
// twice as large. Holds if the ratio of the medians is ≥ 2 and the difference
// is significant in that direction. Opposite if the ratio is below 2.
export function multipleCase(test, medianA, medianB, larger, label) {
  if (!usable(test)) return { label, outcome: OUTCOME.unclear, detail: unusableReason(test) };
  if (medianA == null || medianB == null || (larger === 'a' ? medianB : medianA) <= 0) {
    return { label, outcome: OUTCOME.unclear, detail: 'Mediane fehlen' };
  }
  const ratio = larger === 'a' ? medianA / medianB : medianB / medianA;
  const expect = larger === 'a' ? 1 : -1;
  const detail = `Verhältnis der Mediane ${fmtNum(ratio, 2)}, p (Holm) ${fmtP(test.pHolm)}`;
  if (ratio < 2) return { label, outcome: OUTCOME.opposite, detail };
  if (test.significant && Math.sign(test.result.median_diff) === expect) return { label, outcome: OUTCOME.holds, detail };
  return { label, outcome: OUTCOME.unclear, detail: `${detail}, nicht signifikant` };
}

// Comparison of two effects (H5, H7). The effect is the median difference
// b − a, i.e. the extra cost of the second variant. Holds if the first effect
// is larger and, if `requireSignificant`, the first test is significant.
// Opposite if the first effect is not larger.
export function largerEffectCase(testFirst, testSecond, label, { requireSignificant = false } = {}) {
  if (!usable(testFirst)) return { label, outcome: OUTCOME.unclear, detail: unusableReason(testFirst) };
  if (!usable(testSecond)) return { label, outcome: OUTCOME.unclear, detail: unusableReason(testSecond) };
  const first = -testFirst.result.median_diff;
  const second = -testSecond.result.median_diff;
  const detail = `Effekt ${fmtNum(first)} gegenüber ${fmtNum(second)}`;
  if (first <= second) return { label, outcome: OUTCOME.opposite, detail };
  if (requireSignificant && !testFirst.significant) return { label, outcome: OUTCOME.unclear, detail: `${detail}, nicht signifikant` };
  return { label, outcome: OUTCOME.holds, detail };
}

// H3, growth of the latency difference from 10 to 500 clients. Holds if the
// absolute median difference is larger at 500 clients and significant there.
// Opposite if it is not larger.
export function growthCase(testLow, testHigh, label) {
  if (!usable(testLow)) return { label, outcome: OUTCOME.unclear, detail: `10 Clients: ${unusableReason(testLow)}` };
  if (!usable(testHigh)) return { label, outcome: OUTCOME.unclear, detail: `500 Clients: ${unusableReason(testHigh)}` };
  const low = Math.abs(testLow.result.median_diff);
  const high = Math.abs(testHigh.result.median_diff);
  const detail = `|Median-Diff| ${fmtNum(low)} bei 10 und ${fmtNum(high)} bei 500 Clients, p (Holm) ${fmtP(testHigh.pHolm)}`;
  if (high <= low) return { label, outcome: OUTCOME.opposite, detail };
  if (!testHigh.significant) return { label, outcome: OUTCOME.unclear, detail: `${detail}, nicht signifikant` };
  return { label, outcome: OUTCOME.holds, detail };
}

// G4, combination of the cases of one hypothesis.
export function combine(cases) {
  const counts = { [OUTCOME.holds]: 0, [OUTCOME.opposite]: 0, [OUTCOME.unclear]: 0 };
  for (const c of cases) counts[c.outcome] += 1;
  let verdict = VERDICT.undecided;
  if (counts[OUTCOME.opposite] > 0) verdict = VERDICT.notSupported;
  else if (cases.length > 0 && counts[OUTCOME.holds] === cases.length) verdict = VERDICT.supported;
  return { verdict, counts };
}

// ---------------------------------------------------------------------------
// Series (H4, H11)
// ---------------------------------------------------------------------------

// Client count of the first step whose served ratio is at least H4_DROP below
// that of the previous step, or null.
export function firstDrop(steps) {
  const sorted = [...(steps ?? [])].sort((x, y) => x.clients - y.clients);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].served_ratio_median;
    const cur = sorted[i].served_ratio_median;
    if (prev != null && cur != null && prev - cur >= H4_DROP - 1e-12) return sorted[i].clients;
    if (prev != null && cur == null) return sorted[i].clients;
  }
  return null;
}

// H4. The PHP-FPM variants with SSE have the lowest capacity limits of all
// variants, each of them shows a hard limit, and no other variant shows such
// a drop up to the highest step at which a PHP-FPM variant has its drop.
// A capacity limit that was not reached counts as higher than every measured one.
export function assessH4(scaling, allCells) {
  if (!scaling) return [{ label: 'Skalierungsreihe', outcome: OUTCOME.unclear, detail: 'series.json fehlt' }];
  const cases = [];
  const missing = allCells.filter((c) => !scaling[c]);
  if (missing.length) cases.push({ label: 'alle Varianten gemessen', outcome: OUTCOME.unclear, detail: `fehlt: ${missing.join(', ')}` });
  const limit = (c) => scaling[c]?.first_clients_below_criterion ?? Infinity;
  const others = allCells.filter((c) => !FPM_SSE_CELLS.includes(c) && scaling[c]);
  const fpm = FPM_SSE_CELLS.filter((c) => scaling[c]);
  if (fpm.length && others.length) {
    const maxFpm = Math.max(...fpm.map(limit));
    const minOther = Math.min(...others.map(limit));
    const detail = `höchste Grenze PHP-FPM ${maxFpm === Infinity ? 'nicht erreicht' : maxFpm}, niedrigste der übrigen ${minOther === Infinity ? 'nicht erreicht' : minOther}`;
    const outcome = maxFpm < minOther ? OUTCOME.holds : maxFpm > minOther ? OUTCOME.opposite : OUTCOME.unclear;
    cases.push({ label: 'niedrigste Kapazitätsgrenzen bei PHP-FPM/SSE', outcome, detail });
  }
  const drops = Object.fromEntries(allCells.map((c) => [c, scaling[c] ? firstDrop(scaling[c].steps) : null]));
  for (const c of fpm) {
    cases.push(drops[c] != null
      ? { label: `harte Grenze ${c}`, outcome: OUTCOME.holds, detail: `Abfall um mindestens 5 Prozentpunkte bei ${drops[c]} Clients` }
      : { label: `harte Grenze ${c}`, outcome: OUTCOME.opposite, detail: 'kein Abfall um 5 Prozentpunkte zwischen zwei Stufen' });
  }
  const fpmDrops = fpm.map((c) => drops[c]);
  const upTo = fpmDrops.length && fpmDrops.every((d) => d != null) ? Math.max(...fpmDrops) : null;
  for (const c of others) {
    const label = `kein Sprung ${c}`;
    if (upTo == null) cases.push({ label, outcome: OUTCOME.unclear, detail: 'keine harte Grenze bei PHP-FPM als Bezug' });
    else if (drops[c] != null && drops[c] <= upTo) cases.push({ label, outcome: OUTCOME.opposite, detail: `Abfall bei ${drops[c]} Clients (Bezug ${upTo})` });
    else cases.push({ label, outcome: OUTCOME.holds, detail: `kein Abfall bis ${upTo} Clients` });
  }
  return cases;
}

// H11. In each pair of an SSE and a WebSocket variant with the same language
// and framework choice, the WebSocket variant reaches the higher maximum
// sustainable rate. A tie is undecided. No sustainable rate at all counts as 0.
// A rate that is only a lower bound (series.js, saturation.js: all levels passed,
// or the series ended at a level the load generator could not serve) decides
// only if it already lies above the other rate. Otherwise the pair is undecided,
// as the rule says for two variants that both reach the highest level.
export const TRANSPORT_PAIRS = ['node-minimal', 'node-express', 'php-minimal', 'php-laravel'];
const isLowerBound = (entry) => entry.limit === 'loadgen' || entry.limit === 'highest_rate';
export function assessH11(saturation) {
  if (!saturation) return [{ label: 'Sättigungstest', outcome: OUTCOME.unclear, detail: 'series.json fehlt' }];
  return TRANSPORT_PAIRS.map((base) => {
    const sse = saturation[`${base}-sse`];
    const ws = saturation[`${base}-ws`];
    const label = `${base}: WebSocket gegenüber SSE`;
    if (!sse || !ws) return { label, outcome: OUTCOME.unclear, detail: 'nicht gemessen' };
    const rs = sse.max_sustainable_rate_per_s ?? 0;
    const rw = ws.max_sustainable_rate_per_s ?? 0;
    const bs = isLowerBound(sse);
    const bw = isLowerBound(ws);
    const detail = `${bw ? 'mindestens ' : ''}${rw} gegenüber ${bs ? 'mindestens ' : ''}${rs} Events/s`;
    if (rw > rs && !bs) return { label, outcome: OUTCOME.holds, detail };
    if (rw < rs && !bw) return { label, outcome: OUTCOME.opposite, detail };
    if (rw === rs && !bs && !bw) return { label, outcome: OUTCOME.unclear, detail: `${detail}, Gleichstand` };
    return { label, outcome: OUTCOME.unclear, detail: `${detail}, Untergrenze, Reihenfolge offen` };
  });
}

// ---------------------------------------------------------------------------
// Hypotheses H1 to H11 (plan.json, rule)
// ---------------------------------------------------------------------------

const LOW = 'baseline';
const HIGH = 'stress';
const LAT = 'latency_mean_ms';
const CPU = 'cpu_seconds_total';
const MEM = 'working_set_peak_bytes_total';
const CONN = 'connect_mean_ms';

// families: result of correctFamilies. found: result of matchCampaigns.
// redis: result of redisShares. series: series.json or null.
export function assessHypotheses({ plan, families, found, redis = null, series = null }) {
  const t = (measure, id, scenario) => lookup(families, measure, id, scenario);
  const cmp = (id) => plan.comparisons.find((c) => c.id === id);
  const levels = plan.scenarios;
  const allCells = [...new Set(plan.comparisons.flatMap((c) => [c.a, c.b]))];
  const cases = {};

  // H1: comparisons 1 and 3 at 500 clients, PHP (b) at least twice Node.js (a).
  cases.H1 = [1, 3].map((id) => multipleCase(
    t(MEM, id, HIGH),
    cellMedian(found, plan, id, HIGH, cmp(id).a, MEM),
    cellMedian(found, plan, id, HIGH, cmp(id).b, MEM),
    'b', `Vergleich ${id}, Working Set bei 500 Clients`,
  ));

  // H2: all 13 comparisons at 10 clients, latency at most a small difference.
  cases.H2 = plan.comparisons.map((c) => smallCase(t(LAT, c.id, LOW), `Vergleich ${c.id}, Latenz bei 10 Clients`));

  // H3: comparisons 1 to 4, the latency difference grows from 10 to 500 clients.
  cases.H3 = [1, 2, 3, 4].map((id) => growthCase(t(LAT, id, LOW), t(LAT, id, HIGH), `Vergleich ${id}, Latenz`));

  // H4: scaling series.
  cases.H4 = assessH4(series?.scaling ?? null, allCells);

  // H5: comparisons 5 to 8. Latency at most small on all levels. For connection
  // setup and working set the Laravel effect (7 for SSE, 8 for WS) is larger
  // than the Express effect (5 for SSE, 6 for WS) and significant.
  cases.H5 = [
    ...[5, 6, 7, 8].flatMap((id) => levels.map((s) => smallCase(t(LAT, id, s), `Vergleich ${id}, Latenz, ${s}`))),
    ...[[7, 5, 'SSE'], [8, 6, 'WS']].flatMap(([laravel, express, transport]) => [CONN, MEM].flatMap((m) => levels.map((s) =>
      largerEffectCase(t(m, laravel, s), t(m, express, s), `${transport}, ${m}, ${s}: Laravel-Effekt größer als Express-Effekt`, { requireSignificant: true })))),
  ];

  // H6: comparison 4, php-laravel-ws (b) has a higher latency on all levels.
  cases.H6 = levels.map((s) => directionalCase(t(LAT, 4, s), -1, `Vergleich 4, Latenz, ${s}`));

  // H7: comparisons 9 and 10, the queue variant (b) has a higher latency on all
  // levels, and the queue effect is larger for Laravel than for BullMQ.
  cases.H7 = [
    ...[9, 10].flatMap((id) => levels.map((s) => directionalCase(t(LAT, id, s), -1, `Vergleich ${id}, Latenz, ${s}`))),
    ...levels.map((s) => largerEffectCase(t(LAT, 10, s), t(LAT, 9, s), `${s}: Queue-Effekt Laravel größer als BullMQ`)),
  ];

  // H8: share of Redis in the CPU time at 500 clients per variant, over all
  // valid runs of block 1.
  cases.H8 = allCells.map((cell) => {
    const fpm = FPM_SSE_CELLS.includes(cell);
    const label = `${cell}, ${fpm ? 'mindestens 25 %' : 'unter 10 %'}`;
    const r = redis?.[cell];
    if (!r || r.runs < MIN_PAIRS) return { label, outcome: OUTCOME.unclear, detail: r ? `nur ${r.runs} Läufe` : 'keine Läufe' };
    const detail = `Median ${(100 * r.median).toFixed(1)} % aus ${r.runs} Läufen`;
    const holds = fpm ? r.median >= H8_SUBSTANTIAL : r.median < H8_SMALL;
    return { label, outcome: holds ? OUTCOME.holds : OUTCOME.opposite, detail };
  });

  // H9: comparison 12, SSE (a) has a lower CPU time and a smaller working set on all levels.
  cases.H9 = [CPU, MEM].flatMap((m) => levels.map((s) => directionalCase(t(m, 12, s), -1, `Vergleich 12, ${m}, ${s}`)));

  // H10: comparison 13 at 500 clients, SSE (a) at least twice the working set of WebSocket (b).
  cases.H10 = [multipleCase(
    t(MEM, 13, HIGH),
    cellMedian(found, plan, 13, HIGH, cmp(13).a, MEM),
    cellMedian(found, plan, 13, HIGH, cmp(13).b, MEM),
    'a', 'Vergleich 13, Working Set bei 500 Clients',
  )];

  // H11: saturation test.
  cases.H11 = assessH11(series?.saturation ?? null);

  return plan.hypotheses.map((h) => {
    const list = cases[h.id] ?? [{ label: 'keine Regel umgesetzt', outcome: OUTCOME.unclear, detail: '' }];
    return { id: h.id, text: h.text, rule: h.rule, ...combine(list), cases: list };
  });
}
