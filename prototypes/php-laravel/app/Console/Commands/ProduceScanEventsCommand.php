<?php

namespace App\Console\Commands;

use App\Jobs\ProcessScanEvent;
use Illuminate\Console\Command;

// Erzeugt Scan-Events mit fester Rate als Laravel-Jobs in der Queue
// "scan-events" (Queue-Achse, DECISIONS.md 5.19). Gegenstück zum
// Event-Simulator im Modus "queue" (BullMQ), der für die Node-Seite
// dieselbe Rolle übernimmt: Laravel-Jobs haben ein eigenes Format, das nur
// Laravel selbst erzeugen kann.
//
// Event-Format wie tools/event-simulator: Lokato-Scan plus die Messfelder
// seq (laufende Nummer) und ts (Zeitstempel beim Einreihen in die Queue).
// Takt nach absolutem Zeitplan (Start + seq · Intervall).
class ProduceScanEventsCommand extends Command
{
    protected $signature = 'scan:produce {--rate= : Events pro Sekunde (Standard: RATE_PER_SECOND bzw. 1)}';

    protected $description = 'Reiht Scan-Events mit fester Rate in die Queue scan-events ein (Lasttest)';

    public function handle(): int
    {
        $rate = (float) ($this->option('rate') ?? getenv('RATE_PER_SECOND') ?: 1);
        $intervalNs = (int) (1e9 / $rate);
        $stop = false;
        $this->trap([SIGTERM, SIGINT], function () use (&$stop) {
            $stop = true;
        });

        $this->info("scan:produce: {$rate} Events/s in Queue scan-events");
        $startedAt = hrtime(true);
        $seq = 0;
        while (! $stop) {
            $seq++;
            $ts = (int) round(microtime(true) * 1000);
            ProcessScanEvent::dispatch([
                'event' => 'scan',
                'device' => 'R200_3',
                'uid' => 'E28068940000'.strtoupper(str_pad(dechex($seq), 12, '0', STR_PAD_LEFT)),
                'timestamp' => $ts,
                'seq' => $seq,
                'ts' => $ts,
            ])->onQueue('scan-events');

            $waitNs = $startedAt + $seq * $intervalNs - hrtime(true);
            if ($waitNs > 0) {
                usleep((int) ($waitNs / 1000));
            }
        }

        $elapsed = (hrtime(true) - $startedAt) / 1e9;
        $this->info(sprintf('scan:produce: %d Events in %.1f s (%.2f/s)', $seq, $elapsed, $seq / $elapsed));

        return self::SUCCESS;
    }
}
