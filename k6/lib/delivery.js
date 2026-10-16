// Zustellungs-Buchführung pro Verbindung (DECISIONS.md 5.17): Jedes Event
// trägt eine laufende Nummer `seq` (tools/event-simulator). Pro VU wird
// festgehalten, welche Nummern angekommen sind; daraus ergeben sich
// erwartete, verlorene und doppelte Events sowie die tatsächliche
// Senderate (aus den `ts`-Stempeln der Events selbst, nicht der
// eingestellten Rate).
//
// "Erwartet" = alle Nummern zwischen dem ersten und dem letzten bei dieser
// Verbindung angekommenen Event. Verluste ganz am Ende (nach dem letzten
// empfangenen Event) sind so prinzipbedingt nicht erkennbar — bei einer
// Haltezeit weit über dem Event-Intervall vernachlässigbar, aber als
// Limitation zu nennen.
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
  };
}

export function newTracker() {
  return { seen: new Set(), duplicates: 0, minSeq: null, maxSeq: null, firstTs: null, lastTs: null };
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
  metrics.expected.add(expected);
  metrics.unique.add(unique);
  metrics.lost.add(Math.max(0, expected - unique));
  metrics.duplicate.add(tracker.duplicates);
  const spanMs = tracker.lastTs - tracker.firstTs;
  if (tracker.maxSeq > tracker.minSeq && spanMs > 0) {
    metrics.sourceRate.add((tracker.maxSeq - tracker.minSeq) / (spanMs / 1000));
  }
}
