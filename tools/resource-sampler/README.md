# resource-sampler

Misst CPU-Zeit und Speicher der Container pro Lauf (DECISIONS.md 5.16). Auf der SUT-Seite (lokal bzw. auf dem Raspberry Pi) misst er die Zelle und Redis, auf dem Lastgenerator die CPU-Auslastung des Hosts. Er liest die cgroup-v2-Dateien der Container bzw. `/proc/stat` direkt. Gestartet und befragt wird er von `tools/orchestrate` per `docker compose exec`. `cgroup: host` in `docker-compose.yml` macht die cgroup-Hierarchie des Hosts lesend sichtbar.

## Messgrößen

| Größe | Quelle | Verfahren |
| --- | --- | --- |
| CPU-Zeit | `cpu.stat`, Zähler `usage_usec` | Differenz zwischen Beginn und Ende des Laufs; exakt, ohne Abtastfehler |
| mittlere CPU-Auslastung | CPU-Zeit / Wanduhrzeit | in Kernen |
| Speicher | `memory.current` | abgetastet (Standard 250 ms), Mittel und Spitze |
| Working Set | `memory.current` − `inactive_file` (`memory.stat`) | wie `memory.current`; dieselbe Definition wie bei `docker stats` |
| Temperatur | `/sys/class/thermal/thermal_zone0/temp` | Beginn, Ende, Maximum |
| Drosselstatus | Raspberry-Pi-Firmware (`get_throttled`) | Beginn und Ende |
| CPU-Auslastung des Hosts (`--host-cpu`) | `/proc/stat` | Mittel über den Lauf und höchster Wert je Abtastintervall |

Die Werte werden pro Container, pro Gruppe (`--cell`, z. B. die Zelle und Redis) und als Gesamtsumme über alle übergebenen Container (`total`) ausgegeben. Die Speicherspitze der Gesamtsumme wird aus der Summe je Abtastung gebildet, nicht als Summe der Einzelspitzen. Auf dem Pi liegen die Container einer Zelle in der Slice `eda_<zelle>.slice`; der Pfad der cgroup steht im Ergebnis und wird vom Orchestrator geprüft.

## Aufruf

```bash
docker compose --profile tools up -d resource-sampler

# Host-Kontext (Modell, Kernel, Kerne, RAM, Swap, cgroup-Controller, Governor, Temperatur, Drosselstatus)
docker compose --profile tools exec resource-sampler node sampler.js info

# Messung: läuft, bis die Standardeingabe endet; gibt dann eine JSON-Zeile aus
docker compose --profile tools exec -T resource-sampler node sampler.js measure --cell <zelle>=<container-id>[,<container-id>] --cell redis=<container-id> [--interval-ms 250]

# Auslastung des Lastgenerators
docker compose --profile tools exec -T resource-sampler node sampler.js measure --host-cpu --interval-ms 1000
```

`measure` gibt nach dem Auflösen der cgroups eine Zeile `{"ready":true,...}` aus und nach Ende der Standardeingabe die Zusammenfassung. Container-IDs liefert `docker compose ps --format json <dienst>`.

## Abgrenzung zu tools/monitor

`tools/monitor` protokolliert `docker stats` als CSV. Jede Abfrage dauert ein bis drei Sekunden und verbraucht selbst CPU auf dem gemessenen Rechner; eine Zuordnung zu einzelnen Läufen fehlt. Für Messungen wird daher ausschließlich `resource-sampler` verwendet.
