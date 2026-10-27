// Gemeinsame Konfiguration aller k6-Szenarien.
// Alle Werte kommen aus Umgebungsvariablen (docker compose / tools/orchestrate),
// damit derselbe Test lokal und gegen den Pi läuft.
import exec from 'k6/execution';

// Ohne abschließenden Schrägstrich: Die Skripte hängen "/sse" bzw. "/ws" an,
// und "//sse" beantworten die Zellen mit 404.
export const BASE_URL = (__ENV.K6_TARGET_BASE_URL || 'http://sse-feasibility:8081').replace(/\/+$/, '');
export const VUS = Number(__ENV.K6_VUS || 50);
export const HOLD_SECONDS = Number(__ENV.K6_HOLD_SECONDS || 60);
// Einschwingzeit (DECISIONS.md 5.9): Alle VUs verbinden sich zu Beginn
// gleichzeitig. Events dieser Phase messen den Verbindungsansturm, nicht die
// Zustellung im Normalbetrieb, und werden deshalb nicht gewertet.
export const SETTLE_SECONDS = Number(__ENV.K6_SETTLE_SECONDS || 10);

// Ein Szenario-Muster für alle Verbindungs-Haltetests (SSE wie WS): jede VU
// hält genau eine Verbindung über Einschwingzeit + Haltezeit.
export function holdScenario() {
  return {
    scenarios: {
      hold: {
        executor: 'per-vu-iterations',
        vus: VUS,
        iterations: 1,
        maxDuration: `${SETTLE_SECONDS + HOLD_SECONDS + 15}s`,
      },
    },
  };
}

// Messfenster in Epoch-Millisekunden, für alle VUs gleich (gemeinsamer
// Szenario-Start): gewertet wird nur [start, end).
export function measurementWindow() {
  const scenarioStart = exec.scenario.startTime;
  const start = scenarioStart + SETTLE_SECONDS * 1000;
  return { start, end: start + HOLD_SECONDS * 1000 };
}
