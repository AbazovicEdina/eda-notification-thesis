<?php

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\StreamedResponse;

// Framework counterpart of prototypes/php-minimal/sse.php. Also runs under
// PHP-FPM (one worker per open connection, DECISIONS.md 5.5) and through the
// regular "web" middleware group (session, cookies). Deliberately not
// hand-optimized, so it reflects Laravel in its default state rather than
// an artificially slim special route.
Route::get('/sse', function () {
    return new StreamedResponse(function () {
        // Send an SSE comment right away, so that the client detects the connection
        // setup (see prototypes/php-minimal/sse.php).
        echo ": connected\n\n";
        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
        Redis::subscribe([config('app.event_channel')], function (string $message) {
            $payload = json_decode($message, true);
            $payload['sut_ts'] = (int) round(microtime(true) * 1000); // see DECISIONS.md 5.4
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
        'X-Accel-Buffering' => 'no', // second safeguard next to fastcgi_buffering off in infra/nginx
    ]);
});

Route::get('/healthz', fn () => 'ok');
