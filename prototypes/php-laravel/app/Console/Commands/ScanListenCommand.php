<?php

namespace App\Console\Commands;

use App\Events\ScanReceived;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;

// Link between the raw Redis pub/sub channel (scan-events) and Reverb.
// Reverb does not subscribe to a Redis channel itself but receives
// broadcasts through the Laravel application. One process, one Redis
// subscription (DECISIONS.md 5.4). Runs permanently next to php-laravel-fpm
// and php-laravel-reverb (see docker-compose.yml).
class ScanListenCommand extends Command
{
    protected $signature = 'scan:listen';

    protected $description = 'Abonniert scan-events und broadcastet sie an Reverb';

    public function handle(): void
    {
        Redis::subscribe([config('app.event_channel')], function (string $message) {
            $payload = json_decode($message, true);
            $payload['sut_ts'] = (int) round(microtime(true) * 1000);
            broadcast(new ScanReceived($payload));
        });
    }
}
