// WebSocket-Lasttest speziell für Laravel Reverb.
//
// Reverb spricht das Pusher-Channels-Protokoll, nicht rohes JSON wie
// prototypes/node-minimal/ws.js bzw. node-express/ws.js — das ist ein
// echter, unvermeidbarer Unterschied zwischen den beiden WS-Ansätzen
// (Bibliothekswahl, nicht Testartefakt) und sollte in der Arbeit als
// Limitation/Diskussionspunkt erwähnt werden: Reverb-Clients brauchen einen
// Verbindungs-Handshake + Channel-Subscribe, bevor Broadcasts ankommen;
// rohes ws bekommt Nachrichten direkt nach dem Upgrade. k6/scripts/ws-skeleton.js
// bleibt für node-minimal/node-express gültig; dieses Skript ist das
// Pendant für php-laravel.
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, HOLD_SECONDS, holdScenario } from '../lib/config.js';

const eventLatency = new Trend('ws_event_latency_ms');
const eventsReceived = new Counter('ws_events_received');

const REVERB_APP_KEY = __ENV.K6_REVERB_APP_KEY;
const CHANNEL = __ENV.REVERB_CHANNEL || 'scans';

export const options = holdScenario();

export default function () {
  const url = `${BASE_URL.replace(/^http/, 'ws')}/app/${REVERB_APP_KEY}?protocol=7&client=k6&version=1.0`;
  const deadline = Date.now() + HOLD_SECONDS * 1000;

  const response = ws.connect(url, {}, (socket) => {
    socket.on('message', (raw) => {
      const message = JSON.parse(raw);

      if (message.event === 'pusher:connection_established') {
        socket.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: CHANNEL } }));
        return;
      }

      if (message.event === 'scan') {
        const now = Date.now();
        const data = JSON.parse(message.data); // Pusher-Envelope: "data" ist ein JSON-String
        eventLatency.add(now - data.ts);
        eventsReceived.add(1);
        if (now >= deadline) {
          socket.close();
        }
      }
    });

    socket.setTimeout(() => socket.close(), HOLD_SECONDS * 1000 + 5000);
  });

  check(response, { 'WS-Handshake: HTTP 101': (r) => r && r.status === 101 });
}
