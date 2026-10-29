#!/usr/bin/env bash
# Setup of the Raspberry Pi test server (infra/pi/README.md, steps 2 to 9,
# DECISIONS.md 5.14). The script can be run repeatedly. Completed steps are
# detected and skipped, changed system files are backed up first
# (<file>.bak-<timestamp>). Docker is not installed, only checked
# (official instructions, README step 2).
#
# Usage on the Pi, inside the repository:
#   sudo bash infra/pi/setup.sh
#
# Exit code 0 = everything set up, 1 = open items, 2 = reboot required
# (run again afterwards).
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Bitte mit sudo ausführen: sudo bash infra/pi/setup.sh" >&2
  exit 1
fi
cd "$(dirname "$0")/../.."
REPO="$(pwd)"
OWNER="${SUDO_USER:-}"
STAMP="$(date +%Y%m%d-%H%M%S)"

ok=()
changed=()
open=()
reboot=0
say() { printf '\n== %s\n' "$1"; }
backup() { cp -a "$1" "$1.bak-${STAMP}"; }
unit_exists() { [ -n "$(systemctl list-unit-files --no-legend "$1" 2>/dev/null)" ]; }

say "System"
arch="$(uname -m)"
model="$(tr -d '\0' < /proc/device-tree/model 2>/dev/null || echo unbekannt)"
echo "Modell: ${model}, Architektur: ${arch}"
if [ "$arch" = "aarch64" ]; then
  ok+=("64-Bit-System (aarch64)")
else
  open+=("Architektur ${arch} statt aarch64: Raspberry Pi OS Lite (64 Bit) installieren")
fi

say "Automatische Updates"
for unit in unattended-upgrades.service apt-daily.timer apt-daily-upgrade.timer; do
  if ! unit_exists "$unit"; then
    echo "${unit}: nicht vorhanden"
  elif [ "$(systemctl is-enabled "$unit" 2>/dev/null || true)" = "disabled" ] && ! systemctl is-active --quiet "$unit"; then
    echo "${unit}: bereits abgeschaltet"
  else
    systemctl disable --now "$unit" >/dev/null 2>&1 || true
    changed+=("${unit} abgeschaltet")
  fi
done
ok+=("keine automatischen Updates")

say "Swap"
# dphys-swapfile and zram-tools start swap through their own services. The
# zram and swap file units of newer Raspberry Pi OS versions are systemd
# swap units and are masked so that they do not come back after a reboot.
for svc in dphys-swapfile.service zramswap.service; do
  if unit_exists "$svc" && [ "$(systemctl is-enabled "$svc" 2>/dev/null || true)" != "disabled" ]; then
    systemctl disable --now "$svc" >/dev/null 2>&1 || true
    changed+=("${svc} abgeschaltet")
  fi
done
while read -r unit _; do
  [ -n "$unit" ] || continue
  [ "$(systemctl is-enabled "$unit" 2>/dev/null || true)" = "masked" ] && continue
  systemctl mask --now "$unit" >/dev/null 2>&1 || true
  changed+=("Swap-Unit ${unit} maskiert")
done < <(systemctl list-units --type=swap --all --no-legend --plain 2>/dev/null)
swapoff -a || true
if [ -z "$(swapon --show --noheadings)" ]; then
  ok+=("kein Swap aktiv (nach dem nächsten Neustart erneut prüfen: swapon --show)")
else
  open+=("Swap weiterhin aktiv: $(swapon --show --noheadings | tr '\n' ' ')")
fi

say "CPU-Governor"
src="${REPO}/infra/pi/cpu-performance.service"
dst="/etc/systemd/system/cpu-performance.service"
if [ -f "$dst" ] && cmp -s "$src" "$dst"; then
  echo "cpu-performance.service: bereits installiert"
else
  [ -f "$dst" ] && backup "$dst"
  install -m 0644 "$src" "$dst"
  systemctl daemon-reload
  changed+=("cpu-performance.service installiert")
fi
systemctl enable --now cpu-performance.service >/dev/null 2>&1 || true
gov="$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || echo fehlt)"
if [ "$gov" = "performance" ]; then
  ok+=("CPU-Governor performance")
else
  open+=("CPU-Governor ${gov} statt performance (systemctl status cpu-performance.service)")
fi

say "Speicher-cgroup"
if grep -qw memory /sys/fs/cgroup/cgroup.controllers 2>/dev/null; then
  ok+=("memory-cgroup-Controller aktiv")
else
  cmdline=/boot/firmware/cmdline.txt
  [ -f "$cmdline" ] || cmdline=/boot/cmdline.txt
  if [ ! -f "$cmdline" ]; then
    open+=("memory-cgroup fehlt und keine cmdline.txt gefunden")
  elif grep -q 'cgroup_enable=memory' "$cmdline"; then
    echo "${cmdline} enthält den Eintrag bereits, der Neustart steht aus"
    reboot=1
  else
    backup "$cmdline"
    # The file consists of exactly one line, the entry is appended to it.
    sed -i '1 s/[[:space:]]*$/ cgroup_enable=memory cgroup_memory=1/' "$cmdline"
    changed+=("cgroup_enable=memory cgroup_memory=1 an ${cmdline} angehängt (Sicherung ${cmdline}.bak-${STAMP})")
    reboot=1
  fi
fi

say "Systemprotokoll"
# By default Raspberry Pi OS keeps the journal in memory only, to spare SD
# cards. On an SSD or hard disk it is stored persistently, so that a crash
# during unattended operation can be traced (DECISIONS.md 5.14, 5.20).
journal_conf=/etc/systemd/journald.conf.d/50-persistent.conf
if [ -f "$journal_conf" ] && grep -qx 'Storage=persistent' "$journal_conf"; then
  echo "Systemprotokoll: bereits dauerhaft"
else
  mkdir -p /etc/systemd/journald.conf.d
  printf '[Journal]\nStorage=persistent\n' > "$journal_conf"
  systemctl restart systemd-journald
  changed+=("Systemprotokoll dauerhaft gespeichert (${journal_conf})")
fi
ok+=("Systemprotokoll dauerhaft")

say "Seitengröße des Kernels"
# By default the Pi 5 boots a kernel with 16 KB pages (kernel_2712.img).
# Measurements use the kernel with 4 KB pages, the usual page size of
# servers (DECISIONS.md 5.10, 5.20).
pagesize="$(getconf PAGESIZE 2>/dev/null || echo unbekannt)"
config=/boot/firmware/config.txt
if [ "$pagesize" = "4096" ]; then
  ok+=("Kernel mit 4-KB-Seiten")
elif [ "$pagesize" = "16384" ] && [ -f "$config" ]; then
  if grep -qx 'kernel=kernel8.img' "$config"; then
    echo "${config} enthält kernel=kernel8.img bereits, der Neustart steht aus"
  else
    backup "$config"
    printf '\n[all]\nkernel=kernel8.img\n' >> "$config"
    changed+=("kernel=kernel8.img in ${config} eingetragen (Sicherung ${config}.bak-${STAMP})")
  fi
  reboot=1
else
  open+=("Seitengröße ${pagesize} Byte statt 4096: kernel=kernel8.img in /boot/firmware/config.txt eintragen (DECISIONS.md 5.10)")
fi

say "Docker"
if ! command -v docker >/dev/null 2>&1; then
  open+=("Docker fehlt: offizielle Anleitung \"Install Docker Engine on Debian\" (docs.docker.com), danach dieses Skript erneut ausführen")
elif ! docker compose version >/dev/null 2>&1; then
  open+=("Docker vorhanden, aber das Compose-Plugin fehlt (Paket docker-compose-plugin)")
else
  ok+=("$(docker --version | cut -d, -f1), $(docker compose version --short 2>/dev/null | sed 's/^/Compose /')")
  if [ -n "$OWNER" ] && [ "$OWNER" != "root" ]; then
    if id -nG "$OWNER" | grep -qw docker; then
      ok+=("Benutzer ${OWNER} in der Gruppe docker")
    else
      usermod -aG docker "$OWNER"
      changed+=("Benutzer ${OWNER} der Gruppe docker hinzugefügt (wirksam nach erneuter Anmeldung)")
    fi
  fi
fi

say "Konfiguration"
if [ ! -f .env ]; then
  cp .env.example .env
  [ -n "$OWNER" ] && chown "$OWNER": .env
  changed+=(".env aus .env.example angelegt")
fi
if grep -qE '^COMPOSE_FILE=docker-compose\.yml:docker-compose\.pi\.yml' .env; then
  ok+=(".env lädt docker-compose.pi.yml")
elif grep -qE '^#[[:space:]]*COMPOSE_FILE=docker-compose\.yml:docker-compose\.pi\.yml' .env; then
  backup .env
  sed -i -E 's/^#[[:space:]]*(COMPOSE_FILE=docker-compose\.yml:docker-compose\.pi\.yml)/\1/' .env
  changed+=("COMPOSE_FILE in .env aktiviert")
else
  open+=(".env: Zeile COMPOSE_FILE=docker-compose.yml:docker-compose.pi.yml ergänzen")
fi
# Only check that the key names exist, values are never printed.
laravel_env=prototypes/php-laravel/.env
if [ ! -s "$laravel_env" ]; then
  open+=("${laravel_env} fehlt: vom Entwicklungsrechner kopieren (scp), nicht ins Repository aufnehmen")
elif grep -qE '^APP_KEY=.+' "$laravel_env" && grep -qE '^REVERB_APP_KEY=.+' "$laravel_env"; then
  ok+=("${laravel_env} vorhanden (APP_KEY, REVERB_APP_KEY gesetzt)")
else
  open+=("${laravel_env} unvollständig: APP_KEY oder REVERB_APP_KEY leer")
fi

say "cgroup-Töpfe der Zellen"
if bash infra/pi/setup-slices.sh; then
  ok+=("Slices eda_<zelle>.slice angelegt (Werte aus .env)")
else
  open+=("Speicherbudget passt nicht zum Arbeitsspeicher: SUT_MEM_LIMIT in .env verkleinern, danach sudo bash infra/pi/setup-slices.sh")
fi

if ! command -v stress-ng >/dev/null 2>&1; then
  open+=("stress-ng fehlt für den Belastungstest (sudo apt install stress-ng)")
fi

say "Zusammenfassung"
for s in "${ok[@]}"; do echo "  ok       ${s}"; done
for s in "${changed[@]}"; do echo "  geändert ${s}"; done
for s in "${open[@]}"; do echo "  offen    ${s}"; done
if [ "$reboot" -eq 1 ]; then
  echo
  echo "Neustart nötig (sudo reboot), danach dieses Skript erneut ausführen."
  exit 2
fi
if [ "${#open[@]}" -gt 0 ]; then
  exit 1
fi
echo
echo "Einrichtung vollständig. Weiter mit infra/pi/README.md, Schritt 6 (Limits prüfen) und 7 (Images bauen)."
