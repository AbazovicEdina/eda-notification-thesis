// WebSocket load test for the cells with raw JSON over WS (node-minimal,
// node-express, php-minimal, native k6/ws). Same measurement principle as
// the SSE test, measurement window after the settle time, latency =
// receive − ts, delivery and connection setup via k6/lib/delivery.js.
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, holdScenario, measurementWindow, staggerStart } from '../lib/config.js';
import { deliveryMetrics, newTracker, markConnected, track, flush } from '../lib/delivery.js';

const eventLatency = new Trend('ws_event_latency_ms');
const eventsReceived = new Counter('ws_events_received');
const delivery = deliveryMetrics('ws');

export const options = holdScenario();

export default function () {
  staggerStart();
  const url = `${BASE_URL.replace(/^http/, 'ws')}/ws`;
  const window = measurementWindow();
  const tracker = newTracker();

  const response = ws.connect(url, {}, (socket) => {
    socket.on('open', () => markConnected(delivery, tracker, window));
    socket.on('message', (message) => {
      const now = Date.now();
      // Close at the first event after the measurement window, exactly like the
      // SSE script, so that both transports serve the same number of events per
      // run (second run of 2026-11-16).
      if (now >= window.end) {
        socket.close();
        return;
      }
      if (now < window.start) return;
      const data = JSON.parse(message);
      eventLatency.add(now - data.ts);
      eventsReceived.add(1);
      track(tracker, data);
    });
    // Fallback only, in case no event arrives after the window. Normally the
    // first event after the window closes the connection (see above).
    socket.setTimeout(() => socket.close(), Math.max(0, window.end - Date.now()) + 5000);
  });

  flush(delivery, tracker);
  check(response, { 'WS-Handshake: HTTP 101': (r) => r && r.status === 101 });
}
