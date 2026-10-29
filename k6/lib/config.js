// Shared configuration of all k6 scenarios.
// All values come from environment variables (docker compose, tools/orchestrate),
// so that the same test runs locally and against the Pi.
import exec from 'k6/execution';
import { sleep } from 'k6';

// Without a trailing slash. The scripts append "/sse" or "/ws", and the cells
// answer "//sse" with 404.
export const BASE_URL = (__ENV.K6_TARGET_BASE_URL || 'http://sse-feasibility:8081').replace(/\/+$/, '');
export const VUS = Number(__ENV.K6_VUS || 50);
export const HOLD_SECONDS = Number(__ENV.K6_HOLD_SECONDS || 60);
// Settle time (DECISIONS.md 5.9). The clients connect during this phase, so
// its events reflect the connection phase rather than delivery in normal
// operation and are not counted.
export const SETTLE_SECONDS = Number(__ENV.K6_SETTLE_SECONDS || 10);
// Spread connects (DECISIONS.md 5.10, option 5). With a value above 0, VU n
// starts only after (n - 1) / VUS times this duration, so the clients
// connect evenly spread instead of at the same moment. The default 0 means
// all connect at once (storm). tools/orchestrate ensures that the spread is
// complete before the end of the settle time.
export const CONNECT_SPREAD_SECONDS = Number(__ENV.K6_CONNECT_SPREAD_SECONDS || 0);

// Call at the start of every iteration, before newTracker(), so that the
// waiting time does not count towards the measured connection setup time.
export function staggerStart() {
  if (CONNECT_SPREAD_SECONDS > 0 && VUS > 1) {
    sleep(((exec.vu.idInTest - 1) / VUS) * CONNECT_SPREAD_SECONDS);
  }
}

// One scenario pattern for all connection hold tests (SSE and WS). Each VU
// holds exactly one connection for settle time + hold time.
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

// Measurement window in epoch milliseconds, the same for all VUs (shared
// scenario start). Only [start, end) is counted.
export function measurementWindow() {
  const scenarioStart = exec.scenario.startTime;
  const start = scenarioStart + SETTLE_SECONDS * 1000;
  return { start, end: start + HOLD_SECONDS * 1000 };
}
