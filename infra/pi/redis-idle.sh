#!/usr/bin/env bash
# Idle CPU time of the Redis container (DECISIONS.md 5.18). Splits the CPU
# time of the container's cgroup into the redis-server process and all other
# processes in the container, for example the healthcheck. Run it without
# clients and without an event source, i.e. with no campaign running.
#
# Usage on the Pi, inside the repository:
#   bash infra/pi/redis-idle.sh [seconds]   # default: 60
# Output: results/<timestamp>_redis-idle.json
set -euo pipefail

cd "$(dirname "$0")/../.."
seconds="${1:-60}"
out="results/$(date -u +%Y-%m-%dT%H-%M-%SZ)_redis-idle.json"
mkdir -p results

id=$(docker compose ps -q redis)
if [ -z "$id" ]; then
  echo "Fehler: Redis läuft nicht (docker compose up -d redis)" >&2
  exit 1
fi
healthcheck=$(docker inspect -f '{{json .Config.Healthcheck}}' "$id")
running=$(docker ps --format '{{.Names}}' | sort | paste -sd, -)

# /proc/1 is redis-server. Its utime and stime are in clock ticks of 10 ms.
read -r total server < <(docker exec "$id" sh -c '
  cg() { grep usage_usec /sys/fs/cgroup/cpu.stat | cut -d" " -f2; }
  pr() { awk "{ print \$14 + \$15 }" /proc/1/stat; }
  a=$(cg); pa=$(pr); sleep "$1"; b=$(cg); pb=$(pr)
  echo "$(( (b - a) / 1000 )) $(( (pb - pa) * 10 ))"
' sh "$seconds")
other=$((total - server))

cat > "$out" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "seconds": $seconds,
  "healthcheck": $healthcheck,
  "running_containers": "$running",
  "cpu_ms_cgroup": $total,
  "cpu_ms_redis_server": $server,
  "cpu_ms_other": $other
}
EOF

# The process value has a resolution of 10 ms and is read a moment apart from
# the cgroup counter, so a difference below 10 ms means "none".
if [ "$other" -lt 10 ]; then
  other_text="unter der Auflösung von 10 ms"
else
  other_text="$other ms"
fi
echo "Grundlast von Redis über $seconds s: $total ms CPU-Zeit, davon redis-server $server ms, übrige Prozesse (z. B. Healthcheck) $other_text"
echo "Ergebnis: $out"
