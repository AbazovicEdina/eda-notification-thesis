# php-laravel

Framework-Variante des PHP-Stacks (Gegenstück zu `prototypes/php-minimal`) mit zwei unabhängigen Pfaden (DECISIONS.md 5.5):

- **SSE** (`routes/web.php`, `/sse`): PHP-FPM, ein Worker pro offener Verbindung. Framework-Pendant zu `prototypes/php-minimal/sse.php`, bewusst mit Laravels Standard-Middleware-Stack (Session, Cookies) und ohne Handoptimierung.
- **WS** über Reverb (`App\Events\ScanReceived` auf dem Kanal `scans`): Reverb ist ein eigener, langlaufender Prozess ohne FPM. Der Befehl `scan:listen` verbindet den Redis-Pub/Sub-Kanal `scan-events` mit Reverbs Broadcasting.

**Protokollunterschied zu den übrigen WebSocket-Zellen:** Reverb verwendet das Pusher-Channels-Protokoll, nicht rohes JSON wie die `ws`-Bibliothek. Clients erhalten zunächst `pusher:connection_established` und müssen den Kanal explizit abonnieren, bevor Broadcasts ankommen. Das ist eine Eigenschaft der Bibliothekswahl, kein Testartefakt, und bei der Interpretation der WebSocket-Messungen zu berücksichtigen. Für diese Zelle gibt es daher ein eigenes k6-Skript (`k6/scripts/ws-reverb.js`) statt `ws-skeleton.js`.

Vier Prozesse aus einem Image (`Dockerfile`, `docker-compose.yml`):

| Container | Aufgabe | Zelle |
| --- | --- | --- |
| `php-laravel-fpm` | PHP-FPM mit der SSE-Route | php-laravel/SSE |
| `php-laravel-nginx` | Nginx-Brücke HTTP → FastCGI | php-laravel/SSE |
| `php-laravel-reverb` | WebSocket-Server | php-laravel/WS |
| `php-laravel-listener` | Redis → Reverb (`scan:listen`) | php-laravel/WS |

Beide Container einer Zelle zählen zu deren gemeinsamem Ressourcenbudget (DECISIONS.md 5.6.2).

Das Laravel-Queue-Grundgerüst (`app/Jobs/ProcessScanEvent.php`, Dienst `php-laravel-queue-worker`) ist ein separater Baustein für die vollständige Lokato-Pipeline und speist die SSE/WS-Endpunkte nicht (Kommentar in `ProcessScanEvent.php`).

## Einrichtung

```bash
cp .env.example .env
php artisan key:generate
php artisan reverb:install   # legt REVERB_APP_ID/KEY/SECRET an, falls nicht vorhanden
```

Die `.env` enthält Schlüssel, wird per `env_file` in die Container eingespeist und nie versioniert. Gestartet wird über das Compose-Profil `php-laravel` im Wurzelverzeichnis bzw. durch `tools/orchestrate`.

## WebSocket manuell testen

Über den Front-Nginx (Pfad `/app/<app-key>`), mit `SUT_HOST=php-laravel-reverb` und `SUT_PORT=8080` in der `.env`:

```bash
docker compose --profile php-laravel up -d php-laravel-reverb php-laravel-listener nginx
docker compose --profile tools up -d event-simulator
docker compose --profile load run --rm \
  -e K6_TARGET_BASE_URL=http://nginx \
  -e K6_REVERB_APP_KEY=$(grep REVERB_APP_KEY prototypes/php-laravel/.env | cut -d= -f2) \
  k6 run scripts/ws-reverb.js
```

In Messkampagnen liest `tools/orchestrate` den App-Key selbst aus dieser Datei (`cells.json`, `envFromFile`).
