#!/usr/bin/env bash
# Burn-in test of the test server before the pilot (DECISIONS.md 5.9, 5.14).
# All cores run at full load for the given duration (stress-ng), while
# temperature, clock frequency and throttling status are logged every
# minute. Goal is to show that cooling and power supply sustain weeks of
# continuous operation without throttling.
#
# Usage on the Pi (stress-ng: sudo apt install stress-ng):
#   bash infra/pi/burn-in.sh [hours]        # default: 24
# Output: results/<timestamp>_burn-in.csv
set -euo pipefail

cd "$(dirname "$0")/../.."
hours="${1:-24}"
seconds=$((hours * 3600))
out="results/$(date -u +%Y-%m-%dT%H-%M-%SZ)_burn-in.csv"
mkdir -p results

if ! command -v stress-ng >/dev/null; then
  echo "Fehler: stress-ng fehlt (sudo apt install stress-ng)" >&2
  exit 1
fi

echo "timestamp,temp_c,cpu_freq_mhz,throttled" > "$out"
stress-ng --cpu "$(nproc)" --timeout "${seconds}s" --quiet &
stress_pid=$!
trap 'kill "$stress_pid" 2>/dev/null || true' EXIT

end=$((SECONDS + seconds))
while [ "$SECONDS" -lt "$end" ] && kill -0 "$stress_pid" 2>/dev/null; do
  temp=$(awk '{ printf "%.1f", $1 / 1000 }' /sys/class/thermal/thermal_zone0/temp)
  freq=$(awk '{ printf "%d", $1 / 1000 }' /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq)
  throttled=$(vcgencmd get_throttled 2>/dev/null | cut -d= -f2 || echo "n/a")
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),${temp},${freq},${throttled}" >> "$out"
  sleep 60
done

echo "Belastungstest beendet: $out"
awk -F, 'NR > 1 { if ($2 > max) max = $2; if ($4 != "0x0" && $4 != "n/a") t = 1 }
  END { printf "Höchsttemperatur: %.1f °C, Drosselung aufgetreten: %s\n", max, (t ? "ja" : "nein") }' "$out"
