// Assessment of the saturation test (DECISIONS.md 5.17), used by series.js.
//
// The campaign itself (run.js, saturationSummary) only checks the delivery
// ratio and the p95 latency. The further conditions, fixed on 2026-11-08
// before any saturation data existed, are evaluated here from the descriptive
// values that every campaign stores in aggregate.json. Neither the load
// generator nor the Pi needs a change for this.
//
// A level passes if, in the median of its measured runs,
//   1. at least 99 % of the events between the first and the last event a client
//      received arrived (delivery ratio, k6/lib/delivery.js),
//   2. the p95 latency is at most 1 000 ms,
//   3. the source sent at least 99 % of the set rate. k6 derives the send rate
//      per client from the sequence numbers and send timestamps of the events it
//      received, so lost events do not lower it,
//   4. at least 99 % of the clients were served, that is received at least one
//      event in the measurement window. With 50 clients this means all 50,
//   5. at least 99 % of all intended events arrived (total delivery, events
//      received divided by clients x set rate x hold time). It also catches a
//      client that stops receiving early, which conditions 1 and 4 cannot see.
// A level on which the load generator was busy more than 80 % of the time in the
// median, or whose load is unknown, cannot be evaluated. The result of a cell is
// the highest rate up to which every level passed, and why the series stopped.

export const SATURATION_CRITERIA = {
  minDeliveryRatio: 0.99,
  maxP95LatencyMs: 1000,
  minSourceRatio: 0.99,
  minServedRatio: 0.99,
  minTotalDeliveryRatio: 0.99,
  maxLoadgenUtil: 0.8,
};

const median = (describe, measure) => describe?.[measure]?.median ?? null;

// One level of one configuration. describe holds the descriptive values of the
// configuration in this level (aggregate.json, scenarios.<level>.configs.<config>.describe).
export function assessLevel({ rate, vus, holdSeconds, describe, criteria = SATURATION_CRITERIA }) {
  const c = { ...SATURATION_CRITERIA, ...criteria };
  const delivery = median(describe, 'delivery_ratio');
  const p95 = median(describe, 'latency_p95_ms');
  const source = median(describe, 'source_rate_eps');
  const served = median(describe, 'served_ratio');
  const deliveredPerS = median(describe, 'delivered_events_per_s');
  const loadgen = median(describe, 'loadgen_cpu_util_avg');
  const sourceRatio = source == null || !rate ? null : source / rate;
  const totalDelivery = deliveredPerS == null || !rate || !vus ? null : deliveredPerS / (vus * rate);
  const checks = {
    delivery: delivery != null && delivery >= c.minDeliveryRatio,
    p95: p95 != null && p95 <= c.maxP95LatencyMs,
    source: sourceRatio != null && sourceRatio >= c.minSourceRatio,
    served: served != null && served >= c.minServedRatio,
    total: totalDelivery != null && totalDelivery >= c.minTotalDeliveryRatio,
  };
  const names = { delivery: 'Zustellung', p95: 'p95-Latenz', source: 'Senderate', served: 'bediente Clients', total: 'Gesamtzustellung' };
  const evaluable = loadgen != null && loadgen <= c.maxLoadgenUtil;
  const reasons = [];
  if (loadgen == null) reasons.push('Auslastung des Lastgenerators unbekannt');
  else if (!evaluable) reasons.push(`Lastgenerator über ${Math.round(c.maxLoadgenUtil * 100)} %`);
  for (const [key, ok] of Object.entries(checks)) if (!ok) reasons.push(names[key]);
  return {
    rate_per_s: rate,
    hold_seconds: holdSeconds ?? null,
    delivery_ratio_median: delivery,
    latency_p95_median_ms: p95,
    source_rate_median_eps: source,
    source_ratio: sourceRatio,
    served_ratio_median: served,
    total_delivery_ratio: totalDelivery,
    loadgen_util_median: loadgen,
    loadgen_util_max_median: median(describe, 'loadgen_cpu_util_max'),
    cpu_cores_avg_median: median(describe, 'cpu_cores_avg'),
    checks,
    evaluable,
    pass: evaluable && Object.values(checks).every(Boolean),
    reasons,
  };
}

// Highest sustainable rate from the levels of one configuration.
// limit: "criterion" (a level failed), "loadgen" (a level could not be
// evaluated, the true limit is at least max), "highest_rate" (all levels
// passed, the true limit is at least the highest tested rate), "source" (the
// first failed level missed only the send rate of the source, which was
// measured and below 99 %, every other condition held). For "source" the next
// level cannot be attributed to the variant and the true limit is at least
// max. The cause of the low send rate is not determined (DECISIONS.md 5.17,
// rule of 2026-11-14, implemented on 2026-11-15). An unknown send rate is a
// failed condition like any other missing value and gives "criterion", so it
// is never reported as too low (changed on 2026-11-15 after the independent
// check, no level of the main data is affected).
export function sustainableRate(levels) {
  const sorted = [...levels].sort((a, b) => a.rate_per_s - b.rate_per_s);
  let max = null;
  for (const level of sorted) {
    if (!level.evaluable) return { max_sustainable_rate_per_s: max, limit: 'loadgen', stopped_at_rate_per_s: level.rate_per_s };
    if (!level.pass) {
      const onlySource = level.checks && level.checks.source === false && level.source_ratio != null
        && Object.entries(level.checks).every(([key, ok]) => key === 'source' || ok);
      return { max_sustainable_rate_per_s: max, limit: onlySource ? 'source' : 'criterion', stopped_at_rate_per_s: level.rate_per_s };
    }
    max = level.rate_per_s;
  }
  return { max_sustainable_rate_per_s: max, limit: sorted.length ? 'highest_rate' : null, stopped_at_rate_per_s: null };
}

// All levels of one configuration of a saturation campaign. summarySteps are the
// steps of run.js (aggregate.saturation.configs.<config>.steps), which name the
// level of each step. campaignCriteria are the criteria the campaign was run with.
export function assessSaturationConfig(agg, configName, summarySteps, campaignCriteria = {}) {
  const criteria = { ...SATURATION_CRITERIA, ...campaignCriteria };
  const steps = summarySteps.map((s) => {
    const level = agg.scenarios?.[s.scenario] ?? {};
    const assessed = assessLevel({
      rate: s.rate_per_s,
      vus: level.vus,
      holdSeconds: level.hold_seconds,
      describe: level.configs?.[configName]?.describe,
      criteria,
    });
    return { scenario: s.scenario, ...assessed, pass_campaign: s.pass };
  });
  return { criteria, steps, ...sustainableRate(steps), sensitivity_sent_rate: sensitivitySentRate(steps, criteria) };
}

// Post-hoc sensitivity analysis, defined on 2026-11-15 after the results were
// seen (DECISIONS.md 5.17). Not part of the primary result. A send rate below
// 99 % makes the total delivery, which is related to the set rate, fail as
// well, so the rule of 2026-11-14 ("only the send rate missed") cannot apply.
// Here the total delivery of every level is related to the events the source
// actually sent, all other conditions stay as in the primary assessment. A
// level that then misses only the send rate is not clearly assessable and the
// result becomes a lower bound. Where the source sent the set rate, the total
// delivery stays practically the same. Where its send rate is unknown, the
// total delivery counts as missed. The cause of a low send rate stays
// undetermined.
export function sensitivitySentRate(steps, criteria = SATURATION_CRITERIA) {
  const c = { ...SATURATION_CRITERIA, ...criteria };
  const alt = steps.map((s) => {
    const sentTotal = s.total_delivery_ratio != null && s.source_ratio ? s.total_delivery_ratio / s.source_ratio : null;
    const checks = { ...s.checks, total: sentTotal != null && sentTotal >= c.minTotalDeliveryRatio };
    return { ...s, checks, total_delivery_sent_ratio: sentTotal, pass: s.evaluable && Object.values(checks).every(Boolean) };
  });
  const primary = sustainableRate(steps);
  const result = sustainableRate(alt);
  const stop = alt.find((s) => s.rate_per_s === result.stopped_at_rate_per_s) ?? null;
  return {
    ...result,
    differs: result.max_sustainable_rate_per_s !== primary.max_sustainable_rate_per_s || result.limit !== primary.limit,
    total_delivery_sent_ratio_at_stop: stop?.total_delivery_sent_ratio ?? null,
  };
}

// Text for a table cell, for example "500", "≥ 700 (Lastgenerator)",
// "≥ 700, 1000 wegen zu niedriger Senderate nicht eindeutig bewertbar".
export function rateLabel(entry) {
  if (!entry) return '–';
  const max = entry.max_sustainable_rate_per_s;
  if (entry.limit === 'loadgen') return max == null ? 'nicht auswertbar (Lastgenerator)' : `≥ ${max} (Lastgenerator)`;
  if (entry.limit === 'source') {
    const at = entry.stopped_at_rate_per_s;
    return max == null ? `${at} wegen zu niedriger Senderate nicht eindeutig bewertbar` : `≥ ${max}, ${at} wegen zu niedriger Senderate nicht eindeutig bewertbar`;
  }
  if (entry.limit === 'highest_rate') return `≥ ${max} (höchste Stufe)`;
  return max == null ? 'keine' : String(max);
}
