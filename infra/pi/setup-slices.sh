#!/usr/bin/env bash
# Legt pro Messzelle eine systemd-Slice mit gemeinsamem CPU- und
# Speicherbudget an (DECISIONS.md 5.6.2). Die Werte stammen aus der .env im
# Repository-Wurzelverzeichnis (SUT_CPU_LIMIT, SUT_MEM_LIMIT) — dieselben
# Werte, die docker-compose.yml pro Container setzt.
#
# Ausführung auf dem Pi (einmalig und nach jeder Änderung der Limits):
#   sudo infra/pi/setup-slices.sh
set -euo pipefail

cd "$(dirname "$0")/../.."
if [ ! -f .env ]; then
  echo "Fehler: .env fehlt (Vorlage: .env.example)" >&2
  exit 1
fi

value() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | tr -d '\r"' ; }
cpu="$(value SUT_CPU_LIMIT)"; cpu="${cpu:-2}"
mem="$(value SUT_MEM_LIMIT)"; mem="${mem:-2g}"

# systemd erwartet CPUQuota in Prozent eines Kerns und Speicher mit
# Großbuchstaben-Suffix (2g -> 2G).
quota="$(awk -v c="$cpu" 'BEGIN { printf "%d", c * 100 }')"
mem_sd="$(echo "$mem" | tr 'kmg' 'KMG')"

# Alle Zellen aus tools/orchestrate/cells.json (Bindestriche als Unterstriche).
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
