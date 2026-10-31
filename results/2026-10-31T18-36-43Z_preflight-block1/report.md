# Prüfbericht vor dem Start von Block 1 (2026-10-31)

Statische Prüfung nach dem Prüfauftrag aus dem Claude-Projekt der schriftlichen Arbeit. Erlaubt waren nur Lesen, lesende git-Befehle, die Unit-Tests, ein Trockenlauf von `plan-campaigns.js` in ein temporäres Verzeichnis außerhalb des Repositorys und dieser Bericht. Pi und Lastgenerator waren vom prüfenden Rechner aus nicht erreichbar. Ihr Zustand stammt aus den Lauf-Protokollen der Prüfkampagnen vom selben Tag (`results/2026-10-31T14-…_check-…`) und aus Ausgaben, die die Autorin übermittelt hat. Was nur auf den Geräten selbst prüfbar ist, steht in Abschnitt 6 mit Befehl und erwartetem Ergebnis.

Der Prüfauftrag stammt aus einem älteren Stand. Wo er von DECISIONS.md abweicht, gilt DECISIONS.md, und die Abweichung ist bei dem betreffenden Punkt vermerkt (Speicherlimit 1,5 statt 2 GiB, USB-Festplatte statt SSD, Laravel 13.36.0 statt 13.34.0).

## 1. Entscheidung

**FREIGABE MIT AUFLAGEN.** Kein Befund verfälscht Ergebnisse oder benachteiligt eine Variante, und die Vorabfestlegung ist seit Beginn des Pilots inhaltlich unverändert. Vor dem Start fehlen nur drei Nachweise auf den Geräten und die Code-Kennzahlen (Abschnitt 3).

## 2. Kontext

| Merkmal | Wert | Quelle |
|---|---|---|
| Commit | `8ca159f24931dcb35f6149a4fc85b28c0a3d5481` („fix: compare like controls only and stop strict phases on changed tracked files") | `git rev-parse HEAD`, Arbeitsverzeichnis des Entwicklungsrechners ohne Änderungen (`git status --short` leer) |
| Lastgenerator | Arbeitsverzeichnis ohne geänderte versionierte Dateien | Ausgabe `git status --short --untracked-files=no` der Autorin, leer |
| Pi | Raspberry Pi 5 Model B Rev 1.1, 4 GB, Kernel `6.18.50+rpt-rpi-v8` (4-KB-Seiten), 4 Kerne, Governor `performance`, kein Swap, cgroup v2 mit `cpu` und `memory` | Kontext in `results/2026-10-31T15-00-02-790Z_check-pilot-c11-baseline/runs/…run0002.json` |
| Docker | 29.9.2 mit Compose 5.6.1 auf Pi und Lastgenerator | Ausgabe `docker version` der Autorin, DECISIONS.md 5.14 |
| k6 | v1.2.1 mit xk6-sse v0.1.12 aktiv | `k6_version` im selben Lauf-Protokoll |
| Lastgenerator | Intel Core i7-9750H, 6 Kerne, 12 Threads, 32 GB, Debian Testing | DECISIONS.md 5.14 |
| Wiederholungen | 90 je Konfiguration auf allen drei Laststufen, dazu 5 Warm-up-Läufe | DECISIONS.md 5.9, Trockenlauf von `plan-campaigns.js` |
| Limits | 2 Kerne und 1,5 GiB je Variante, kein Swap | DECISIONS.md 5.10, `limits` im Lauf-Protokoll (`cpus` 2, `memory_bytes` 1 610 612 736) |

## 3. Blocker und Auflagen

**Blocker.** Keine.

**Auflagen, vor dem Start zu erfüllen**

| Nr. | Punkt | Soll | Ist | Behebung |
|---|---|---|---|---|
| 1 | A.1 | beide Geräte auf demselben Commit ohne geänderte versionierte Dateien | Lastgenerator bestätigt. Für den Pi liegt die Ausgabe nach dem Abgleich auf `8ca159f` noch nicht vor | Befehl M1 in Abschnitt 6. Der Orchestrator bricht seit `8ca159f` eine Kampagne ohnehin ab, wenn das nicht erfüllt ist |
| 2 | C, Überwachung | `status.js` als stündlicher cron-Job | `crontab -l` meldet „no crontab for edina" | Befehle M9 und M10 in Abschnitt 6. Benachrichtigung selbst funktioniert (`notify` lieferte `true`) |
| 3 | A.4 | Code-Kennzahlen auf dem Commit der Messung (DECISIONS.md 5.22, offener Punkt „vor Block 1") | kein Ergebnis `results/…_code-metrics/` vorhanden | `node tools/code-metrics/metrics.js` auf dem Entwicklungsrechner auf `8ca159f`, Ergebnis committen. Berührt die Vorabfestlegung nicht |

## 4. Risiken (Block 1 kann starten, beobachten oder vor der Auswertung erledigen)

| Nr. | Punkt | Befund | bestätigt oder Vermutung | Wer ist betroffen | Vorschlag | Vorabfestlegung berührt |
|---|---|---|---|---|---|---|
| R1 | F.4 | Die Entscheidungsregeln G1 bis G4 und die Regeln je Hypothese sind nicht als Code umgesetzt. `evaluate.js` listet sie nur auf (`tools/orchestrate/evaluate.js:235` bis `:243`). Dazu gehören H3 über die Median-Differenz, H8 über alle zehn Varianten und das Kriterium der harten Grenze von H4 (Abfall der bedienten Clients um mindestens 5 Prozentpunkte), das `series.js` bisher nicht berechnet | bestätigt, als offener Punkt in DECISIONS.md Abschnitt 6 eingetragen | keine Variante, betrifft die Auswertung | Skript während Block 1 schreiben und mit Testfällen absichern, vor der ersten Auswertung von Block 1 | nein, die Regeln stehen unverändert in `plan.json`. Nur ihre Umsetzung fehlt |
| R2 | F.6 | Unit-Tests fehlen für den Teil von `evaluate.js`, der fehlende Tests mit p = 1 auffüllt und Holm über 39 Tests je Familie anwendet, für die Replikationsregel und für den Wechsel vom exakten Test zur Normalapproximation bei 50 Paaren. Vorhanden sind 15 Tests in `tools/orchestrate/test/stats.test.js` (alle bestanden) | bestätigt | keine | Tests zusammen mit R1 ergänzen | nein |
| R3 | B.6 | Ratenstufen und Clientzahl des Sättigungstests sind noch nicht festgelegt | bestätigt, offener Punkt „vor dem Sättigungstest" in DECISIONS.md Abschnitt 6. Der Prüfauftrag verlangte die Festlegung nach dem Pilot | keine, die Phase ist beschreibend und kommt nach Block 2 | vor dem Sättigungstest festlegen und in 5.17 eintragen | nein, solange vor der Messung dieser Phase festgelegt |
| R4 | B.4 | Der Höchstwert der Auslastung des Lastgenerators je Sekunde (`loadgen_cpu_util_max`) erreicht in einzelnen Läufen 100 %, auch bei 10 Clients. Die Werte sind Brüche wie 1/7, 1/5, 1/3, 1/2 und 1. Ursache ist die letzte Abtastung beim Beenden des Samplers, die ein Intervall von wenigen Millisekunden abschließt (`tools/resource-sampler/sampler.js:277` ruft `sample()` direkt nach `clearInterval` auf, die Auslastung wird dann aus sehr wenigen Takten berechnet) | bestätigt aus Code und Wertemuster | keine. Die Gültigkeitsregel nutzt den Mittelwert über den Lauf (`util_avg`), im Pilot höchstens 5,5 % in Messläufen | Höchstwert in der Arbeit nicht berichten oder nach Block 2 im Sampler kurze Intervalle verwerfen. Eine Änderung jetzt würde einen Neubau des Sampler-Images erfordern | nein |
| R5 | F.2 | Block 2 braucht eine andere, zufällige Reihenfolge. `plan-campaigns.js` setzt ohne Angabe denselben Startwert `20261016` wie für Block 1 | bestätigt (Trockenlauf, `schedule.json` mit `seed` 20261016) | keine | Block 2 mit `--seed` und einem anderen Wert planen, in DECISIONS.md eintragen | nein |
| R6 | B.5 | Speicherspitze laut Kernel bei 500 Clients im Pilot höchstens 1 082 MiB (php-laravel-sse), 1 105 MiB (php-laravel-sse-queue) und 377 MiB (php-minimal-sse). Über alle Laststufen höchstens 1 143 MiB (php-laravel-sse, 10 Clients). Abstand zum Limit von 1 536 MiB mindestens 26 % | bestätigt (`measures.mem_peak_kernel_bytes` aller Messläufe des Pilots) | php-laravel-Varianten | beobachten über `status.js`, ein Abbruch wegen Speichermangels würde als ungültiger Lauf protokolliert | nein |

## 5. Geringfügiges

| Nr. | Punkt | Befund | Vorschlag |
|---|---|---|---|
| G1 | A.3 | Bei H8 nennt das Feld `comparisons` in `plan.json` nur `[1, 3, 7]`, die Regel bezieht sich aber auf alle zehn Varianten über alle Kampagnen | beim Skript aus R1 die Regel maßgeblich nehmen, nicht das Feld. Keine Änderung an `plan.json` |
| G2 | Prüfauftrag | veraltete Angaben im Prüfauftrag (Limit 2 GiB, SSD, Laravel 13.34.0, Reverb-Version) | Schreib-Chat mit aktuellem DECISIONS.md versorgen |
| G3 | C, Überwachung | Warnungen von `status.js` enthalten Betriebswerte wie Temperatur, Anteil ungültiger Läufe und Abweichung der Kontrollmessung in Prozent, aber keine Latenzen, Adressen oder Schlüssel | so belassen |
| G4 | B.1 | Der Belastungstest lief am 2026-10-22 noch mit dem Kernel mit 16-KB-Seiten, die Messung läuft mit 4-KB-Seiten | für die thermische Aussage ohne Bedeutung, in der Arbeit nicht nötig |

## 6. Manuelle Schritte auf den Geräten

| Nr. | Prüfung | Befehl (auf dem Lastgenerator) | Erwartet |
|---|---|---|---|
| M1 | A.1 Pi auf `8ca159f`, sauber | `ssh pi@192.168.50.10 'cd ~/eda-notification-thesis && git log --oneline -1 && git status --short --untracked-files=no'` | erste Zeile `8ca159f …`, sonst keine Ausgabe |
| M2 | A.5 gepinnte Basis-Images auf dem Pi | `ssh pi@192.168.50.10 'docker images --digests --format "{{.Repository}}:{{.Tag}} {{.Digest}}" redis && docker images --digests --format "{{.Repository}}:{{.Tag}} {{.Digest}}" nginx'` | `redis:8.10.2-alpine sha256:9f8d2d78…` und `nginx:1.30.5-alpine sha256:0985e772…` wie in `docker-compose.yml` |
| M3 | C Slices | `ssh pi@192.168.50.10 'for s in node_minimal_sse node_minimal_ws node_express_sse node_express_ws php_minimal_sse php_minimal_ws php_laravel_sse php_laravel_ws node_express_sse_queue php_laravel_sse_queue; do systemctl show -p Id -p CPUQuotaPerSecUSec -p MemoryMax -p MemorySwapMax eda_$s.slice; done'` | je Slice `CPUQuotaPerSecUSec=2s`, `MemoryMax=1610612736`, `MemorySwapMax=0` |
| M4 | C Updates auf dem Pi | `ssh pi@192.168.50.10 'systemctl is-enabled apt-daily.timer apt-daily-upgrade.timer unattended-upgrades'` | `disabled` oder `masked`, bei fehlendem Paket „not-found" |
| M5 | C fremde Container und Prozesse auf dem Pi | `ssh pi@192.168.50.10 'docker ps -a --format "{{.Names}} {{.Status}}" && ps -eo pcpu,comm --sort=-pcpu | head -6 && free -m && df -h /'` | nur Container mit `eda-thesis-` im Namen, kein Prozess mit dauerhaft hoher CPU, Swap 0 |
| M6 | C Netz des Lastgenerators | `ip route get 192.168.50.10` | Weg über den LAN-Anschluss mit Quelle 192.168.50.20, nicht über WLAN |
| M7 | C Link-Geschwindigkeit | `for i in $(ls /sys/class/net); do echo $i $(cat /sys/class/net/$i/speed 2>/dev/null); done` | LAN-Anschluss mit 1000 |
| M8 | C Energiesparen und Updates auf dem Lastgenerator | `systemctl is-enabled sleep.target suspend.target hibernate.target hybrid-sleep.target apt-daily.timer apt-daily-upgrade.timer` | `masked` für die vier Ziele, `disabled` oder `masked` für die Timer |
| M9 | C Statusbericht ohne Sitzung | `env -i HOME=$HOME sh -c "cd $HOME/eda-notification-thesis && $(command -v node) tools/orchestrate/status.js --sut sut.pi.json --hours 1"` | unter „Testserver (aktuell)" das Modell des Pi mit Temperatur, nicht „nicht erreichbar" |
| M10 | C cron-Job | nach `START=$(date -u +%Y-%m-%dT%H:%M:%SZ)` den Eintrag mit `@hourly` und `--control-since $START` per `crontab -` setzen, dann `crontab -l` | eine Zeile mit vollständigem Pfad zu Node und der Startzeit |
| M11 | C fremde Last auf dem Lastgenerator | `ps -eo pcpu,comm --sort=-pcpu | head -6` | kein Prozess mit dauerhaft hoher CPU außer während eines Laufs k6 |

## 7. Geprüft und in Ordnung

**A. Vorabfestlegung und Code-Stand**
- Seit Beginn des Pilots (erste Pilotkampagne 2026-10-29 16:42 UTC, letzter Commit davor `21d8a5a`) änderten sich `plan.json` und `cells.json` nur in `468281c`, und zwar ausschließlich in den Feldern `_comment` (Übersetzung). Vergleiche, Familien, Hypothesen, Regeln und Schwellen sind unverändert.
- DECISIONS.md 5.8 und 5.24 sind seit `21d8a5a` unverändert. In 5.15 wurden der Absatz zum Verbindungsaufbau bei Reverb klargestellt und ein Absatz als Stand vom 2026-10-16 gekennzeichnet. In 5.18 wurden nur Absätze zur Grundlast von Redis ergänzt, Regel und Schwellen von H8 blieben gleich. Alle Änderungen stehen mit Datum in Abschnitt 8.
- `plan.json` enthält 13 Vergleiche, 3 Laststufen, 4 Familien, damit 39 Tests je Familie, α = 0,05, `confirmatoryBlock` 1, `replicationBlock` 2, G1 bis G4 deutsch und englisch, die Replikationsregel deutsch und englisch und für H1 bis H11 jeweils `text`, `text_en`, `rule` und `rule_en`. Die englischen Fassungen entsprechen inhaltlich den deutschen, H6 erklärt den Grund im Englischen ausführlicher als in der deutschen Klammer.
- Alle Dockerfiles des Repositorys und die Images von Redis und Nginx sind auf Digests gepinnt. Nicht gepinnt sind nur Dockerfiles in `vendor/` von Laravel Sail, die nicht versioniert sind und nicht genutzt werden.
- Versionen laut Lock-Dateien entsprechen DECISIONS.md 5.26. Laravel 13.36.0, Reverb 1.12.0, Express 5.3.0, BullMQ 6.3.14, ioredis 6.0.0, node-redis 6.3.0, ws 8.22.0, Ratchet 0.4.4.
- Die Images auf dem Pi stammen aus dem Neubau vom selben Tag (`image_id` im Lauf-Protokoll gleich den Manifestlisten der Bauausgabe, `sha256:ae507c2d…` für node-express und `sha256:1981ed66…` für php-laravel).

**B. Belastungstest und Pilot**
- Belastungstest `results/2026-10-22T13-43-23Z_burn-in.csv`, 1 440 Minutenwerte, höchstens 67,2 °C, Drosselstatus durchgehend `0x0`, also auch keine Unterspannung.
- Das Stabilitätskriterium wurde unabhängig von `pilot.js` direkt aus den Zwischenständen der zwölf Pilotkampagnen nachgerechnet. Stabil ab 70, 90, 90 und 80 Paaren auf der Baseline, ab 50, 30, nicht und 50 auf Medium, ab 30, 30, nicht und nicht auf Stress (Vergleiche 1, 4, 7, 10). Das stimmt mit DECISIONS.md 5.9 überein. Die Festlegung auf 90 folgt daraus wie dort begründet und liegt über 20 Paaren.
- Im Pilot war keiner der Messläufe ungültig, in keiner Konfiguration und Laststufe.
- Auslastung des Lastgenerators im Mittel eines Messlaufs höchstens 5,5 % (php-laravel-ws, 10 Clients), bei 500 Clients höchstens 1,6 %. Zum Höchstwert je Sekunde siehe R4.
- Limits und Hardware des Lastgenerators stehen in DECISIONS.md 5.10 und 5.14.
- Pilotdaten haben `phase: pilot` und Namen `pilot-c…`. `evaluate.js` übernimmt nur `phase: main` und überspringt abgebrochene Kampagnen und unvollständige Laststufen (`evaluate.js:59` bis `:77`). Unter den Ergebnissen gibt es keine Kampagne mit dem Namen `b1-…` ohne Präfix.

**C. Geräte (aus den Lauf-Protokollen vom 2026-10-31)**
- Pi mit Governor `performance`, Swap 0, memory- und cpu-Controller aktiv, höchstens 52,9 °C, Drosselstatus `0x0`, 1 880 GB frei auf dem Docker-Datenträger. Die Ergebnisse des gesamten Pilots belegen rund 40 MB, Block 1 und 2 zusammen also deutlich unter 1 GB.
- Alle 23 Dienste in `docker-compose.yml` haben Log-Rotation (`json-file`, 10 MB, 3 Dateien).
- Ereignisquellen und k6 laufen beide über `docker compose` auf dem Lastgenerator (`loadCompose` in `tools/orchestrate/run.js`), Sende- und Empfangszeit kommen also von derselben Uhr.
- Benachrichtigung funktioniert (Ausgabe `true`).
- Redis auf dem Pi enthält nach der Prüfkampagne nur 4 Verwaltungsschlüssel von BullMQ und 2,75 MB. Die neu gebaute Ereignisquelle löscht erledigte Jobs.

**D. Fairness**
- Budget je Variante über systemd-Slices, alle Container einer Variante darin (`docker-compose.pi.yml`), Abbruch, wenn ein Container außerhalb liegt. Redis außerhalb des Budgets und in jedem Lauf mitgemessen.
- Ein Nginx je Variante, Pufferung in beiden Modi aus, gzip global aus, gleicher Lese-Timeout, `worker_connections` 4 096, `worker_rlimit_nofile` 8 192, Nginx vor jedem Lauf neu erzeugt.
- Produktionsbetrieb in allen zehn Varianten im Kontext (`mode.production: true`), Abbruch bei Abweichung in strengen Phasen. OPcache in PHP-FPM aktiv, beide PHP-Images mit gleichem Basis-Image und `php.ini-production`.
- Ein Abonnement je Prozess bei Node.js, Ratchet und dem Laravel-Listener, eines je Worker nur bei PHP-FPM/SSE.
- Gleiches Ereignisformat und absoluter Zeitplan bei `event-simulator` und `scan:produce`, `ts` vor dem Senden bzw. Einreihen auf dem Lastgenerator. In den Queue-Vergleichen läuft je Lauf nur die Quelle der gemessenen Variante.
- Gleiche Fensterlogik und Zählung in allen drei k6-Skripten (`k6/lib/config.js`, `k6/lib/delivery.js`). Verbindungsaufbau bei SSE bis zur Antwort mit Status 200, bei WebSocket bis zum Handshake, bei Reverb ohne das anschließende Abonnement (in 5.15 dokumentiert).
- Reihenfolge in jeder Runde A vor B, beide Varianten mit derselben Zahl an Läufen und Warm-up-Läufen, Pause je Lauf zufällig 100 bis 500 ms.
- Zustand zwischen Läufen für beide Seiten gleich. Nginx wird neu erzeugt, Zellen und FPM-Pools laufen über die ganze Kampagne, die Ereignisquelle startet in Queue-Vergleichen für beide Seiten vor jedem Lauf neu.
- Kein Logging je Event in den SSE- und WS-Servern. Nginx und PHP-FPM schreiben eine Zeile je Verbindung, beide Queue-Worker je Job.
- Seit der letzten statischen Prüfung (`a301490`) kamen der Wechsel der Ereignisquelle, ein eigener Sampler für Nginx, der Vergleich gleichartiger Kontrollmessungen und die Prüfung geänderter versionierter Dateien hinzu. Keine dieser Änderungen wirkt nur auf eine Seite.

**E. Messung und Gültigkeit**
- Latenz aus `ts` der Ereignisquelle und Empfangszeit in k6, beide auf dem Lastgenerator.
- Einschwingzeit 10 s, Haltezeit 60 s, Messfenster ab dem gemeinsamen Start des Szenarios, Verbindungsaufbau über 5 s verteilt.
- Erwartete, eindeutige, verlorene und doppelte Events je Client, bediente Clients, Senderate aus `ts`.
- CPU-Zeit als Differenz von `usage_usec`, Working Set wie in 5.16, Abtastung alle 250 ms, Spitze von Variante und Redis aus der Summe je Abtastung. Nginx getrennt davon.
- Gründe für ungültige Läufe wie in 5.9 umgesetzt, einschließlich Absturz und OOM als erstem Grund, Drosselung, unbekanntem Drosselstatus, fehlgeschlagener Ressourcenmessung, doppelten Events und Auslastung des Lastgenerators über 80 % im Mittel.
- Abbruch einer Kampagne bei mehr als 5 % ungültigen Messläufen je Konfiguration (`maxFailureRate` 0,05).

**F. Kampagnen, Zeitplan, Statistik**
- Trockenlauf von `plan-campaigns.js main --block 1 --runs baseline=90,medium=90,stress=90`. 39 Kampagnen `b1-c01-baseline` bis `b1-c13-stress`, jede mit den Varianten aus `plan.json`, `phase: main`, `block: 1`, 95 Läufen je Konfiguration (90 und 5 Warm-up), 60 s Haltezeit, 10 s Einschwingzeit, 5 s verteilt, 1 Event/s, keine Abweichungen. Insgesamt 7 410 Läufe.
- Kontrollmessung `control-node-minimal-sse` mit 50 Clients, 1 Event/s, 60 s, 6 Läufen davon 1 Warm-up, alle 24 Stunden. Startwert der Reihenfolge 20261016, protokolliert in `schedule_started`. Fortsetzen nach Abbruch über die Namen vollständiger Kampagnen.
- Statistik in `stats.js` und `pairing.js`. Paare über die Laufnummer, nur vollständige Paare, Nullen verworfen, exakter Test bis 50 Paare ohne Bindungen, Grenze von 20 Paaren (`minPairs` 20 in `run.js:271`), Cliff's Delta mit den Schwellen nach Romano, rangbiseriale Korrelation, Bootstrap mit 10 000 Resamples und festem Startwert, Holm je Familie über alle 39 geplanten Tests mit p = 1 für fehlende.
- Replikation in `evaluate.js` über gleiche Richtung und überlappende Intervalle, Effektklasse nur berichtet.
- Unit-Tests `node --test tools/orchestrate/test/stats.test.js`, 15 von 15 bestanden.

**G. Zeitbudget, siehe Abschnitt 8.**

## 8. Zeitbudget mit Rechenweg

| Phase | Rechnung | Dauer |
|---|---|---|
| Block 1 | 7 410 Läufe × 76,3 s (Mittel des Pilots einschließlich Pausen und Vorlauf, `pilot.json`) = 157 h. Dazu Wechsel der Ereignisquelle in den Queue-Vergleichen, 1 710 Läufe × rund 4 s = 1,9 h. Dazu sieben Kontrollmessungen mit je 6 Läufen, rund 0,9 h | rund 160 h, also 6,7 Tage |
| Block 2 | wie Block 1 | rund 6,7 Tage |
| Skalierungsreihe | 10 Varianten × 7 Stufen × 4 Läufe = 280 Läufe × rund 80 s | rund 6 h |
| Sättigungstest | Stufen noch nicht festgelegt (R3). DECISIONS.md 5.9 schätzt Skalierung und Sättigung zusammen unter einem Tag | unter 1 Tag |
| Summe | | rund 14,5 Tage |

Bei einem Start am 2026-10-31 oder 2026-11-01 endet Block 1 um den 2026-11-07, Block 2 um den 2026-11-14 und die Messung insgesamt um den 2026-11-16, wenn die Phasen ohne Pause aufeinander folgen. Der Zeitplan in Schreibleitfaden.md Abschnitt 13 sieht das Ende der Messung am 2026-12-06 vor. Es bleiben rund drei Wochen Puffer. Eine Kürzung nach DECISIONS.md 5.24 ist nicht nötig.
