<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Redis;

// Job of the queue cell php-laravel-sse-queue (DECISIONS.md 5.19). The
// worker (`queue:work`) processes a scan event from the queue "scan-events"
// and publishes it on the Redis channel of this cell (config
// app.notification_channel, "notifications-laravel"), to which the SSE
// endpoint of this cell subscribes. The BullMQ cell uses its own channel. The cells without a queue receive the
// events directly via pub/sub (5.4), so that the comparison php-minimal
// versus php-laravel shows only the framework overhead. Single test job in
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
        Redis::publish(config('app.notification_channel'), json_encode($notification));
    }
}
