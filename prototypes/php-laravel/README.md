# php-laravel

Framework-Variante des PHP-Stacks (Gegenstück zu `prototypes/php-minimal`).
Zwei unabhängige Pfade, siehe DECISIONS.md 5.5:

- **SSE** (`routes/web.php`, `/sse`): läuft unter PHP-FPM, ein Worker pro
  offener Verbindung — inhaltlich das Framework-Pendant zu
  `prototypes/php-minimal/sse.php`, bewusst mit Laravels Standard-
  Middleware-Stack (Session/Cookies), nicht handoptimiert.
- **WS** (über Reverb, `App\Events\ScanReceived` auf Kanal `scans`): Reverb
  ist ein eigener, langlaufender Prozess (kein FPM). `scan:listen` ist die
  Brücke zwischen dem rohen Redis-Pub/Sub-Kanal `scan-events` und Reverbs
  Broadcasting.

  **Wichtiger Unterschied zu node-minimal/node-express:** Reverb spricht das
  Pusher-Channels-Protokoll, nicht rohes JSON wie die `ws`-Bibliothek —
  Clients brauchen einen Verbindungs-Handshake (`pusher:connection_established`)
  und ein explizites Channel-Subscribe, bevor Broadcasts ankommen. Das ist
  eine echte, unvermeidbare Eigenschaft der Bibliothekswahl (kein
  Testartefakt), aber relevant für die Interpretation der WS-Messungen und
  sollte in der Arbeit als Diskussionspunkt erwähnt werden. Deshalb gibt es
  ein eigenes k6-Skript `k6/scripts/ws-reverb.js` statt des generischen
  `ws-skeleton.js`.

Vier Prozesse, ein Image (siehe `Dockerfile`, `docker-compose.yml`):
`php-laravel-fpm` + `php-laravel-nginx` (SSE), `php-laravel-reverb` (WS),
`php-laravel-listener` (Redis→Reverb-Brücke).

Das Laravel-Queue-Grundgerüst (`app/Jobs/ProcessScanEvent.php`,
`php-laravel-queue-worker`) ist ein separater Baustein für die volle
Lokato-Pipeline und speist **nicht** die SSE/WS-Endpunkte — siehe
Kommentar in `ProcessScanEvent.php`.

## Lokales Setup

```bash
cp .env.example .env
php artisan key:generate
php artisan reverb:install   # legt REVERB_APP_ID/KEY/SECRET an, falls noch nicht vorhanden
```

Danach über die Compose-Profile im Projekt-Root starten
(`--profile php-laravel`, siehe Haupt-README).

## WS testen

`ws-reverb.js` braucht den aktuellen `REVERB_APP_KEY` aus `.env`:

```bash
docker compose --profile load run --rm \
  -e K6_TARGET_BASE_URL=http://php-laravel-reverb:8080 \
  -e K6_REVERB_APP_KEY=$(grep REVERB_APP_KEY prototypes/php-laravel/.env | cut -d= -f2) \
  k6 run scripts/ws-reverb.js
```
