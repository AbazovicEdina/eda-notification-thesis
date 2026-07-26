// Grundgerüst für den WebSocket-Lasttest (natives k6/ws) — Session 2
// vervollständigt es gegen die echten Prototyp-Endpunkte. Gleiches Messprinzip
// wie beim SSE-Test: Event-Payload {"seq":n,"ts":<ms-epoch>}, Latenz = Empfang − ts.
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, HOLD_SECONDS, holdScenario } from '../lib/config.js';

const eventLatency = new Trend('ws_event_latency_ms');
const eventsReceived = new Counter('ws_events_received');

export const options = holdScenario();

export default function () {
  const url = `${BASE_URL.replace(/^http/, 'ws')}/ws`;

  const response = ws.connect(url, {}, (socket) => {
    socket.on('message', (message) => {
      const data = JSON.parse(message);
      eventLatency.add(Date.now() - data.ts);
      eventsReceived.add(1);
    });
    socket.setTimeout(() => socket.close(), HOLD_SECONDS * 1000);
  });

  check(response, { 'WS-Handshake: HTTP 101': (r) => r && r.status === 101 });
}
