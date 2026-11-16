#!/usr/bin/env bash
# Runs the whole second measurement unattended on the load generator (second
# run of 2026-11-16, DECISIONS.md 5.9, 5.14 and 5.17):
#   0. pre-check of both machines (precheck.js), stops on any failure
#   1. short trial run of comparisons 4, 9, 10, 12 and 13 on all three load
#      levels (prefix precheck-), checked by smoke-check.js, stops on any
#      failure. Together they use all ten cells once, so that the files of
#      freshly built images are read for the first time here and not in block 1
#      (Linux charges a page of the file cache to the cgroup that reads it
#      first, DECISIONS.md 5.14)
#   2. block 1 and 3. block 2, each with the daily control measurement
#   4. saturation test, the eight cells without a queue, then the two queue cells
#   5. scaling series
#   6. connection storm, last, because it is the phase most likely to crash a cell
# Redis is emptied before every step. Notifications go out at the start, after
# every step and on every problem (NOTIFY_URL in the .env of the laptop). The
# hourly status report via cron follows the running step. Started again after
# an interruption, the script skips everything that is already complete. If the
# Pi was restarted in between, it stops, because a restart shifts the memory
# accounting (DECISIONS.md 5.14).
#
# Usage, on the laptop in a tmux session:
#   bash tools/orchestrate/run-all.sh

set -u
cd "$(dirname "$0")/../.." || exit 1
REPO=$(pwd)
SUT=sut.pi.json
LOG="$HOME/run2.log"
OUT=campaigns/run2
SINCE=2026-11-16
STATE="$HOME/.eda-run2"
NOQUEUE=node-minimal-sse,node-minimal-ws,node-express-sse,node-express-ws,php-minimal-sse,php-minimal-ws,php-laravel-sse,php-laravel-ws
RATES=10,50,100,200,300,400,500,700,1000
mkdir -p "$STATE"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG"; }
notify() {
  node -e "import('./tools/orchestrate/notify.js').then((m) => m.notify(process.argv[1], process.argv[2]))" "$1" "$2" >> "$LOG" 2>&1
}
fail() {
  log "ABBRUCH: $1"
  notify "EDA: Lauf angehalten" "$1. Details in run2.log"
  exit 1
}

[ -f "$SUT" ] || fail "$SUT fehlt im Repository-Ordner"
PI=$(node -e "const s = require('./$SUT'); console.log((s.sut || s).ssh)")
PIDIR=$(node -e "const s = require('./$SUT'); console.log((s.sut || s).repoDir)")

log "Start des zweiten Durchlaufs in $REPO"

# 0. Pre-check of both machines.
node tools/orchestrate/precheck.js --sut "$SUT" --since "$SINCE" --move-old-results 2>&1 | tee -a "$LOG"
[ "${PIPESTATUS[0]}" -eq 0 ] || fail "Vorab-Check nicht bestanden"

# A restart of the Pi during the run would shift the memory accounting.
boot=$(ssh -o BatchMode=yes "$PI" uptime -s)
if [ -f "$STATE/pi-boot" ]; then
  [ "$(cat "$STATE/pi-boot")" = "$boot" ] || fail "Der Pi wurde seit dem Start neu gestartet ($(cat "$STATE/pi-boot") gegenüber $boot)"
else
  echo "$boot" > "$STATE/pi-boot"
  date -u +%Y-%m-%dT%H:%M:%SZ > "$STATE/started"
  notify "EDA: zweiter Durchlauf gestartet" "Vorab-Check bestanden, als Nächstes der Probelauf"
fi

# Campaign files. Fixed seeds, so that a restart produces the same order.
plan() { node tools/orchestrate/plan-campaigns.js "$@" --sut "$SUT" >> "$LOG" 2>&1 || fail "Kampagnen nicht erzeugt ($*)"; }
plan main --block 1 --runs baseline=4,medium=4,stress=4 --warmup 1 --hold 20 --comparisons 4,9,10,12,13 --prefix precheck- --seed 20261116 --out "$OUT/precheck"
plan main --block 1 --runs baseline=90,medium=90,stress=90 --seed 20261117 --out "$OUT/block1"
plan main --block 2 --runs baseline=90,medium=90,stress=90 --seed 20261118 --out "$OUT/block2"
plan saturation --clients 50 --rates "$RATES" --runs 3 --cells "$NOQUEUE" --seed 20261119 --out "$OUT/saturation"
plan saturation --clients 50 --rates "$RATES" --runs 3 --cells node-express-sse-queue --out "$OUT/saturation-bullmq"
plan saturation --clients 50 --rates "$RATES" --runs 3 --cells php-laravel-sse-queue --out "$OUT/saturation-laravel"
plan scaling --steps 10,50,100,250,500,750,1000 --runs 3 --seed 20261120 --out "$OUT/scaling"
plan storm --clients 500 --runs 3 --hold 20 --seed 20261121 --out "$OUT/storm"

# Hourly status report via cron, always for the running step.
started=$(cat "$STATE/started")
line="0 * * * * cd $REPO && node tools/orchestrate/status.js --schedule $OUT/current/schedule.json --sut $SUT --control-since $started --notify >> \"\$HOME/eda-status.log\" 2>&1"
(crontab -l 2>/dev/null | grep -v 'tools/orchestrate/status.js'; echo "$line") | crontab - || log "Hinweis: cron-Eintrag nicht gesetzt"

flush() {
  # Before every step: the Pi has to be reachable and must not have been
  # restarted since the start of the run.
  now_boot=$(ssh -o BatchMode=yes -o ConnectTimeout=20 "$PI" uptime -s) || fail "Pi nicht erreichbar"
  [ "$now_boot" = "$(cat "$STATE/pi-boot")" ] || fail "Der Pi wurde seit dem Start neu gestartet ($(cat "$STATE/pi-boot") gegenüber $now_boot)"
  log "Redis leeren"
  ssh -o BatchMode=yes "$PI" "cd $PIDIR && docker compose up -d redis && docker compose exec -T redis redis-cli FLUSHALL" >> "$LOG" 2>&1
  n=$(ssh -o BatchMode=yes "$PI" "cd $PIDIR && docker compose exec -T redis redis-cli DBSIZE" 2>> "$LOG" | tr -dc '0-9')
  log "Schlüssel in Redis danach: ${n:-unbekannt}"
  [ "$n" = "0" ] || fail "Redis ließ sich nicht leeren"
}

step() {
  name=$1
  ln -sfn "$name" "$OUT/current"
  flush
  log "Start $name"
  node tools/orchestrate/schedule.js "$OUT/$name/schedule.json" 2>&1 | tee -a "$LOG"
  code=${PIPESTATUS[0]}
  log "Ende $name mit Code $code"
  if [ "$code" -eq 0 ]; then
    notify "EDA: $name fertig" "Weiter mit dem nächsten Schritt"
  else
    notify "EDA: $name mit offenen Kampagnen" "Code $code, der Lauf geht weiter. Details in run2.log"
  fi
}

# 1. Trial run. It has to pass before the long phases start.
if [ ! -f "$STATE/precheck-ok" ]; then
  step precheck
  node tools/orchestrate/smoke-check.js --prefix precheck- 2>&1 | tee -a "$LOG"
  [ "${PIPESTATUS[0]}" -eq 0 ] || fail "Probelauf nicht bestanden"
  touch "$STATE/precheck-ok"
  notify "EDA: Probelauf bestanden" "Als Nächstes Block 1, rund 6,7 Tage"
fi

# 2. to 6. The measurement.
step block1
step block2
step saturation
step saturation-bullmq
step saturation-laravel
step scaling
step storm

log "Fertig"
notify "EDA: zweiter Durchlauf fertig" "Alle Phasen abgeschlossen. Jetzt die Ergebnisse holen"
