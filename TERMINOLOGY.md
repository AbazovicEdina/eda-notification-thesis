# Terminology

Created on 2026-11-09 at commit `45d1d14`. This file fixes the English terms of the project and explains German terms and literal values that appear in the repository. It is written in English as a documented, provisional exception to the language rule in `DECISIONS.md` Section 7, which remains unchanged. Sources marked "outside this repository" are working files of the project that are not published here.

## 1. Project terms

The first column is the term to use. The second column shows the name that existing German documents and code use.

| Term | German term in the project | Meaning | Source |
|---|---|---|---|
| variant | Zelle, Variante | One of the ten measured configurations, for example `node-minimal-sse`. Code and `DECISIONS.md` say cell | `tools/orchestrate/cells.json`, `Schreibleitfaden.md` Section 7 (outside this repository) |
| design dimension | Achse | Language, framework, transport or message queue. A dimension structures the variants and is not an independent factor | `DECISIONS.md` 5.23, `Schreibleitfaden.md` Section 7 (outside this repository) |
| comparison, planned comparison | Vergleich | One of the thirteen planned comparisons of two variants | `tools/orchestrate/plan.json`, `DECISIONS.md` 5.15 |
| minimal implementation | Minimalvariante | Variant without a framework | `DECISIONS.md` 5.7 |
| framework-based implementation | Framework-Variante | Variant with Express or Laravel | `DECISIONS.md` 5.7 |
| queue variant | Queue-Zelle | `node-express-sse-queue` or `php-laravel-sse-queue` | `DECISIONS.md` 5.19 |
| transport | Transport, Transportart | Server-Sent Events (SSE) or WebSocket (WS) | `DECISIONS.md` 5.15 |
| runtime model | Laufzeitmodell | PHP-FPM with one worker per SSE connection, a PHP event-loop server, or the Node.js event loop | `DECISIONS.md` 5.5, 5.6 |
| event-loop PHP | PHP mit Ereignisschleife | Long-running PHP WebSocket server. Ratchet on ReactPHP in `php-minimal-ws`, Laravel Reverb in `php-laravel-ws` | `DECISIONS.md` 5.5 |
| run | Lauf | One k6 measurement. The unit of analysis | `DECISIONS.md` 5.8 |
| pair | Paar | Runs of both variants of a comparison with the same run number, directly after each other, A before B | `DECISIONS.md` 5.8, 5.14 |
| campaign | Kampagne | All runs of one comparison at one load level | `DECISIONS.md` 5.9, 5.15 |
| block | Block | Block 1 is the confirmatory block, block 2 the replication block of the main measurement | `DECISIONS.md` 5.9 |
| load level | Laststufe | 10, 50 or 500 clients at 1 event per second. Named by the number of clients | `tools/orchestrate/plan.json`, `DECISIONS.md` 5.9 |
| warm-up run | Warm-up-Lauf | One of the first 5 runs per configuration of a campaign, not evaluated | `DECISIONS.md` 5.9 |
| priming run | Vorlauf | 550 clients connect once per configuration before the first warm-up run, not evaluated | `DECISIONS.md` 5.9 |
| settling period | Einschwingzeit | The first 10 s of a run, not evaluated | `DECISIONS.md` 5.9 |
| staggered connection setup | verteilter Verbindungsaufbau | Clients connect evenly over the first 5 s of the settling period | `DECISIONS.md` 5.9, 5.10 |
| hold time | Haltezeit | The 60 s after the settling period | `DECISIONS.md` 5.9 |
| measurement window | Messfenster | The period in which events are evaluated | `DECISIONS.md` 5.8 |
| event latency | Event-Latenz | Time from the send timestamp of the event source to reception by k6, both on the load generator | `DECISIONS.md` 5.4, 5.14 |
| connection setup time | Verbindungsaufbau | Time until the response headers of SSE or the completed WebSocket handshake | `DECISIONS.md` 5.9 |
| delivery ratio | Zustellquote | Unique events divided by the events between the first and last received event of each client | `DECISIONS.md` 5.17 |
| served ratio | Anteil bedienter Clients | Share of clients that received at least one event in the measurement window | `DECISIONS.md` 5.16, 5.17 |
| working set | Working Set | `memory.current` minus `inactive_file`, sampled every 250 ms | `DECISIONS.md` 5.16 |
| resource budget, per-variant limit | Ressourcenbudget | 2 CPUs and 1,536 MiB of memory shared by all application containers of a variant | `DECISIONS.md` 5.6.2, 5.10 |
| variant and Redis | Zelle und Redis, Variante + Redis | Resource measures that add Redis to the variant | `DECISIONS.md` 5.6.2, 5.16 |
| front proxy | Front-Nginx | The Nginx in front of every variant, as HTTP proxy or FastCGI front | `DECISIONS.md` 5.6.1 |
| event source | Ereignisquelle | Produces the events on the load generator | `DECISIONS.md` 5.4, 5.19 |
| load generator | Lastgenerator | Second computer with k6 and the event sources | `DECISIONS.md` 5.14 |
| test server, system under test | Testserver, SUT-Seite | The Raspberry Pi | `DECISIONS.md` 5.14 |
| scaling series | Skalierungsreihe | Descriptive series up to 1,000 clients at 1 event per second | `DECISIONS.md` 5.9 |
| saturation test | Sättigungstest | Descriptive series of event rates with 50 clients | `DECISIONS.md` 5.17 |
| connection storm | Ansturm | 500 clients connect at once after a restart of the variant, descriptive | `DECISIONS.md` 5.9, 5.10 |
| control measurement | Kontrollmessung | Daily measurement of `node-minimal-sse` to show drift | `DECISIONS.md` 5.9 |
| capacity limit | Kapazitätsgrenze | Smallest number of clients at which the median served ratio is below 99 % | `DECISIONS.md` 5.9 |
| maximum sustainable event rate | höchste nachhaltige Event-Rate | Highest level up to which every level meets the five conditions | `DECISIONS.md` 5.17 |
| decision rules G1 to G4 | Entscheidungsregeln | General rules for assessing hypotheses | `tools/orchestrate/plan.json`, `DECISIONS.md` 5.18 |
| replication rule | Replikationsregel | Same direction of the median difference and overlapping 95 % intervals of both blocks | `tools/orchestrate/plan.json`, `DECISIONS.md` 5.8 |
| temporal diagnosis | zeitliche Diagnose | Descriptive per-test diagnosis of the paired differences in run order | `DECISIONS.md` 5.8 |
| nominal interval | nominales Intervall | The reported 95 % percentile bootstrap interval, read as an interval within one campaign | `DECISIONS.md` 5.8 |

## 2. Literal German values that stay unchanged

These strings are values in code, JSON output or generated reports. They are quoted as they stand. Their English meaning is given here, and the value itself must not be translated.

| Literal value | Field or place | English meaning | Source |
|---|---|---|---|
| `bestätigt` | hypothesis verdict | supported under the pre-specified rule | `tools/orchestrate/assessment.js`, `VERDICT` |
| `nicht bestätigt` | hypothesis verdict | not supported under the pre-specified rule | `tools/orchestrate/assessment.js`, `VERDICT` |
| `unentschieden` | hypothesis verdict | undecided | `tools/orchestrate/assessment.js`, `VERDICT` |
| `erfüllt` | outcome of a case | the condition holds | `tools/orchestrate/assessment.js`, `OUTCOME` |
| `gegenteil` | outcome of a case | the data show the opposite | `tools/orchestrate/assessment.js`, `OUTCOME` |
| `unklar` | outcome of a case | unclear | `tools/orchestrate/assessment.js`, `OUTCOME` |
| `gemessen` | test status | measured | `tools/orchestrate/assessment.js`, `testsFor` |
| `nicht aussagekräftig` | test status | not conclusive, fewer than 20 usable pairs | `tools/orchestrate/assessment.js`, `testsFor` |
| `fehlt` | test status | missing | `tools/orchestrate/assessment.js`, `testsFor` |
| `verglichen` | replication status | compared | `tools/orchestrate/assessment.js` |
| `Block 1 fehlt`, `Block 2 fehlt` | replication status | block 1 or block 2 is missing | `tools/orchestrate/assessment.js` |
| `vernachlässigbar` | Cliff's delta category | negligible, below 0.147 | `tools/orchestrate/stats.js`, `cliffsMagnitude` |
| `klein` | Cliff's delta category | small, from 0.147 to below 0.33 | `tools/orchestrate/stats.js`, `cliffsMagnitude` |
| `mittel` | Cliff's delta category | medium, from 0.33 to below 0.474 | `tools/orchestrate/stats.js`, `cliffsMagnitude` |
| `groß` | Cliff's delta category | large, 0.474 or more | `tools/orchestrate/stats.js`, `cliffsMagnitude` |
| `ohne Befund` | temporal diagnosis class | no finding. Not evidence of independence | `tools/orchestrate/assessment.js`, `DIAGNOSIS` |
| `nur linearer Trend` | temporal diagnosis class | lag-1 autocorrelation above the limit only before removing a linear trend | `tools/orchestrate/assessment.js`, `DIAGNOSIS` |
| `Reststruktur` | temporal diagnosis class | lag-1 autocorrelation above the limit also after removing a linear trend. A nonlinear course can cause this too | `tools/orchestrate/assessment.js`, `DIAGNOSIS` |
| `nicht bestimmbar` | temporal diagnosis class | cannot be determined | `tools/orchestrate/assessment.js`, `DIAGNOSIS` |
| `weniger als 20 gültige Paare` | reason for `nicht bestimmbar` | fewer than 20 valid pairs | `tools/orchestrate/assessment.js` |
| `zu wenige Nachbarpaare` | reason for `nicht bestimmbar` | too few adjacent pairs | `tools/orchestrate/assessment.js` |
| `konstante Reihe` | reason for `nicht bestimmbar` | constant series | `tools/orchestrate/assessment.js` |
| `keine Reste nach dem linearen Trend` | reason for `nicht bestimmbar` | no residuals after the linear trend | `tools/orchestrate/assessment.js` |
| `primär`, `sekundär` | role of a test family | primary, secondary | `tools/orchestrate/plan.json` |
| `Skalierungsreihe`, `Sättigungstest`, `alle` | `scenario` field of a hypothesis | scaling series, saturation test, all load levels | `tools/orchestrate/plan.json` |
| `SSE-Verbindung: HTTP 200`, `WS-Handshake: HTTP 101` | k6 check names, also in raw results | SSE connection returned status 200, WebSocket handshake returned status 101 | `k6/scripts/sse-feasibility.js`, `k6/scripts/ws-skeleton.js`, `k6/scripts/ws-reverb.js` |

The comparison labels in the `question` field of `tools/orchestrate/plan.json` and the headings of the generated files `evaluation.md`, `series.md` and `figures.md` are also German and stay as they are. A label such as `Sprache (SSE, ohne Framework)` names a planned comparison and does not claim an isolated effect (`DECISIONS.md` 5.15).

## 3. Technical identifiers that stay unchanged

| Kind | Examples | Source |
|---|---|---|
| Variant IDs | `node-minimal-sse`, `php-laravel-sse-queue` | `tools/orchestrate/cells.json` |
| Internal load level names | `baseline`, `medium`, `stress`. They are identifiers for 10, 50 and 500 clients and do not describe resource stress | `tools/orchestrate/plan.json`, `DECISIONS.md` 5.9 |
| Measure names | `latency_mean_ms`, `cpu_seconds_total`, `working_set_peak_bytes_total`, `connect_mean_ms` | `tools/orchestrate/plan.json` |
| JSON fields | `temporal_dependence`, `median_diff`, `run_indices` | `tools/orchestrate/evaluate.js`, `tools/orchestrate/run.js` |
| Campaign names | `b1-c01-stress`, `probe-sat-` | `tools/orchestrate/plan-campaigns.js`, `DECISIONS.md` 5.17 |
| Result directories and commit hashes | `results/2026-11-09T00-26-22-566Z_evaluation/`, `ac47cb7` | `results/`, `DECISIONS.md` 5.14 |
| Section numbers of `DECISIONS.md` | 5.1 to 5.26 | `DECISIONS.md` |
| BibTeX keys | `lei2014performance` | `LITERATUR.md` |
| File names | `DECISIONS.md`, `LITERATUR.md` | repository |

## 4. Wording limits

These limits follow from the study design and the documented decisions.

| Do not write | Write instead | Reason | Source |
|---|---|---|---|
| the effect of language, framework, transport or queue | differences in the planned comparisons of the selected variants | The ten variants are not a full factorial design | `DECISIONS.md` 5.15, 5.23 |
| independent factors, fully factorial | design dimensions, selected variants, planned comparisons | same reason | `DECISIONS.md` 5.23 |
| stress level, resource stress, saturation or overload at the main load levels without evidence | at 500 clients, with increasing client counts. "Under load" is acceptable when it refers to the number of clients and events | CPU use at 500 clients was 0.8 to 3.6 % of the budget in block 1 | `DECISIONS.md` 5.9 |
| confirmed or proven for a hypothesis | supported under the pre-specified rule | An assessment is the result of a rule | `DECISIONS.md` 5.8, 5.23 |
| significance secured, family-wise error rate controlled, for affected tests | decision of the pre-specified rule, p-values not securely calibrated under serial dependence | The paired runs share one process course | `DECISIONS.md` 5.8 |
| robust confirmation by the diagnosis | descriptive diagnosis | The diagnosis confirms no test decision | `DECISIONS.md` 5.8 |
| preregistered, unless limited to parts fixed before data collection | specified in advance and versioned in the repository | There was no entry in a public registry | `tools/orchestrate/plan.json`, `Schreibleitfaden.md` Section 2 (outside this repository) |
| replicated, before the rule has been applied to block 2 | not yet assessed | Block 2 has not been evaluated | `DECISIONS.md` 5.8 |
| first study, no comparable work exists, no study exists | no study was identified in the documented searches | The gap is limited to the documented search | `LITERATUR.md`, Classification and research gap |
| dominant way of running PHP | standard mode according to the documentation | No survey of actual use is available | `DECISIONS.md` 5.5 |
| limit per container | shared limit per variant | Three variants consist of two application containers | `DECISIONS.md` 5.6.2 |
