# Project Context

Created on 2026-11-09 at commit `45d1d14`. This file records the research and project state of the thesis on event-driven notification systems with PHP and Node.js. It is written in English as a documented, provisional exception to the language rule in `DECISIONS.md` Section 7, which remains unchanged.

**How to read this file.** Important statements name their source file and section. Sources marked "outside this repository" are working files of the project that are not published here. Statements without a supporting project file are marked "unconfirmed". Dated decisions keep their original date, and later additions are named as such in Section 9. The binding wording of a decision remains the one in `DECISIONS.md`. Terms and literal German values are explained in `TERMINOLOGY.md`.

## 1. Research questions and scope

**Main research question** (`DECISIONS.md` 5.23, wording refined on 2026-11-09):

> How do ten selected PHP-FPM, event-loop PHP and Node.js prototype variants compare in performance, scalability and implementation complexity when delivering event-driven server-push notifications over long-lived Server-Sent Events or WebSocket connections under identical per-variant resource limits?

**Sub-questions** (`Schreibleitfaden.md` Section 1, outside this repository, German version in `DECISIONS.md` 5.23):

- **RQ1.** How large are the differences in event latency, connection setup time and resource consumption in the thirteen planned comparisons of these variants, and how completely does each variant deliver events?
- **RQ2.** Where are the limits of each variant with respect to the number of concurrent clients and, separately, the event rate?
- **RQ3.** How do the variants differ in implementation complexity and operability, assessed through code size, dependencies, configuration, debugging and monitoring?

**Practical goal** (`Schreibleitfaden.md` Section 1, outside this repository). Derive decision guidance on which combination is suitable for which kind of notification scenario.

**Scope** (`DECISIONS.md` 5.23):

> All variants broadcast each event to all connected clients. Six variants use a framework, and two of these additionally use a message queue. Each variant's application containers are limited to a combined 2 CPUs and 1,536 MiB of memory. For variants consisting of multiple application containers, these limits apply to the containers collectively rather than individually. The shared Redis and Nginx services are outside these limits. Redis is included in the reported resource consumption, while Nginx is reported separately. The study examines ten selected variants and thirteen planned comparisons rather than a full factorial design. Consequently, the results do not isolate the independent effects of programming language, runtime model, transport protocol, framework or message queue.

The refinement of 2026-11-09 follows from the study design and not from measurement results, although the data of block 1 existed at that time. The earlier wording of 2026-10-18 is preserved in `DECISIONS.md` 5.23. Variants, hypotheses, measurements and evaluation rules did not change.

## 2. Variants

Eight variants combine two languages, two transports and minimal or framework-based implementation. Two further variants add a message queue to the framework-based SSE variants. On the PHP side the transport is tied to the runtime model (`DECISIONS.md` 5.5, 5.7, 5.15, 5.19).

| Variant | Language | Runtime model | Transport | Framework | Queue | Application services | Front mode | Event source |
|---|---|---|---|---|---|---|---|---|
| `node-minimal-sse` | Node.js | event loop, single process | SSE | none | none | `node-minimal-sse` | `http` | `pubsub` |
| `node-minimal-ws` | Node.js | event loop, single process | WS | none | none | `node-minimal-ws` | `http` | `pubsub` |
| `node-express-sse` | Node.js | event loop, single process | SSE | Express | none | `node-express-sse` | `http` | `pubsub` |
| `node-express-ws` | Node.js | event loop, single process | WS | Express | none | `node-express-ws` | `http` | `pubsub` |
| `php-minimal-sse` | PHP | PHP-FPM, one worker per connection | SSE | none | none | `php-minimal-fpm` | `fastcgi` | `pubsub` |
| `php-minimal-ws` | PHP | event loop, Ratchet on ReactPHP | WS | none | none | `php-minimal-ws` | `http` | `pubsub` |
| `php-laravel-sse` | PHP | PHP-FPM, one worker per connection | SSE | Laravel | none | `php-laravel-fpm` | `fastcgi` | `pubsub` |
| `php-laravel-ws` | PHP | event loop, Reverb, plus listener process | WS | Laravel | none | `php-laravel-reverb`, `php-laravel-listener` | `http` | `pubsub` |
| `node-express-sse-queue` | Node.js | event loop, single process, plus worker | SSE | Express | BullMQ | `node-express-sse-queue`, `node-express-worker` | `http` | `bullmq` |
| `php-laravel-sse-queue` | PHP | PHP-FPM, one worker per connection, plus worker | SSE | Laravel | Laravel Queue | `php-laravel-fpm-queue`, `php-laravel-queue-worker` | `fastcgi` | `laravel` |

Source of services, front mode and event source is `tools/orchestrate/cells.json`. Source of the other columns is `DECISIONS.md` 5.5, 5.7 and 5.19.

## 3. Planned comparisons

The study uses thirteen planned comparisons and not all possible pairs. The labels are the German values of the `question` field. The last column names what changes along with the labelled dimension (`tools/orchestrate/plan.json`, `DECISIONS.md` 5.6.1, 5.15, 5.18, `prototypes/node-express/sse.js`, `prototypes/node-express/ws.js`).

| No. | A | B | Label | What also changes |
|---|---|---|---|---|
| 1 | `node-minimal-sse` | `php-minimal-sse` | `Sprache (SSE, ohne Framework)` | language and runtime model, PHP-FPM against the Node.js event loop, front proxy mode |
| 2 | `node-minimal-ws` | `php-minimal-ws` | `Sprache (WS, ohne Framework)` | language and WebSocket library, both event loops |
| 3 | `node-express-sse` | `php-laravel-sse` | `Sprache (SSE, mit Framework)` | language, runtime model, framework, front proxy mode |
| 4 | `node-express-ws` | `php-laravel-ws` | `Sprache (WS, mit Framework)` | language, framework, listener process with internal HTTP call, Pusher protocol, k6 script |
| 5 | `node-minimal-sse` | `node-express-sse` | `Framework-Overhead (Node.js, SSE)` | Express handles the connection setup, the event path is otherwise the same |
| 6 | `node-minimal-ws` | `node-express-ws` | `Framework-Overhead (Node.js, WS)` | Express is loaded but does not handle the WebSocket path |
| 7 | `php-minimal-sse` | `php-laravel-sse` | `Framework-Overhead (PHP, SSE)` | Laravel is started for every SSE connection |
| 8 | `php-minimal-ws` | `php-laravel-ws` | `Framework-Overhead (PHP, WS)` | Ratchet against Reverb, listener process, internal HTTP call, Pusher protocol, k6 script |
| 9 | `node-express-sse` | `node-express-sse-queue` | `Queue-Overhead (Node.js, SSE)` | BullMQ, worker, event source |
| 10 | `php-laravel-sse` | `php-laravel-sse-queue` | `Queue-Overhead (PHP, SSE)` | Laravel Queue, worker, event source |
| 11 | `node-express-sse-queue` | `php-laravel-sse-queue` | `Sprache mit Queue (SSE, mit Framework)` | complete stack including queue implementation and runtime model |
| 12 | `node-minimal-sse` | `node-minimal-ws` | `Transport (Node.js, ohne Framework)` | transport and k6 module, same runtime model, closest to a protocol comparison |
| 13 | `php-minimal-sse` | `php-minimal-ws` | `Transport (PHP, ohne Framework)` | transport, runtime model, front proxy mode, k6 module |

## 4. Experimental design

| Aspect | Value | Source |
|---|---|---|
| Test server | Raspberry Pi 5 with 4 GB, kernel with 4 KB pages | `DECISIONS.md` 5.10, 5.14 |
| Load generator | separate laptop, connected by wired LAN, runs k6 and the event sources | `DECISIONS.md` 5.14 |
| Load tool | k6 1.2.1 with xk6-sse 0.1.12 | `DECISIONS.md` 5.26 |
| Software | PHP 8.5.11, Node.js 26.11.1, Laravel 13.36.0, Reverb 1.12.0, Express 5.3.0, BullMQ 6.3.14, Redis 8.10.2, Nginx 1.30.5 and further components | `DECISIONS.md` 5.26 |
| Event path | Redis Pub/Sub for all variants, HTTP/1.1, broadcast to all clients | `DECISIONS.md` 5.2, 5.4, 5.21 |
| Event format | Lokato scan format plus `seq` and `ts`, about 140 bytes | `DECISIONS.md` 5.4, 5.21 |
| Load levels | 10, 50 and 500 clients at 1 event per second | `tools/orchestrate/plan.json` |
| One run | settling period of 10 s with clients connecting over the first 5 s, then 60 s hold time | `DECISIONS.md` 5.9 |
| One campaign | one comparison at one level, priming run with 550 clients, 5 warm-up runs and 90 evaluated runs per variant, alternating A and B, random pause of 100 to 500 ms | `DECISIONS.md` 5.9 |
| Pairs | runs with the same run number, A always before B, median distance 76 s in block 1 | `DECISIONS.md` 5.8, 5.14 |
| Order | random order of the 39 campaigns per block, seed `20261016` for block 1 and `20261031` for block 2 | `DECISIONS.md` 5.9 |
| Process state | variants keep running through the 95 runs of a campaign | `tools/orchestrate/run.js`, `DECISIONS.md` 5.8 |
| Invalid runs | clients not connected in the settling period, error pages or failed handshakes, duplicate events, load generator above 80 %, k6 errors, no events, crashed or OOM-killed containers, failed resource measurement, throttling | `DECISIONS.md` 5.9 |
| Abort rule | more than 5 % invalid runs per configuration ends a campaign in the strict phases | `DECISIONS.md` 5.9 |

| Phase | Purpose | Evaluation | Source |
|---|---|---|---|
| Burn-in | 24 hours under full load | descriptive | `DECISIONS.md` 5.9, 5.14 |
| Pilot | number of repetitions, comparisons 1, 4, 7 and 10 | not confirmatory | `DECISIONS.md` 5.9 |
| Block 1 | main measurement of all 39 planned tests per measure | confirmatory | `DECISIONS.md` 5.9 |
| Block 2 | complete repetition with a different random campaign order | replication, descriptive | `DECISIONS.md` 5.8, 5.9 |
| Scaling series | 10, 50, 100, 250, 500, 750 and 1,000 clients at 1 event per second, 3 runs after 1 warm-up run | descriptive | `DECISIONS.md` 5.9 |
| Saturation test | 50 clients, 10 to 1,000 events per second in nine levels, 3 runs after 1 warm-up run, five conditions per level | descriptive | `DECISIONS.md` 5.17 |
| Connection storm | 500 clients at once after a restart, 3 runs | descriptive | `DECISIONS.md` 5.9, 5.10 |
| Control measurement | daily, `node-minimal-sse`, 50 clients, 5 runs after 1 warm-up run | descriptive | `DECISIONS.md` 5.9 |

## 5. Resource limits and fairness

| Rule | Statement | Source |
|---|---|---|
| Limit per variant | 2 CPUs and 1,536 MiB shared by all application containers of a variant, through one systemd slice per variant, without swap | `DECISIONS.md` 5.6.2, 5.10 |
| Multi-container variants | `php-laravel-ws`, `node-express-sse-queue` and `php-laravel-sse-queue` have two application containers and share one limit | `tools/orchestrate/cells.json`, `DECISIONS.md` 5.6.2 |
| Redis | outside the limit, included in the resource measures as variant and Redis, also reported separately | `DECISIONS.md` 5.6.2, 5.16 |
| Nginx | outside the limit, one front proxy per variant, reported separately and only descriptively | `DECISIONS.md` 5.6.1, 5.16 |
| Computing power outside the limit | Redis and Nginx can use the remaining cores. This concerns mainly latency comparisons 1, 3, 11 and 13 | `DECISIONS.md` 5.6.2 |
| Node.js process | a single process without `cluster`. Equal allocation does not mean equal ability to use it | `DECISIONS.md` 5.6 |
| Production mode | production settings according to official documentation, checked by the orchestrator | `DECISIONS.md` 5.5, 5.16 |
| Running services | only the two variants of the campaign and the shared services run. In comparisons 9 to 11 only the event source of the measured variant runs | `DECISIONS.md` 5.6.3 |
| Clock | send and receive timestamps come from the load generator | `DECISIONS.md` 5.14 |
| Budget use | at 500 clients the median CPU use per variant was 0.8 to 3.6 % of the 2 CPUs in block 1. The limit is a feature of the setup and not a bottleneck at the main load levels | `DECISIONS.md` 5.9 |

## 6. Measures and statistical analysis

| Family | Role | Tests | Source |
|---|---|---|---|
| `latency_mean_ms` | primary | 39 | `tools/orchestrate/plan.json`, `DECISIONS.md` 5.8 |
| `cpu_seconds_total` | secondary | 39 | same |
| `working_set_peak_bytes_total` | secondary | 39 | same |
| `connect_mean_ms` | secondary | 39 | same |

That is 156 tests per block. The temporal diagnosis covers 156 tests per block and 312 over both blocks. Delivery is reported descriptively and is not one of the tested measures (`tools/orchestrate/run.js`, `TESTED_MEASURES`). Code metrics and a qualitative debugging comparison answer RQ3 (`DECISIONS.md` 5.13, 5.22).

| Element | Procedure | Source |
|---|---|---|
| Unit of analysis | the run, with the mean latency per run as the test measure | `DECISIONS.md` 5.8 |
| Test | Wilcoxon signed-rank test, paired, two-sided, alpha 0.05, exact up to 50 pairs without ties, otherwise normal approximation | `DECISIONS.md` 5.8, `tools/orchestrate/stats.js` |
| Effect sizes | Cliff's delta with fixed thresholds, rank-biserial correlation | `DECISIONS.md` 5.8 |
| Interval | percentile bootstrap of the median of the paired differences, 10,000 resamples, fixed seed | `DECISIONS.md` 5.8 |
| Multiple tests | Holm correction per family over 39 tests of block 1, missing tests enter with p = 1 | `DECISIONS.md` 5.8 |
| Minimum | fewer than 20 usable pairs is marked as not conclusive | `DECISIONS.md` 5.8 |
| Sensitivity analysis | descriptive sign test, Hodges-Lehmann estimator and skewness | `DECISIONS.md` 5.8 |
| Temporal diagnosis | descriptive lag-1 autocorrelation before and after removing a linear trend, trend share, change between runs 6 to 50 and 51 to 95, four classes, limit 2/sqrt(n) as a heuristic | `DECISIONS.md` 5.8, `tools/orchestrate/assessment.js` |

**Statistical limits.**

- The Wilcoxon tests with Holm correction remain the pre-specified decision rule. That is no proof of their statistical validity. Under serial dependence the p-values give no securely calibrated inference, and the family-wise error rate is not secured (`DECISIONS.md` 5.8).
- The 90 pairs of a test share one process course, and A was always measured before B. Tests, median differences, intervals and effect sizes describe the campaign. Only block 1 and block 2 are separate executions of a comparison, and they share hardware, images, commit and load generator (`DECISIONS.md` 5.8, 5.23).
- Bootstrap intervals are read as nominal intervals within a campaign (`DECISIONS.md` 5.8).
- The diagnosis confirms no test decision and is not a test of independence. About 2 to 3 false alarms per 156 tests are expected under independent differences, and about 4 to 5 over both blocks (`DECISIONS.md` 5.8).
- The replication rule can fail for small differences or narrow intervals. A reconstruction within block 1, stricter than the real replication, suggested about 18 % for the working set with the same direction in 92 % (`DECISIONS.md` 5.8, `results/2026-11-09_temporal-dependence-check/`).
- Four tests of block 1 are decided differently by the Wilcoxon test and the sign test (`DECISIONS.md` 5.8).
- Memory at 10 and 50 clients shows the size of the PHP-FPM pool and not the cost per connection (`DECISIONS.md` 5.5).
- The H4 limit is partly set by the configuration of 550 workers. Further tensions between hypotheses are listed in `DECISIONS.md` 5.18.
- The test load is a broadcast with a uniform rate, without authentication or connection loss. Worker release after the next event and the absence of own heartbeats are described in `DECISIONS.md` 5.21.

## 7. Hypotheses

The wording and rules are taken unchanged from `tools/orchestrate/plan.json`. The hypotheses were fixed before data collection, and the general decision rules on 2026-10-17 (`DECISIONS.md` 5.18). The outcomes come from `results/2026-11-09T00-26-22-566Z_evaluation/evaluation.json`. They are results of the pre-specified rules for block 1 only. H4 and H11 need the scaling series and the saturation test.

General decision rules:

> G1: A directional claim is supported if the test is significant after Holm correction and the median difference points in the predicted direction.
>
> G2: A claim of no difference or at most a small difference is assessed with the effect size (|δ| < 0.33), not with the absence of significance.
>
> G3: "A multiple" means a ratio of the medians of at least 2.
>
> G4: If a hypothesis covers several comparisons or load levels, it is supported if the condition holds in all cases and not supported if at least one case shows the opposite. Otherwise it is undecided, as it is when a required comparison has fewer than 20 valid pairs or is missing.

Replication rule:

> A result is replicated if block 2 shows the same direction of the median difference and the 95% confidence intervals of both blocks overlap. The effect size category is reported but is not a condition.

**H1.** With Server-Sent Events, PHP-FPM requires a multiple of the memory that Node.js requires at 500 clients.

Decision rule. Comparisons 1 and 3 at 500 clients: the working set (variant and Redis) of PHP is at least twice that of Node.js, and the difference is significant.

Block 1 outcome of the pre-specified rule. `bestätigt`, with 2 cases `erfüllt`, 0 `gegenteil` and 0 `unklar`.

**H2.** At 10 clients, the latency differences are at most small (|δ| < 0.33).

Decision rule. All 13 comparisons at 10 clients: |δ| < 0.33 for the latency. Not supported as soon as one comparison shows |δ| ≥ 0.33 together with a significant difference.

Block 1 outcome of the pre-specified rule. `nicht bestätigt`, with 8 cases `erfüllt`, 5 `gegenteil` and 0 `unklar`.

**H3.** From 10 to 500 clients, the latency differences between PHP and Node.js increase. The direction of the difference is open.

Decision rule. Comparisons 1 to 4: the absolute median difference of the latency is larger at 500 clients than at 10 clients and significant at 500 clients. Cliff's delta is not used here because it approaches its maximum already at 10 clients when a difference is consistent.

Block 1 outcome of the pre-specified rule. `bestätigt`, with 4 cases `erfüllt`, 0 `gegenteil` and 0 `unklar`.

**H4.** In the scaling series, PHP-FPM with Server-Sent Events is the first variant to reach a hard limit. The Node.js variants and the PHP WebSocket servers slow down gradually.

Decision rule. The PHP-FPM variants with Server-Sent Events (php-minimal-sse, php-laravel-sse and php-laravel-sse-queue) have the lowest capacity limits of all variants, and their served ratio drops by at least 5 percentage points between two consecutive steps (hard limit). The Node.js variants and the PHP WebSocket servers show no such drop up to the same step.

Block 1 outcome of the pre-specified rule. `unentschieden`, with 0 cases `erfüllt`, 0 `gegenteil` and 1 `unklar`.

**H5.** The framework effect is small for the event latency. For the connection setup time and the memory, it is considerably larger with Laravel than with Express.

Decision rule. Comparisons 5 to 8: |δ| < 0.33 for the latency at all load levels. For the connection setup time and the working set, the median difference between Laravel and the minimal implementation is larger than between Express and the minimal implementation at the same transport and load level, and the Laravel effect is significant.

Block 1 outcome of the pre-specified rule. `nicht bestätigt`, with 18 cases `erfüllt`, 5 `gegenteil` and 1 `unklar`.

**H6.** The framework-based PHP WebSocket variant (php-laravel-ws) has a consistently higher latency than the framework-based Node.js WebSocket variant (node-express-ws), because every event passes through an additional internal HTTP call from the listener to Reverb.

Decision rule. Comparison 4: php-laravel-ws has a significantly higher latency at all three load levels.

Block 1 outcome of the pre-specified rule. `bestätigt`, with 3 cases `erfüllt`, 0 `gegenteil` and 0 `unklar`.

**H7.** The message queue increases the latency in both stacks, more so with Laravel than with BullMQ.

Decision rule. Comparisons 9 and 10: the queue variant has a significantly higher latency at all load levels, and the median difference is larger for Laravel (comparison 10) than for BullMQ (comparison 9).

Block 1 outcome of the pre-specified rule. `nicht bestätigt`, with 8 cases `erfüllt`, 1 `gegenteil` and 0 `unklar`.

**H8.** With PHP and Server-Sent Events, Redis accounts for a substantial share of the total CPU time. For all other variants, its share is small.

Decision rule. At 500 clients, median share of Redis in the total CPU time over all valid runs of the variant in block 1: at least 25% for all PHP-FPM variants with Server-Sent Events (php-minimal-sse, php-laravel-sse and php-laravel-sse-queue, substantial) and below 10% for all other variants (small).

Block 1 outcome of the pre-specified rule. `nicht bestätigt`, with 7 cases `erfüllt`, 3 `gegenteil` and 0 `unklar`.

**H9.** With Node.js, where both transports use the same runtime model, Server-Sent Events cause less overhead than WebSockets, that is, less CPU time and a smaller working set at the same load (expectation from the proposal).

Decision rule. Comparison 12: Server-Sent Events have a significantly lower CPU time and a significantly smaller working set at all load levels.

Block 1 outcome of the pre-specified rule. `nicht bestätigt`, with 1 cases `erfüllt`, 5 `gegenteil` and 0 `unklar`.

**H10.** With PHP, the runtime model determines the transport comparison. PHP-FPM with Server-Sent Events (one worker per connection) requires a multiple of the memory of the Ratchet WebSocket server (one event loop) at 500 clients.

Decision rule. Comparison 13 at 500 clients: the working set of Server-Sent Events is at least twice that of WebSockets, and the difference is significant.

Block 1 outcome of the pre-specified rule. `bestätigt`, with 1 cases `erfüllt`, 0 `gegenteil` and 0 `unklar`.

**H11.** At high event rates, the WebSocket variants reach a higher maximum sustainable event rate than the Server-Sent Events variants with the same language and the same framework choice (expectation from the proposal).

Decision rule. In all four pairs of a Server-Sent Events variant and a WebSocket variant with the same language and framework choice, the WebSocket variant reaches the higher maximum sustainable event rate. Undecided in case of a tie, for example when both reach the highest step.

Block 1 outcome of the pre-specified rule. `unentschieden`, with 0 cases `erfüllt`, 0 `gegenteil` and 1 `unklar`.

## 8. Research gap and literature status

**Gap** (`LITERATUR.md`, Classification and research gap, marked there as a draft):

> In documented searches of IEEE Xplore, the ACM Digital Library and Google Scholar, complemented by forward and backward citation tracking of seven key works and based on the titles, abstracts and bibliographic data of the screened records and on the full texts of selected candidates rather than on all hits or full texts, no study was identified that measures PHP-FPM with one worker per open SSE connection, event-loop PHP WebSocket servers and Node.js for server push over long-lived connections under the same explicit CPU and memory limits per variant, including framework and queue variants and using planned pairwise contrasts, paired runs and an analysis plan fixed before data collection. This does not show that no such study exists. Because the transport is tied to the execution model in PHP and the queue was studied only in framework-based SSE variants, these contrasts are not independent effects of language, framework, transport and queue.

**Limits of the search** (`LITERATUR.md`):

> 2,018 displayed ACM positions and the papers inside 171 proceedings volumes were not screened. Mostly titles and abstracts were read. Citation tracking went one level deep, and no forward citations could be determined for Van Berkel & Ali (2021). DiVA and BASE were not searched specifically.

Search volume according to `Schreibplan-Forschungsstand-und-Forschungsluecke-2026-11-08.md` (outside this repository). IEEE Xplore with 13 queries, 76 hits and 61 titles. ACM Digital Library with 12 search runs, 834 screened positions and 572 identifiers, 401 of them individual papers. Google Scholar with at most 134 entries. Citation tracking of 7 works with 39 works found. Positions are not studies. The search is documented in `Forschungsluecke-Literaturmatrix-und-Suchprotokoll-2026-11-08.md` (outside this repository).

| Status | Sources | Source of this status |
|---|---|---|
| Full text checked | Słodziak & Nowak 2016, Appelqvist & Örnmyr 2017, Van de Vyvere et al. 2020 (manuscript version), Mufid et al. 2024, Thirunavukkarasu et al. 2018, Tsindeliani et al. 2022, Gracia Orejuela et al. 2024 | `Schreibleitfaden.md` Section 2, Chapter 3 (outside this repository) |
| Full text partly checked, pages known | Chaniotis et al. 2015, Lei et al. 2014, Murley et al. 2021, Bigestans 2014, Fladvad & Khans 2021, Estep 2013 | same |
| Grey literature | Van Berkel & Ali 2021, article and 16 result files checked, not peer reviewed | same, `LITERATUR.md` |
| Theses | Appelqvist & Örnmyr, Bigestans, Fladvad & Khans (bachelor), Estep (master) | `LITERATUR.md` |
| Original not accessible | Raab 2017 | `LITERATUR.md` |
| Title, abstract or metadata only | Cabane & Farias 2024 (title only, unverified), sources on queues and brokers from the search | `LITERATUR.md`, `Schreibleitfaden.md` Section 2 (outside this repository) |
| Not part of this search | Lauer & Needham, Welsh et al., von Behren et al., Pariag et al., Tilkov & Vinoski, Farias & Lazzari, Laigner et al., Woodside | `Schreibleitfaden.md` Section 2 (outside this repository) |

Open source checks are listed under "To check by hand" in `LITERATUR.md`.

## 9. Dated decisions

Each row gives the date of the decision and its position relative to the data. Later additions do not change the original decisions.

| Date | Decision or addition | Position relative to data | Source |
|---|---|---|---|
| 2026-07-26 | repository, runtime environment, feasibility of xk6-sse, portability | before data | `DECISIONS.md` Sections 1 to 4, 8 |
| 2026-08-25 | debugging comparison carried out, statistics first defined | before data | `DECISIONS.md` 5.13, 8 |
| 2026-10-16 | Nginx, HTTP/1.1, Redis, PHP-FPM, budget per variant, Raspberry Pi, queue dimension, hypotheses H1 to H11 | before data collection | `DECISIONS.md` 5.1, 5.2, 5.4, 5.5, 5.6, 5.14, 5.18, 5.19 |
| 2026-10-17 | decision rules G1 to G4, connection setup as a test family, focus of the text, budget per variant clarified | before data collection, last substantive change of `tools/orchestrate/plan.json` | `DECISIONS.md` 5.6.2, 5.8, 5.18, 5.24 |
| 2026-10-19 | deviations from the proposal confirmed by the supervisor | before data collection | `DECISIONS.md` 5.23 |
| 2026-10-22 | final limits of 2 CPUs and 1,536 MiB | before the pilot | `DECISIONS.md` 5.10 |
| 2026-10-27 | staggered connection setup, 4 KB pages, version rule | before the pilot | `DECISIONS.md` 5.10, 5.26 |
| 2026-10-29 | priming run | before the pilot | `DECISIONS.md` 5.9 |
| 2026-10-31 | 90 runs per level after the pilot, one event source per run in comparisons 9 to 11, separate queue channels, Redis healthcheck only at start, table of case types for hypotheses | after the pilot. The case table was fixed after block 1 had started and before its evaluation | `DECISIONS.md` 5.6.3, 5.9, 5.18, 5.19 |
| 2026-11-07 | zero direction in the replication rule made explicit, known tensions and asymmetries recorded | after block 1, before block 2 | `DECISIONS.md` 5.5, 5.6.2, 5.8, 5.18 |
| 2026-11-08 | sensitivity analysis added, saturation conditions and levels released, overview figures | after block 1, before block 2 was evaluated and before saturation data | `DECISIONS.md` 5.8, 5.17, 5.24, 5.25 |
| 2026-11-09 | descriptive temporal diagnosis | after block 1, before block 2 was opened | `DECISIONS.md` 5.8 |
| 2026-11-09 | research questions refined, wording on load levels and queue comparisons clarified, memory after the priming run specified, worker release and heartbeats described | later clarifications, original text preserved where dated | `DECISIONS.md` 5.5, 5.9, 5.15, 5.21, 5.23, 5.24 |

The tests, test families, hypotheses and rules G1 to G4 were fixed before data collection. There was no entry in a public registry. Other deviations from the proposal are listed in `DECISIONS.md` 5.23.

## 10. Measurement and evaluation status

Status at commit `45d1d14` on 2026-11-09.

| Item | Status | Source |
|---|---|---|
| Pilot | complete | `results/2026-10-31T13-20-12-224Z_pilot/` |
| Block 1 | complete, 2026-10-31 to 2026-11-07, commit `ac47cb7`, 39 campaigns, 7,410 runs, 7,020 evaluated runs, all valid | `DECISIONS.md` 5.14 |
| Block 1 evaluation | `results/2026-11-09T00-26-22-566Z_evaluation/` | `DECISIONS.md` 5.8 |
| Block 1 figures | `results/2026-11-08T14-59-00-947Z_figures/` | `DECISIONS.md` 5.25 |
| Code metrics | `results/2026-10-31T18-44-47-671Z_code-metrics/` | `DECISIONS.md` 5.22 |
| Block 2 | in progress since 2026-11-08. No block 2 data is in this repository at this commit | `Schreibleitfaden.md` Section 13 (outside this repository) |
| Connection storm | first run of 2026-10-29 on commit `19faccf`. Repeat on commit `ac47cb7` after block 2 is pending and is the one that counts | `DECISIONS.md` 5.14 |
| Scaling series, saturation test, `probe-sat-` | pending | `DECISIONS.md` 5.9, 5.17 |
| Replication | not assessed | `DECISIONS.md` 5.8 |

Block 1 counts of the temporal diagnosis, from `results/2026-11-09T00-26-22-566Z_evaluation/evaluation.json`. The last column counts the tests that are significant after Holm correction under the pre-specified rule, 128 in total. This is a count and no confirmation.

| Measure | `ohne Befund` | `nur linearer Trend` | `Reststruktur` | `nicht bestimmbar` | Significant after Holm |
|---|---|---|---|---|---|
| `latency_mean_ms` | 39 | 0 | 0 | 0 | 26 |
| `cpu_seconds_total` | 34 | 4 | 1 | 0 | 36 |
| `working_set_peak_bytes_total` | 7 | 5 | 27 | 0 | 39 |
| `connect_mean_ms` | 39 | 0 | 0 | 0 | 27 |

In block 1, 8 of 39 campaigns ran with at least one process that an earlier campaign had already used.

**To update after the measurements.**

- Status of block 2 and of its data check in this section
- Evaluation directory, replication results and temporal diagnosis of block 2
- Connection storm, `probe-sat-`, scaling series and saturation test
- Outcomes of H4 and H11, and all hypothesis outcomes where block 2 is reported
- Figures for scaling and saturation
- Commit and date at the top of this file

## 11. Open tasks

| Task | Source |
|---|---|
| Choose the final title with the supervisor | `DECISIONS.md` Section 6 |
| Receive the supervisor's feedback on the refined research question. No feedback is documented | `DECISIONS.md` 5.23 |
| Complete block 2, the storm, `probe-sat-`, scaling and saturation | `DECISIONS.md` 5.9, 5.14, 5.17 |
| Evaluate with the temporal diagnosis in `tools/orchestrate/evaluate.js`, generate the final figures | `DECISIONS.md` 5.8, 5.25 |
| Check figures in the thesis document | `DECISIONS.md` Section 6 |
| Complete the checks by hand, among them Romano et al., Arcuri & Briand, Kalibera & Jones, Felter et al., Cabane & Farias | `LITERATUR.md` |

## 12. Claims that the data do and do not support

| Permitted | Not permitted |
|---|---|
| A test is significant under the pre-specified rule | The family-wise error rate is secured for all tests |
| A hypothesis is supported under the pre-specified rule | A hypothesis is statistically proven |
| The median difference in this campaign, measured with A before B | The true difference between the variants |
| A nominal interval within the campaign | 95 % certainty about the true difference |
| The diagnosis shows `Reststruktur` for 28 significant tests | The other tests are independent |
| The diagnosis describes where assumptions are questionable | The diagnosis confirms the 128 decisions |
| Block 1 and block 2 show the same or a different direction and size | A difference holds in general across executions |
| Differences between the concrete variants of this setup | Isolated effects of language, framework, transport or queue, general statements about PHP or Node.js |
| In the documented searches no such study was identified | No such study exists |

Source is `DECISIONS.md` 5.8, 5.15, 5.23 and `LITERATUR.md`.

## 13. Unconfirmed statements

| Statement | Status | Source |
|---|---|---|
| The rise in PHP-FPM memory after the priming run comes from each worker using more memory at its second use | unconfirmed, the pattern fits 550 workers but the mechanism was not measured | `DECISIONS.md` 5.5 |
| Cause of the slow Node.js runs at 500 clients | unconfirmed, not investigated | `DECISIONS.md` 5.14 |
| Cause of the difference in comparison 6, where Express is not on the WebSocket path | unconfirmed, not investigated | `prototypes/node-express/ws.js`, `results/2026-11-09T00-26-22-566Z_evaluation/` |
