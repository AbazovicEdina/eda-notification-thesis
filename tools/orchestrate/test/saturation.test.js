// Checks saturation.js (conditions of the saturation test, DECISIONS.md 5.17)
// on small constructed values.
// Run with: node --test tools/orchestrate/test/saturation.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessLevel, sustainableRate, assessSaturationConfig, rateLabel, sensitivitySentRate, SATURATION_CRITERIA } from '../saturation.js';

// Descriptive values of one level as run.js stores them, every value as median.
const describe = ({ delivery = 1, p95 = 50, source = null, served = 1, delivered = null, loadgen = 0.3, rate = 100, vus = 50 } = {}) => ({
  delivery_ratio: { median: delivery },
  latency_p95_ms: { median: p95 },
  source_rate_eps: { median: source ?? rate },
  served_ratio: { median: served },
  delivered_events_per_s: { median: delivered ?? vus * rate },
  loadgen_cpu_util_avg: { median: loadgen },
  loadgen_cpu_util_max: { median: loadgen == null ? null : loadgen + 0.1 },
  cpu_cores_avg: { median: 1.2 },
});
const level = (rate, opts = {}) => assessLevel({ rate, vus: 50, holdSeconds: 60, describe: describe({ rate, ...opts }) });

test('Stufe mit allen Bedingungen erfüllt ist bestanden', () => {
  const l = level(100);
  assert.equal(l.pass, true);
  assert.equal(l.evaluable, true);
  assert.deepEqual(l.reasons, []);
  assert.equal(l.source_ratio, 1);
  assert.equal(l.total_delivery_ratio, 1);
});

test('jede der fünf Bedingungen lässt eine Stufe allein durchfallen', () => {
  assert.deepEqual(level(100, { delivery: 0.98 }).reasons, ['Zustellung']);
  assert.deepEqual(level(100, { p95: 1001 }).reasons, ['p95-Latenz']);
  // The source sent only 98 % of the set rate.
  assert.deepEqual(level(1000, { source: 980 }).reasons, ['Senderate']);
  // 49 of 50 clients served are 98 %, so with 50 clients all must be served.
  assert.deepEqual(level(100, { served: 49 / 50 }).reasons, ['bediente Clients']);
  // A client that stops receiving early lowers only the total delivery.
  assert.deepEqual(level(100, { delivered: 50 * 100 * 0.98 }).reasons, ['Gesamtzustellung']);
  // Exactly on the limits still passes.
  assert.equal(level(1000, { delivery: 0.99, p95: 1000, source: 990, served: 0.99, delivered: 50 * 1000 * 0.99 }).pass, true);
});

test('Lastgenerator über 80 % oder unbekannt macht die Stufe nicht auswertbar', () => {
  const busy = level(700, { loadgen: 0.81 });
  assert.equal(busy.evaluable, false);
  assert.equal(busy.pass, false);
  assert.deepEqual(busy.reasons, ['Lastgenerator über 80 %']);
  assert.equal(level(700, { loadgen: 0.8 }).evaluable, true);
  const unknown = level(700, { loadgen: null });
  assert.equal(unknown.evaluable, false);
  assert.deepEqual(unknown.reasons, ['Auslastung des Lastgenerators unbekannt']);
});

test('fehlende Werte gelten nicht als erfüllt', () => {
  const l = assessLevel({ rate: 100, vus: 50, holdSeconds: 60, describe: { loadgen_cpu_util_avg: { median: 0.2 } } });
  assert.equal(l.pass, false);
  assert.deepEqual(l.reasons, ['Zustellung', 'p95-Latenz', 'Senderate', 'bediente Clients', 'Gesamtzustellung']);
});

test('höchste nachhaltige Rate und Grund für das Ende der Reihe', () => {
  const ok = (r) => level(r);
  // A failed level ends the series, later levels do not count.
  let res = sustainableRate([ok(10), ok(50), level(100, { served: 0.9 }), ok(200)]);
  assert.deepEqual(res, { max_sustainable_rate_per_s: 50, limit: 'criterion', stopped_at_rate_per_s: 100 });
  // A level that cannot be evaluated ends the series as a lower bound.
  res = sustainableRate([ok(10), ok(50), level(100, { loadgen: 0.9, served: 0.5 })]);
  assert.deepEqual(res, { max_sustainable_rate_per_s: 50, limit: 'loadgen', stopped_at_rate_per_s: 100 });
  // All levels passed, unsorted input.
  res = sustainableRate([ok(1000), ok(10), ok(500)]);
  assert.deepEqual(res, { max_sustainable_rate_per_s: 1000, limit: 'highest_rate', stopped_at_rate_per_s: null });
  // Already the first level failed.
  res = sustainableRate([level(10, { p95: 2000 })]);
  assert.deepEqual(res, { max_sustainable_rate_per_s: null, limit: 'criterion', stopped_at_rate_per_s: 10 });
});

test('Auswertung einer Kampagne aus aggregate.json und Beschriftung', () => {
  const agg = {
    scenarios: {
      'rate-0010': { vus: 50, hold_seconds: 60, configs: { 'node-minimal-ws': { describe: describe({ rate: 10 }) } } },
      'rate-0050': { vus: 50, hold_seconds: 60, configs: { 'node-minimal-ws': { describe: describe({ rate: 50, source: 45 }) } } },
    },
  };
  const steps = [
    { scenario: 'rate-0010', rate_per_s: 10, pass: true },
    // The campaign itself counted this level as passed, the source was too slow.
    { scenario: 'rate-0050', rate_per_s: 50, pass: true },
  ];
  const res = assessSaturationConfig(agg, 'node-minimal-ws', steps, { minDeliveryRatio: 0.99, maxP95LatencyMs: 1000 });
  assert.equal(res.max_sustainable_rate_per_s, 10);
  // Only the send rate was missed, so the next level is not attributable (DECISIONS.md 5.17,
  // rule of 2026-11-14, implemented on 2026-11-15). Before that this counted as 'criterion'.
  assert.equal(res.limit, 'source');
  assert.equal(res.stopped_at_rate_per_s, 50);
  assert.equal(res.steps[1].pass_campaign, true);
  assert.equal(res.steps[1].pass, false);
  assert.deepEqual(res.steps[1].reasons, ['Senderate']);
  assert.equal(res.criteria.minTotalDeliveryRatio, SATURATION_CRITERIA.minTotalDeliveryRatio);
  assert.equal(rateLabel(res), '≥ 10, 50 wegen zu niedriger Senderate nicht eindeutig bewertbar');
  assert.equal(rateLabel({ max_sustainable_rate_per_s: 500, limit: 'loadgen' }), '≥ 500 (Lastgenerator)');
  assert.equal(rateLabel({ max_sustainable_rate_per_s: null, limit: 'loadgen' }), 'nicht auswertbar (Lastgenerator)');
  assert.equal(rateLabel({ max_sustainable_rate_per_s: 1000, limit: 'highest_rate' }), '≥ 1000 (höchste Stufe)');
  assert.equal(rateLabel({ max_sustainable_rate_per_s: null, limit: 'criterion' }), 'keine');
});

test('nur die Senderate verfehlt: Untergrenze mit Grund source', () => {
  const res = sustainableRate([level(10), level(50), level(100, { source: 90 })]);
  assert.deepEqual(res, { max_sustainable_rate_per_s: 50, limit: 'source', stopped_at_rate_per_s: 100 });
  assert.equal(rateLabel(res), '≥ 50, 100 wegen zu niedriger Senderate nicht eindeutig bewertbar');
});

test('Senderate und eine weitere Bedingung verfehlt: Grenze der Variante', () => {
  // Gegenbeispiel: with the p95 latency also missed, the level is attributable as before.
  let res = sustainableRate([level(10), level(50), level(100, { source: 90, p95: 2000 })]);
  assert.deepEqual(res, { max_sustainable_rate_per_s: 50, limit: 'criterion', stopped_at_rate_per_s: 100 });
  assert.equal(rateLabel(res), '50');
  // Total delivery missed together with the send rate.
  res = sustainableRate([level(10), level(100, { source: 90, delivered: 50 * 80 })]);
  assert.equal(res.limit, 'criterion');
});

test('schon die erste Stufe nur an der Senderate verfehlt', () => {
  const res = sustainableRate([level(10, { source: 9 })]);
  assert.deepEqual(res, { max_sustainable_rate_per_s: null, limit: 'source', stopped_at_rate_per_s: 10 });
  assert.equal(rateLabel(res), '10 wegen zu niedriger Senderate nicht eindeutig bewertbar');
});

test('ein nicht auswertbarer Lastgenerator hat Vorrang vor der Senderate', () => {
  const res = sustainableRate([level(10), level(50, { source: 40, loadgen: 0.9 })]);
  assert.deepEqual(res, { max_sustainable_rate_per_s: 10, limit: 'loadgen', stopped_at_rate_per_s: 50 });
});

// Post-hoc sensitivity analysis of 2026-11-15 (DECISIONS.md 5.17).
test('Sensitivitätsanalyse: alles Gesendete zugestellt, nur die Senderate zu niedrig', () => {
  const steps = [level(700), level(1000, { source: 900, delivered: 50 * 900 })];
  const primary = sustainableRate(steps);
  assert.deepEqual(primary, { max_sustainable_rate_per_s: 700, limit: 'criterion', stopped_at_rate_per_s: 1000 });
  assert.deepEqual(steps[1].reasons, ['Senderate', 'Gesamtzustellung']);
  const sens = sensitivitySentRate(steps);
  assert.equal(sens.limit, 'source');
  assert.equal(sens.max_sustainable_rate_per_s, 700);
  assert.equal(sens.differs, true);
  assert.equal(sens.total_delivery_sent_ratio_at_stop, 1);
  assert.equal(rateLabel(sens), '≥ 700, 1000 wegen zu niedriger Senderate nicht eindeutig bewertbar');
});

test('Sensitivitätsanalyse ändert nichts, wenn eine weitere Bedingung verfehlt ist', () => {
  // Gegenbeispiel 1: the p95 latency is missed as well.
  let s = sensitivitySentRate([level(700), level(1000, { source: 900, delivered: 50 * 900, p95: 5000 })]);
  assert.equal(s.limit, 'criterion');
  assert.equal(s.differs, false);
  // Gegenbeispiel 2: fewer events arrived than were sent.
  s = sensitivitySentRate([level(700), level(1000, { source: 900, delivered: 50 * 800 })]);
  assert.equal(s.limit, 'criterion');
  assert.equal(s.differs, false);
  // Gegenbeispiel 3: every level passed.
  s = sensitivitySentRate([level(700), level(1000)]);
  assert.equal(s.limit, 'highest_rate');
  assert.equal(s.differs, false);
  // Gegenbeispiel 4: the load generator was not evaluable.
  s = sensitivitySentRate([level(700), level(1000, { source: 900, delivered: 50 * 900, loadgen: 0.9 })]);
  assert.equal(s.limit, 'loadgen');
  assert.equal(s.differs, false);
});

test('Sensitivitätsanalyse steht in der Auswertung einer Kampagne neben dem Hauptergebnis', () => {
  const agg = {
    scenarios: {
      'rate-0700': { vus: 50, hold_seconds: 60, configs: { 'php-minimal-sse': { describe: describe({ rate: 700 }) } } },
      'rate-1000': { vus: 50, hold_seconds: 60, configs: { 'php-minimal-sse': { describe: describe({ rate: 1000, source: 904, delivered: 50 * 904 }) } } },
    },
  };
  const steps = [{ scenario: 'rate-0700', rate_per_s: 700, pass: true }, { scenario: 'rate-1000', rate_per_s: 1000, pass: true }];
  const res = assessSaturationConfig(agg, 'php-minimal-sse', steps);
  assert.equal(res.limit, 'criterion');
  assert.equal(rateLabel(res), '700');
  assert.equal(res.sensitivity_sent_rate.limit, 'source');
  assert.equal(res.sensitivity_sent_rate.differs, true);
});
