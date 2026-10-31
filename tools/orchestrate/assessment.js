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

import { holmCorrection } from './stats.js';

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

// Replication (block 2 against block 1). Replicated if the direction of the
// median difference is the same and the 95 % intervals overlap. The effect
// class is reported but is not a condition (plan.json, decisionRules).
const sign = (v) => (v == null || v === 0 ? 0 : Math.sign(v));
export function replicationOf(r1, r2) {
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
      return { comparison_id: t1.comparison_id, scenario: t1.scenario, status: 'verglichen', ...replicationOf(r1, r2) };
    });
    const compared = rows.filter((r) => r.status === 'verglichen');
    return {
      measure: family.measure,
      compared: compared.length,
      same_direction: compared.filter((r) => r.same_direction).length,
      same_magnitude: compared.filter((r) => r.same_magnitude).length,
      ci_overlap: compared.filter((r) => r.ci_overlap).length,
      replicated: compared.filter((r) => r.replicated).length,
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
  const detail = `Median-Diff ${fmtNum(md)}, p (Holm) ${fmtNum(test.pHolm)}`;
  if (test.significant && Math.sign(md) === expect) return { label, outcome: OUTCOME.holds, detail };
  if (test.significant && Math.sign(md) === -expect) return { label, outcome: OUTCOME.opposite, detail };
  return { label, outcome: OUTCOME.unclear, detail: `${detail}, nicht signifikant` };
}

// G2, at most a small difference. Holds with |δ| < 0.33. Opposite only with
// |δ| ≥ 0.33 together with a significant difference (as worded in H2).
export function smallCase(test, label) {
  if (!usable(test)) return { label, outcome: OUTCOME.unclear, detail: unusableReason(test) };
  const d = test.result.cliffs_delta;
  const detail = `δ ${fmtNum(d)}, p (Holm) ${fmtNum(test.pHolm)}`;
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
  const detail = `Verhältnis der Mediane ${fmtNum(ratio, 2)}, p (Holm) ${fmtNum(test.pHolm)}`;
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
  const detail = `|Median-Diff| ${fmtNum(low)} bei 10 und ${fmtNum(high)} bei 500 Clients, p (Holm) ${fmtNum(testHigh.pHolm)}`;
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
export const TRANSPORT_PAIRS = ['node-minimal', 'node-express', 'php-minimal', 'php-laravel'];
export function assessH11(saturation) {
  if (!saturation) return [{ label: 'Sättigungstest', outcome: OUTCOME.unclear, detail: 'series.json fehlt' }];
  return TRANSPORT_PAIRS.map((base) => {
    const sse = saturation[`${base}-sse`];
    const ws = saturation[`${base}-ws`];
    const label = `${base}: WebSocket gegenüber SSE`;
    if (!sse || !ws) return { label, outcome: OUTCOME.unclear, detail: 'nicht gemessen' };
    const rs = sse.max_sustainable_rate_per_s ?? 0;
    const rw = ws.max_sustainable_rate_per_s ?? 0;
    const detail = `${rw} gegenüber ${rs} Events/s`;
    if (rw > rs) return { label, outcome: OUTCOME.holds, detail };
    if (rw < rs) return { label, outcome: OUTCOME.opposite, detail };
    return { label, outcome: OUTCOME.unclear, detail: `${detail}, Gleichstand` };
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
