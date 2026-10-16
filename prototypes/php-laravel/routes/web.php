<?php

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\StreamedResponse;

// Framework-Pendant zu prototypes/php-minimal/sse.php — läuft ebenfalls
// unter PHP-FPM (ein Worker pro offener Verbindung, DECISIONS.md 5.5) und
// über die normale "web"-Middleware-Gruppe (Session/Cookies). Bewusst nicht
// handoptimiert: das bildet Laravel im Standard-Zustand ab, nicht eine
// künstlich schlanke Sonderroute.
Route::get('/sse', function () {
    return new StreamedResponse(function () {
        // SSE-Kommentar sofort senden, damit der Client den Verbindungsaufbau
        // erkennt (siehe prototypes/php-minimal/sse.php).
        echo ": connected\n\n";
        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
        Redis::subscribe([config('app.event_channel')], function (string $message) {
            $payload = json_decode($message, true);
            $payload['sut_ts'] = (int) round(microtime(true) * 1000); // siehe DECISIONS.md 5.4
            echo 'data: '.json_encode($payload)."\n\n";
            if (connection_aborted()) {
                exit;
            }
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();
        });
    }, 200, [
        'Content-Type' => 'text/event-stream',
        'Cache-Control' => 'no-cache',
        'Connection' => 'keep-alive',
        'X-Accel-Buffering' => 'no', // Verteidigungslinie, siehe infra/nginx proxy_buffering
    ]);
});

Route::get('/healthz', fn () => 'ok');
