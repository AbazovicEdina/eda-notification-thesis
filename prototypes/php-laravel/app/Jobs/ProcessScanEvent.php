<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Redis;

// Grundgerüst für die vollständige Lokato-Pipeline —
// absichtlich getrennt vom /sse-Endpunkt und scan:listen: Die gemessenen
// SSE/WS-Pfade laufen über direktes Pub/Sub (DECISIONS.md 5.4), damit der
// Vergleich php-minimal vs. php-laravel ausschließlich Framework-Overhead
// zeigt, nicht zusätzlich Queue-Overhead. Zum Ausprobieren siehe
// app/Console/Commands/DispatchTestScanCommand.php.
class ProcessScanEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public array $payload)
    {
    }

    public function handle(): void
    {
        $notification = [...$this->payload, 'processed_ts' => (int) round(microtime(true) * 1000)];
        Redis::publish('notifications', json_encode($notification));
    }
}
