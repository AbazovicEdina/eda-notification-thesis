// Bookkeeping of delivery and connection per connection (DECISIONS.md
// 5.9, 5.17).
//
// Delivery. Every event carries a sequence number `seq`
// (tools/event-simulator). Per VU the numbers that arrived within the
// measurement window are recorded. This yields expected, lost and duplicate
// events as well as the actual send rate (from the `ts` stamps).
// "Expected" = all numbers between the first and the last event received in
// the measurement window. Losses after the last received event cannot be
// detected by design. With a hold time far above the event interval this is
// negligible, but it is a limitation to mention.
//
// Connection. Time until the connection is established (SSE: response
// headers with HTTP 200 received, WS: handshake completed), number of
// clients connected by the start of the measurement window, and number of
// clients that received at least one event in the window ("served clients").
// An error page instead of the stream is not a connection.
import { Counter, Trend } from 'k6/metrics';

// Metrics must be created in the init context (k6 rule), so call this once
// per script at the top level.
export function deliveryMetrics(prefix) {
  return {
    expected: new Counter(`${prefix}_events_expected`),
    unique: new Counter(`${prefix}_events_unique`),
    lost: new Counter(`${prefix}_events_lost`),
    duplicate: new Counter(`${prefix}_events_duplicate`),
    sourceRate: new Trend(`${prefix}_source_rate_eps`),
    connectMs: new Trend(`${prefix}_connect_ms`, true),
    connectedInTime: new Counter(`${prefix}_clients_connected_in_time`),
    served: new Counter(`${prefix}_clients_served`),
  };
}

export function newTracker() {
  return {
    seen: new Set(),
    duplicates: 0,
    minSeq: null,
    maxSeq: null,
    firstTs: null,
    lastTs: null,
    connectStartedAt: Date.now(),
    connectedAt: null,
  };
}

// `at` is the time of the response. SSE only learns the status code after
// the connection has ended and therefore records the time afterwards.
export function markConnected(metrics, tracker, window, at = Date.now()) {
  if (tracker.connectedAt !== null) return;
  tracker.connectedAt = at;
  metrics.connectMs.add(tracker.connectedAt - tracker.connectStartedAt);
  if (tracker.connectedAt < window.start) metrics.connectedInTime.add(1);
}

export function track(tracker, data) {
  const seq = Number(data.seq);
  if (!Number.isFinite(seq)) return;
  if (tracker.seen.has(seq)) {
    tracker.duplicates += 1;
    return;
  }
  tracker.seen.add(seq);
  if (tracker.minSeq === null || seq < tracker.minSeq) {
    tracker.minSeq = seq;
    tracker.firstTs = data.ts;
  }
  if (tracker.maxSeq === null || seq > tracker.maxSeq) {
    tracker.maxSeq = seq;
    tracker.lastTs = data.ts;
  }
}

// Call once per VU after the connection has ended.
export function flush(metrics, tracker) {
  if (tracker.minSeq === null) return;
  const expected = tracker.maxSeq - tracker.minSeq + 1;
  const unique = tracker.seen.size;
  metrics.served.add(1);
  metrics.expected.add(expected);
  metrics.unique.add(unique);
  metrics.lost.add(Math.max(0, expected - unique));
  metrics.duplicate.add(tracker.duplicates);
  const spanMs = tracker.lastTs - tracker.firstTs;
  if (tracker.maxSeq > tracker.minSeq && spanMs > 0) {
    metrics.sourceRate.add((tracker.maxSeq - tracker.minSeq) / (spanMs / 1000));
  }
}
