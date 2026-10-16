<?php

namespace App\Console\Commands;

use App\Events\ScanReceived;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;

// Bindeglied zwischen dem rohen Redis-Pub/Sub-Kanal (scan-events) und Reverb:
// Reverb abonniert selbst keinen Redis-Kanal, sondern erhält Broadcasts über
// die Laravel-Anwendung. Ein Prozess, eine Redis-Subscription
// (DECISIONS.md 5.4) — läuft dauerhaft neben php-laravel-fpm und
// php-laravel-reverb (siehe docker-compose.yml).
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
