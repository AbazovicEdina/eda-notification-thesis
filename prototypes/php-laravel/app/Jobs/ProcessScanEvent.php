<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Redis;

// Job der Queue-Zelle php-laravel-sse-queue (DECISIONS.md 5.19): Der Worker
// (`queue:work`) verarbeitet ein Scan-Ereignis aus der Queue "scan-events"
// und veröffentlicht es auf dem Redis-Kanal "notifications", den der
// SSE-Endpunkt dieser Zelle abonniert. Die Zellen ohne Queue beziehen die
// Ereignisse direkt über Pub/Sub (5.4), damit der Vergleich php-minimal
// gegen php-laravel nur den Framework-Overhead zeigt. Einzelner Test-Job:
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
