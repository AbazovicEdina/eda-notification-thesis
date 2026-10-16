// Zustellungs- und Verbindungs-Buchführung pro Verbindung (DECISIONS.md
// 5.9, 5.17).
//
// Zustellung: Jedes Event trägt eine laufende Nummer `seq`
// (tools/event-simulator). Pro VU wird festgehalten, welche Nummern im
// Messfenster angekommen sind; daraus ergeben sich erwartete, verlorene und
// doppelte Events sowie die tatsächliche Senderate (aus den `ts`-Stempeln).
// "Erwartet" = alle Nummern zwischen dem ersten und dem letzten im
// Messfenster empfangenen Event. Verluste nach dem letzten empfangenen Event
// sind prinzipbedingt nicht erkennbar — bei einer Haltezeit weit über dem
// Event-Intervall vernachlässigbar, aber als Limitation zu nennen.
//
// Verbindung: Dauer bis zum Verbindungsaufbau (SSE: Antwort-Header
// empfangen, WS: Handshake abgeschlossen), Zahl der bis zum Beginn des
// Messfensters verbundenen Clients und Zahl der Clients, die im Messfenster
// mindestens ein Event erhalten haben ("bediente Clients").
import { Counter, Trend } from 'k6/metrics';

// Metriken müssen im Init-Kontext angelegt werden (k6-Regel), deshalb
// einmal pro Skript auf oberster Ebene aufrufen.
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

export function markConnected(metrics, tracker, window) {
  if (tracker.connectedAt !== null) return;
  tracker.connectedAt = Date.now();
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

// Nach Ende der Verbindung einmal pro VU aufrufen.
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
