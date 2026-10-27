// WebSocket-Lasttest speziell für Laravel Reverb (Zelle php-laravel/WS).
//
// Reverb spricht das Pusher-Channels-Protokoll, nicht rohes JSON wie die
// übrigen WS-Zellen (k6/scripts/ws-skeleton.js). Das ist ein Unterschied der
// Bibliothekswahl, kein Testartefakt, und in der Arbeit zu diskutieren:
// Reverb-Clients erhalten nach dem Handshake pusher:connection_established
// und müssen den Kanal abonnieren, bevor Broadcasts ankommen. Reverb wird
// über denselben Front-Nginx erreicht wie alle anderen Zellen (location
// /app/ in infra/nginx). Messfenster, Zustellung und Verbindungsaufbau wie
// in den anderen Skripten (k6/lib/config.js, k6/lib/delivery.js); als
// Verbindungsaufbau zählt der abgeschlossene WebSocket-Handshake.
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, holdScenario, measurementWindow, staggerStart } from '../lib/config.js';
import { deliveryMetrics, newTracker, markConnected, track, flush } from '../lib/delivery.js';

const eventLatency = new Trend('ws_event_latency_ms');
const eventsReceived = new Counter('ws_events_received');
const delivery = deliveryMetrics('ws');

const REVERB_APP_KEY = __ENV.K6_REVERB_APP_KEY;
const CHANNEL = __ENV.REVERB_CHANNEL || 'scans';

export const options = holdScenario();

export default function () {
  staggerStart();
  const url = `${BASE_URL.replace(/^http/, 'ws')}/app/${REVERB_APP_KEY}?protocol=7&client=k6&version=1.0`;
  const window = measurementWindow();
  const tracker = newTracker();

  const response = ws.connect(url, {}, (socket) => {
    socket.on('open', () => markConnected(delivery, tracker, window));
    socket.on('message', (raw) => {
      const message = JSON.parse(raw);

      if (message.event === 'pusher:connection_established') {
        socket.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: CHANNEL } }));
        return;
      }

      if (message.event === 'scan') {
        const now = Date.now();
        if (now < window.start || now >= window.end) return;
        const data = JSON.parse(message.data); // Pusher-Envelope: "data" ist ein JSON-String
        eventLatency.add(now - data.ts);
        eventsReceived.add(1);
        track(tracker, data);
      }
    });

    socket.setTimeout(() => socket.close(), Math.max(0, window.end - Date.now()));
  });

  flush(delivery, tracker);
  check(response, { 'WS-Handshake: HTTP 101': (r) => r && r.status === 101 });
}
