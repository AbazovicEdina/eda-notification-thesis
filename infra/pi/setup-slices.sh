#!/usr/bin/env bash
# Creates one systemd slice per measurement cell with a shared CPU and
# memory budget (DECISIONS.md 5.6.2). The values come from the .env in the
# repository root (SUT_CPU_LIMIT, SUT_MEM_LIMIT), the same values that
# docker-compose.yml sets per container.
#
# Usage on the Pi (once and after every change of the limits):
#   sudo infra/pi/setup-slices.sh
set -euo pipefail

cd "$(dirname "$0")/../.."
if [ ! -f .env ]; then
  echo "Fehler: .env fehlt (Vorlage: .env.example)" >&2
  exit 1
fi

value() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | tr -d '\r"' ; }
cpu="$(value SUT_CPU_LIMIT)"; cpu="${cpu:-2}"
mem="$(value SUT_MEM_LIMIT)"; mem="${mem:-1536m}"

# In paired campaigns two cells run at the same time. Two limits plus a
# reserve for system, Docker, Redis, Nginx and sampler must fit into memory,
# otherwise the budget would not be guaranteed without swap.
to_bytes() {
  awk -v v="$1" 'BEGIN {
    n = v + 0; u = tolower(substr(v, length(v)))
    f = (u == "k") ? 1024 : (u == "m") ? 1048576 : (u == "g") ? 1073741824 : 1
    printf "%.0f", n * f }'
}
reserve_mib=600
limit_bytes="$(to_bytes "$mem")"
total_bytes="$(awk '/^MemTotal:/ { printf "%.0f", $2 * 1024 }' /proc/meminfo)"
need_bytes="$(awk -v l="$limit_bytes" -v r="$reserve_mib" 'BEGIN { printf "%.0f", 2 * l + r * 1048576 }')"
if [ "$need_bytes" -gt "$total_bytes" ]; then
  echo "Fehler: SUT_MEM_LIMIT=${mem} ist zu groß für $((total_bytes / 1048576)) MiB Arbeitsspeicher." >&2
  echo "Zwei Zellen plus ${reserve_mib} MiB Reserve brauchen $((need_bytes / 1048576)) MiB. Wert in .env verkleinern (DECISIONS.md 5.10)." >&2
  exit 1
fi

# systemd expects CPUQuota in percent of one core and memory with an
# upper-case suffix (1536m -> 1536M).
quota="$(awk -v c="$cpu" 'BEGIN { printf "%d", c * 100 }')"
mem_sd="$(echo "$mem" | tr 'kmg' 'KMG')"

# All cells from tools/orchestrate/cells.json (hyphens as underscores).
cells="node_minimal_sse node_minimal_ws node_express_sse node_express_ws php_minimal_sse php_minimal_ws php_laravel_sse php_laravel_ws node_express_sse_queue php_laravel_sse_queue"

for cell in $cells; do
  cat > "/etc/systemd/system/eda_${cell}.slice" <<EOF
[Unit]
Description=EDA-Thesis Messzelle ${cell} (gemeinsames Ressourcenbudget)

[Slice]
CPUAccounting=yes
CPUQuota=${quota}%
MemoryAccounting=yes
MemoryMax=${mem_sd}
MemorySwapMax=0
EOF
done

systemctl daemon-reload
for cell in $cells; do
  systemctl restart "eda_${cell}.slice"
done

echo "Slices angelegt: CPUQuota=${quota}% MemoryMax=${mem_sd} MemorySwapMax=0"
systemctl show -p CPUQuotaPerSecUSec -p MemoryMax -p MemorySwapMax eda_php_laravel_ws.slice
