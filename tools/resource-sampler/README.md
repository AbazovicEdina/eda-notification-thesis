# resource-sampler

Misst CPU-Zeit und Speicher der SUT-Container pro Lauf (DECISIONS.md 5.16). Der Dienst läuft auf der SUT-Seite (lokal bzw. auf dem Raspberry Pi) und liest die cgroup-v2-Dateien der Container direkt. Gestartet und befragt wird er von `tools/orchestrate` per `docker compose exec`. `cgroup: host` in `docker-compose.yml` macht die cgroup-Hierarchie des Hosts lesend sichtbar.

## Messgrößen

| Größe | Quelle | Verfahren |
| --- | --- | --- |
| CPU-Zeit | `cpu.stat`, Zähler `usage_usec` | Differenz zwischen Beginn und Ende des Laufs; exakt, ohne Abtastfehler |
| mittlere CPU-Auslastung | CPU-Zeit / Wanduhrzeit | in Kernen |
| Speicher | `memory.current` | abgetastet (Standard 250 ms), Mittel und Spitze |
| Working Set | `memory.current` − `inactive_file` (`memory.stat`) | wie `memory.current`; dieselbe Definition wie bei `docker stats` |
| Temperatur | `/sys/class/thermal/thermal_zone0/temp` | Beginn, Ende, Maximum |
| Drosselstatus | Raspberry-Pi-Firmware (`get_throttled`) | Beginn und Ende |

Die Werte werden pro Container und pro Zelle (Summe der Container) ausgegeben. Auf dem Pi liegen die Container einer Zelle in der Slice `eda_<zelle>.slice`; der Pfad der cgroup steht im Ergebnis und wird vom Orchestrator geprüft.

## Aufruf

```bash
docker compose --profile tools up -d resource-sampler

# Host-Kontext (Modell, Kernel, Kerne, RAM, Swap, cgroup-Controller, Governor, Temperatur, Drosselstatus)
docker compose --profile tools exec resource-sampler node sampler.js info

# Messung: läuft, bis die Standardeingabe endet; gibt dann eine JSON-Zeile aus
docker compose --profile tools exec -T resource-sampler node sampler.js measure --cell <zelle>=<container-id>[,<container-id>] [--interval-ms 250]
```

`measure` gibt nach dem Auflösen der cgroups eine Zeile `{"ready":true,...}` aus und nach Ende der Standardeingabe die Zusammenfassung. Container-IDs liefert `docker compose ps --format json <dienst>`.

## Abgrenzung zu tools/monitor

`tools/monitor` protokolliert `docker stats` als CSV. Jede Abfrage dauert ein bis drei Sekunden und verbraucht selbst CPU auf dem gemessenen Rechner; eine Zuordnung zu einzelnen Läufen fehlt. Für Messungen wird daher ausschließlich `resource-sampler` verwendet.
