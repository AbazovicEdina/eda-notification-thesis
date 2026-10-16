// Gemeinsame Konfiguration aller k6-Szenarien.
// Alle Werte kommen aus Umgebungsvariablen (docker compose / .env) —
// nichts hartcodiert, damit derselbe Test lokal und gegen den Pi läuft.
export const BASE_URL = __ENV.K6_TARGET_BASE_URL || 'http://sse-feasibility:8081';
export const VUS = Number(__ENV.K6_VUS || 50);
export const HOLD_SECONDS = Number(__ENV.K6_HOLD_SECONDS || 60);

// Ein Szenario-Muster für alle Verbindungs-Haltetests (SSE wie WS):
// jede VU hält genau eine Verbindung über HOLD_SECONDS.
export function holdScenario() {
  return {
    scenarios: {
      hold: {
        executor: 'per-vu-iterations',
        vus: VUS,
        iterations: 1,
        maxDuration: `${HOLD_SECONDS + 15}s`,
      },
    },
  };
}
