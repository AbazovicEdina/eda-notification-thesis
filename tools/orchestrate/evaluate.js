#!/usr/bin/env node
// Overall evaluation across all main campaigns (DECISIONS.md 5.8, 5.9, 5.15).
//
// Reads the aggregate.json of several campaign directories, assigns each
// result to one of the comparisons planned in advance in plan.json, and
// applies the Holm correction per family (one family per measure) to block 1
// (confirmatory) over ALL planned tests, regardless of how many campaigns
// measured them. Planned but missing tests enter the correction with p = 1,
// so leaving tests out cannot make the correction milder. Block 2
// (replication) is compared descriptively with block 1.
//
// The hypotheses H1 to H11 are assessed with the rules fixed in plan.json
// (assessment.js). H8 needs the single runs of the campaigns, H4 and H11 the
// scaling series and the saturation test from series.js (--series).
//
// Usage: node tools/orchestrate/evaluate.js <campaign-directory>... [--series <series-directory>] [--include-aborted]
// Output: results/<timestamp>_evaluation/evaluation.json and evaluation.md

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchCampaigns, correctFamilies, replicationSummary, redisShares, assessHypotheses, sensitivityFamilies, temporalDiagnosisFamilies, blockComparison, processContinuity, DIAGNOSIS, MIN_PAIRS, TEMPORAL_MIN_ADJACENT, TEMPORAL_HALF_BOUNDARY, TEMPORAL_MIN_PER_HALF } from './assessment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'results');

const args = process.argv.slice(2);
const includeAborted = args.includes('--include-aborted');
const seriesIndex = args.indexOf('--series');
const seriesDir = seriesIndex === -1 ? null : args[seriesIndex + 1];
const dirs = args.filter((a, i) => !a.startsWith('--') && (seriesIndex === -1 || i !== seriesIndex + 1));
if (dirs.length === 0 || (seriesIndex !== -1 && !seriesDir)) {
  console.error('Aufruf: node tools/orchestrate/evaluate.js <kampagnen-verzeichnis>... [--series <series-verzeichnis>] [--include-aborted]');
  process.exit(1);
}

const plan = JSON.parse(readFileSync(path.join(__dirname, 'plan.json'), 'utf-8'));
const notes = [];

// Load campaigns
const campaigns = [];
for (const dir of dirs) {
  const file = path.join(path.resolve(dir), 'aggregate.json');
  if (!existsSync(file)) {
    notes.push(`${dir}: keine aggregate.json — übersprungen`);
    continue;
  }
  const agg = JSON.parse(readFileSync(file, 'utf-8'));
  if (agg.phase !== 'main') {
    notes.push(`${agg.campaign_dir}: Phase "${agg.phase}" — nicht Teil der konfirmatorischen Auswertung`);
    continue;
  }
  if (agg.aborted && !includeAborted) {
    notes.push(`${agg.campaign_dir}: abgebrochen (${agg.abort_reason}) — übersprungen (--include-aborted zum Einbeziehen)`);
    continue;
  }
  campaigns.push({ ...agg, dir: path.resolve(dir) });
}

// Assign measured comparisons to the planned ones, separately per block
// (1 = confirmatory, 2 = replication, DECISIONS.md 5.9).
const match = matchCampaigns(plan, campaigns);
const { found } = match;
notes.push(...match.notes);
if (match.duplicates.length) {
  console.error('Mehrfach gemessene Vergleiche — eindeutig festlegen, welche Kampagne zählt:');
  for (const d of match.duplicates) console.error(`  ${d}`);
  process.exit(1);
}

// Holm correction per family over all planned tests of block 1, and the
// descriptive replication by block 2 (assessment.js).
const families = correctFamilies(plan, found);
const replication = replicationSummary(plan, found);
// Sensitivity analysis of the paired test for both blocks, computed the same way
// (DECISIONS.md 5.8, fixed on 2026-11-08 before block 2 was evaluated).
const sensitivity = [plan.confirmatoryBlock, plan.replicationBlock]
  .map((block) => ({ block, families: sensitivityFamilies(plan, found, block) }));

// Share of Redis in the CPU time per single run for H8. Valid, measured runs of
// block 1 at the stress level, across all campaigns of a cell.
const h8Runs = [];
for (const agg of campaigns.filter((c) => (c.block ?? 1) === plan.confirmatoryBlock)) {
  const runsDir = path.join(agg.dir, 'runs');
  if (!existsSync(runsDir)) continue;
  for (const f of readdirSync(runsDir).filter((x) => x.endsWith('.json') && !x.startsWith('.'))) {
    const r = JSON.parse(readFileSync(path.join(runsDir, f), 'utf-8'));
    if (r.run?.scenario !== 'stress' || r.run.warmup || !r.run.valid) continue;
    h8Runs.push({ cell: r.run.cell, cpu_seconds_redis: r.measures?.cpu_seconds_redis, cpu_seconds_total: r.measures?.cpu_seconds_total });
  }
}
const redis = redisShares(h8Runs);

// Scaling series and saturation test for H4 and H11.
let series = null;
if (seriesDir) {
  const file = path.join(path.resolve(seriesDir), 'series.json');
  if (existsSync(file)) series = JSON.parse(readFileSync(file, 'utf-8'));
  else notes.push(`${seriesDir}: keine series.json, H4 und H11 bleiben unentschieden`);
} else {
  notes.push('ohne --series, H4 und H11 bleiben unentschieden');
}
const assessment = assessHypotheses({ plan, families, found, redis, series });

// Temporal diagnosis, descriptive only (DECISIONS.md 5.8, fixed on 2026-11-09
// before block 2 was opened). It adds fields and changes no result above.
const processEntries = [];
for (const agg of campaigns) {
  const runsDir = path.join(agg.dir, 'runs');
  if (!existsSync(runsDir)) continue;
  const byCell = new Map();
  for (const f of readdirSync(runsDir).filter((x) => x.endsWith('.json') && !x.startsWith('.'))) {
    const r = JSON.parse(readFileSync(path.join(runsDir, f), 'utf-8'));
    if (!byCell.has(r.run?.cell)) byCell.set(r.run?.cell, new Map());
    const services = byCell.get(r.run?.cell);
    for (const c of r.containers ?? []) {
      if (!services.has(c.service)) services.set(c.service, new Set());
      services.get(c.service).add(c.started_at);
    }
  }
  for (const [cell, services] of byCell) {
    processEntries.push({
      block: agg.block ?? 1,
      campaign: agg.campaign_dir,
      started_at: agg.started_at,
      cell,
      services: Object.fromEntries([...services].map(([s, starts]) => [s, [...starts]])),
    });
  }
}
const temporal = {
  note: 'Beschreibend. Keine Bestätigung von Testentscheidungen, kein Test auf Unabhängigkeit. Die Grenze 2/√n ist eine Heuristik.',
  parameters: {
    limit: '2 / sqrt(n) mit der tatsächlichen Zahl gültiger Paare',
    min_pairs: MIN_PAIRS,
    min_adjacent_pairs: TEMPORAL_MIN_ADJACENT,
    first_half_up_to_run: TEMPORAL_HALF_BOUNDARY,
    min_observations_per_half: TEMPORAL_MIN_PER_HALF,
  },
  blocks: [plan.confirmatoryBlock, plan.replicationBlock].map((block) => ({ block, families: temporalDiagnosisFamilies(plan, found, block) })),
  block_comparison: blockComparison(plan, found),
  process_continuity: processContinuity(processEntries),
};

// Descriptive overview per cell and load level. A cell that appears in two
// campaigns is listed twice (separately per campaign), because the values
// come from different measurement periods.
const descriptives = [];
for (const agg of campaigns) {
  for (const [scenarioName, scenario] of Object.entries(agg.scenarios)) {
    for (const [configName, c] of Object.entries(scenario.configs)) {
      descriptives.push({ campaign: agg.campaign_dir, scenario: scenarioName, config: configName, cell: c.cell, runs_valid: c.runs_valid, runs_measured: c.runs_measured, describe: c.describe });
    }
  }
}

const generatedAt = new Date();
const outDir = path.join(RESULTS_DIR, `${generatedAt.toISOString().replace(/[:.]/g, '-')}_evaluation`);
mkdirSync(outDir, { recursive: true });
const evaluation = {
  schema: 'eda-thesis/evaluation/2',
  generated_at: generatedAt.toISOString(),
  plan,
  campaigns: campaigns.map((c) => ({ dir: c.campaign_dir, name: c.name, block: c.block ?? 1, aborted: c.aborted, git: c.context?.git, sut_host: c.context?.sut_host?.model ?? null })),
  notes,
  families,
  replication,
  sensitivity,
  temporal_dependence: temporal,
  hypotheses: plan.hypotheses,
  assessment,
  redis_share_stress: redis,
  series: seriesDir ? path.basename(path.resolve(seriesDir)) : null,
  descriptives,
};
writeFileSync(path.join(outDir, 'evaluation.json'), JSON.stringify(evaluation, null, 2));

// Markdown tables for the written thesis. Numbers with decimal point,
// because the thesis is written in English.
const fmt = (v, digits = 3) => (v == null || Number.isNaN(v) ? '–' : Number(v).toFixed(digits));
const fmtP = (v) => (v == null ? '–' : v < 0.001 ? '< 0.001' : fmt(v));
const lines = [
  '# Gesamtauswertung',
  '',
  `Erzeugt: ${generatedAt.toISOString()} · Signifikanzniveau α = ${fmt(plan.alpha, 2)} · Holm-Korrektur je Familie über alle geplanten Tests · konfirmatorisch: Block ${plan.confirmatoryBlock}`,
  '',
  'Vorzeichen: Differenz = A − B. Negative Werte bedeuten, dass A kleiner (bei Latenz, CPU und Speicher: besser) ist.',
  '',
];
// Unit of the median difference per measure, memory in MiB instead of bytes.
const unitOf = (measure) => (measure.includes('bytes') ? { label: 'MiB', scale: 1 / 2 ** 20, digits: 1 }
  : measure.includes('seconds') ? { label: 's', scale: 1, digits: 3 } : { label: 'ms', scale: 1, digits: 3 });
for (const family of families) {
  const u = unitOf(family.measure);
  const fu = (v) => (v == null ? '–' : fmt(v * u.scale, u.digits));
  lines.push(`## ${family.measure} (${family.role}, Block ${family.block}, m = ${family.m})`, '', family.description, '');
  lines.push(`| Nr. | A vs. B | Laststufe | Paare | Median-Diff in ${u.label} [95-%-KI] | Cliff's δ | r (rangbiserial) | p | p (Holm) | signifikant | Status |`);
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const t of family.tests) {
    const r = t.result;
    lines.push(`| ${t.comparison_id} | ${t.a} vs. ${t.b} | ${t.scenario} | ${r?.n_pairs ?? '–'} | `
      + `${r ? `${fu(r.median_diff)} [${fu(r.median_diff_ci95[0])}, ${fu(r.median_diff_ci95[1])}]` : '–'} | `
      + `${r ? `${fmt(r.cliffs_delta)} (${r.cliffs_magnitude})` : '–'} | ${r ? fmt(r.rank_biserial) : '–'} | `
      + `${r ? fmtP(t.pValue) : '–'} | ${fmtP(t.pHolm)} | ${t.significant ? 'ja' : 'nein'} | ${t.status} |`);
  }
  lines.push('');
}

lines.push(`## Replikation (Block ${plan.replicationBlock} gegen Block ${plan.confirmatoryBlock})`, '');
lines.push(`Beschreibender Abgleich ohne eigene Signifikanzaussage. ${plan.decisionRules?.replication ?? ''}`, '');
lines.push('Eine Median-Differenz von genau 0 gilt als eigene Richtung. Die letzten beiden Spalten sind nur beschreibend und ändern die Regel nicht (DECISIONS.md 5.8).', '');
lines.push('| Messgröße | verglichen | repliziert | gleiche Richtung | KI überlappen | gleiche Effektklasse | KI Block 1 enthält 0 | Block 2 allein signifikant, gleiche Richtung (ohne Holm) |');
lines.push('|---|---|---|---|---|---|---|---|');
for (const r of replication) {
  lines.push(`| ${r.measure} | ${r.compared} | ${r.replicated} | ${r.same_direction} | ${r.ci_overlap} | ${r.same_magnitude} | ${r.ci_block1_contains_zero} | ${r.block2_significant_same_direction} |`);
}
lines.push('');
// One row per test, only once block 2 has been measured.
const yesNo = (v) => (v ? 'ja' : 'nein');
for (const r of replication.filter((x) => x.compared > 0)) {
  lines.push(`### Replikation je Test, ${r.measure}`, '');
  lines.push('| Nr. | Laststufe | repliziert | gleiche Richtung | KI überlappen | gleiche Effektklasse | KI Block 1 enthält 0 | Block 2 allein signifikant, gleiche Richtung |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const row of r.rows) {
    if (row.status !== 'verglichen') {
      lines.push(`| ${row.comparison_id} | ${row.scenario} | ${row.status} | – | – | – | – | – |`);
      continue;
    }
    lines.push(`| ${row.comparison_id} | ${row.scenario} | ${yesNo(row.replicated)} | ${yesNo(row.same_direction)} | ${yesNo(row.ci_overlap)} | ${yesNo(row.same_magnitude)} | ${yesNo(row.ci_block1_contains_zero)} | ${yesNo(row.block2_significant_same_direction)} |`);
  }
  lines.push('');
}

// Sensitivity analysis, only for blocks with measured tests.
const signLabel = (r) => `+${r.sign_test.positive}/−${r.sign_test.negative}${r.sign_test.zeros ? `/0:${r.sign_test.zeros}` : ''}`;
const fmtS = (v) => (v == null ? '–' : fmt(v, 2));
lines.push('## Sensitivitätsanalyse (Symmetrie, Hodges-Lehmann, Vorzeichentest)', '');
lines.push('Der Wilcoxon-Vorzeichen-Rang-Test bleibt der vorab festgelegte Test und entscheidet über alle Ergebnisse. Er setzt annähernd symmetrische Paardifferenzen voraus. Nur dann ist ein signifikantes Ergebnis eine Aussage über den Median der Differenzen, sonst über den Hodges-Lehmann-Pseudomedian (Median aller Walsh-Mittel). '
  + 'Diese Analyse ist beschreibend (DECISIONS.md 5.8). Sie zeigt je Test die Schiefe der Differenzen (Bowley aus Quartilen mit linearer Interpolation, Momenten-Schiefe aus Populationsmomenten), den Hodges-Lehmann-Schätzer über alle Differenzen und den exakten zweiseitigen Vorzeichentest, der keine Symmetrie braucht und den Median direkt prüft. '
  + 'Differenzen von genau 0 entfallen in beiden Tests. Beide Tests sind je Familie über dieselben 39 Tests nach Holm korrigiert. Für den Wiederholungsblock ist die Wilcoxon-Spalte nur beschreibend und ändert die Replikationsregel nicht.', '');
for (const { block, families: fams } of sensitivity) {
  if (!fams.some((f) => f.measured > 0)) continue;
  lines.push(`### Block ${block}, Übersicht`, '');
  lines.push('| Messgröße | Tests | beide signifikant | nur Wilcoxon | nur Vorzeichentest | keiner | Bowley-Schiefe < 0,1 / < 0,3 / < 0,5 / ab 0,5 | Momenten-Schiefe < 0,5 / < 1 / < 2 / ab 2 | Abstand Median zu Hodges-Lehmann in IQR < 0,05 / < 0,1 / < 0,25 / ab 0,25 | stark schief (Bowley ab 0,5), davon alle Differenzen gleich gerichtet |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const f of fams) {
    const s = f.summary;
    lines.push(`| ${f.measure} | ${f.measured} | ${s.both_significant} | ${s.only_wilcoxon} | ${s.only_sign_test} | ${s.neither} | ${s.bowley_bands.join(' / ')}${s.bowley_undefined ? ` (ohne IQR ${s.bowley_undefined})` : ''} | ${s.moment_bands.join(' / ')} | ${s.distance_bands.join(' / ')} | ${s.strongly_skewed}, ${s.strongly_skewed_all_same_sign} |`);
  }
  lines.push('');
  const rows = fams.flatMap((f) => f.rows.filter((r) => r.sign_test).map((r) => ({ ...r, measure: f.measure })));
  const differing = rows.filter((r) => r.wilcoxon_significant !== r.sign_significant);
  const opposite = rows.filter((r) => (r.direction.median && r.direction.hodges_lehmann && r.direction.median !== r.direction.hodges_lehmann)
    || (r.direction.wilcoxon && r.direction.sign_test && r.direction.wilcoxon !== r.direction.sign_test));
  lines.push(`Unterschiedliche Testentscheide: ${differing.length}. Gegensätzliche Richtungen (Median gegen Hodges-Lehmann oder Wilcoxon gegen Vorzeichentest): ${opposite.length}. Signifikante Tests, deren Median gegen die Richtung des Wilcoxon-Tests zeigt: ${fams.reduce((x, f) => x + f.summary.significant_median_against_wilcoxon, 0)}.`, '');
  for (const f of fams.filter((x) => x.measured > 0)) {
    const u = unitOf(f.measure);
    const fu = (v) => (v == null ? '–' : fmt(v * u.scale, u.digits));
    lines.push(`### Block ${block}, je Test, ${f.measure}`, '');
    lines.push(`| Nr. | Laststufe | Median-Diff (${u.label}) | Hodges-Lehmann (${u.label}) | Bowley | Momente | Vorzeichen +/− | Vorzeichentest p (Holm) | Vorzeichentest signifikant | Wilcoxon p (Holm) | Wilcoxon signifikant | Cliff's δ |`);
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of f.rows) {
      if (!r.sign_test) {
        lines.push(`| ${r.comparison_id} | ${r.scenario} | ${r.status} | – | – | – | – | – | – | – | – | – |`);
        continue;
      }
      const flag = r.wilcoxon_significant !== r.sign_significant ? ' **(abweichend)**' : '';
      lines.push(`| ${r.comparison_id} | ${r.scenario} | ${fu(r.median_diff)} | ${fu(r.hodges_lehmann)} | ${fmtS(r.skew_bowley)} | ${fmtS(r.skew_moment)} | ${signLabel(r)} | ${fmtP(r.sign_p_holm)} | ${yesNo(r.sign_significant)}${flag} | ${fmtP(r.wilcoxon_p_holm)} | ${yesNo(r.wilcoxon_significant)} | ${fmtS(r.cliffs_delta)} |`);
    }
    lines.push('');
  }
}

lines.push('## Zeitliche Diagnose der Paardifferenzen (beschreibend, kein Signifikanznachweis)', '');
lines.push('Die Diagnose beschreibt den zeitlichen Verlauf der gepaarten Differenzen innerhalb einer Kampagne (DECISIONS.md 5.8). Sie ist kein Test auf Unabhängigkeit und bestätigt keine Testentscheidung. Die Wilcoxon-Tests mit Holm-Korrektur bleiben unverändert die vorab festgelegte Entscheidungsregel, bei serieller Abhängigkeit liefern ihre p-Werte aber keine gesichert kalibrierte Inferenz. '
  + 'Die Grenze 2/√n mit der tatsächlichen Zahl gültiger Paare ist eine Heuristik. „Reststruktur“ heißt, die Autokorrelation erster Ordnung liegt auch nach Entfernen eines linearen Trends über der Grenze, was auch ein nichtlinearer Verlauf auslösen kann. „Nur linearer Trend“ heißt, sie liegt nur vor der Trendbereinigung darüber. „Ohne Befund“ ist kein Nachweis von Unabhängigkeit. '
  + 'Fehlende Paare bleiben Lücken in den echten Laufnummern. In die Autokorrelation gehen nur Paare mit aufeinanderfolgender Laufnummer ein. Die Hälften trennt die feste Laufnummer ' + TEMPORAL_HALF_BOUNDARY + '. „Nicht bestimmbar“ steht bei konstanten Reihen, unter ' + MIN_PAIRS + ' gültigen Paaren und unter ' + TEMPORAL_MIN_ADJACENT + ' Nachbarpaaren.', '');
const classColumns = Object.values(DIAGNOSIS);
for (const { block, families: fams } of temporal.blocks) {
  if (!fams.some((f) => f.diagnoses > 0)) continue;
  lines.push(`### Block ${block}, Übersicht`, '');
  lines.push(`| Messgröße | Diagnosen | ${classColumns.join(' | ')} | mit Lücken |`);
  lines.push(`|---|---|${classColumns.map(() => '---').join('|')}|---|`);
  for (const f of fams) lines.push(`| ${f.measure} | ${f.diagnoses} | ${classColumns.map((k) => f.by_class[k]).join(' | ')} | ${f.with_gaps} |`);
  lines.push('');
  if (fams[0].by_class_among_holm_decisions) {
    lines.push('Überschneidung mit den nach Holm signifikanten Tests der Hauptauswertung. Das ist nur eine Zählung und bestätigt keine Entscheidung.', '');
    lines.push(`| Messgröße | ${classColumns.join(' | ')} |`);
    lines.push(`|---|${classColumns.map(() => '---').join('|')}|`);
    for (const f of fams) lines.push(`| ${f.measure} | ${classColumns.map((k) => f.by_class_among_holm_decisions[k]).join(' | ')} |`);
    lines.push('');
  }
  for (const f of fams.filter((x) => x.diagnoses > 0)) {
    const u = unitOf(f.measure);
    const fu = (v) => (v == null ? '–' : fmt(v * u.scale, u.digits));
    const f2 = (v) => (v == null ? '–' : fmt(v, 2));
    lines.push(`### Block ${block}, je Test, ${f.measure}`, '');
    lines.push(`| Nr. | Laststufe | gültige Paare | Nachbarpaare | fehlende Läufe | Grenze | Autokorrelation roh | trendbereinigt | Trendanteil | Beobachtungen 1. Hälfte | Beobachtungen 2. Hälfte | Änderung des Medians (${u.label}) | Einordnung |`);
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of f.rows) {
      if (!r.diagnosis) {
        lines.push(`| ${r.comparison_id} | ${r.scenario} | ${r.status} | – | – | – | – | – | – | – | – | – | – |`);
        continue;
      }
      lines.push(`| ${r.comparison_id} | ${r.scenario} | ${r.n_pairs} | ${r.n_adjacent_pairs} | ${r.missing_runs_inside} | ${f2(r.limit)} | ${f2(r.r1)} | ${f2(r.r1_detrended)} | ${f2(r.trend_share)} | ${r.n_first_half} | ${r.n_second_half} | ${fu(r.median_change_between_halves)} | ${r.diagnosis}${r.reason ? ` (${r.reason})` : ''} |`);
    }
    lines.push('');
  }
}
for (const pc of temporal.process_continuity) {
  lines.push(`### Block ${pc.block}, Prozesslaufzeiten`, '');
  lines.push(`Von ${pc.campaigns} Kampagnen liefen ${pc.campaigns_with_continued_process} mit mindestens einem Prozess weiter, der schon in einer früheren Kampagne dieses Blocks lief. Dienste mit mehr als einem Start innerhalb einer Kampagne: ${pc.services_restarted_inside_a_campaign}.`, '');
}
if (temporal.block_comparison.some((f) => f.compared > 0)) {
  lines.push('### Vergleich der Blöcke (beschreibend)', '');
  lines.push('Differenz der Median-Differenzen von Block 2 und Block 1. Der Bezug ist die Summe der Spannweiten beider Zellen über die Kampagnen von Block 1. Daraus folgt keine Entscheidung, die Replikationsregel bleibt unverändert.', '');
  for (const f of temporal.block_comparison.filter((x) => x.compared > 0)) {
    const u = unitOf(f.measure);
    const fu = (v) => (v == null ? '–' : fmt(v * u.scale, u.digits));
    lines.push(`#### ${f.measure}`, '');
    lines.push(`| Nr. | Laststufe | Block 1 (${u.label}) | Block 2 (${u.label}) | Differenz (${u.label}) | Differenz in % von Block 1 | Spannweite A (${u.label}) | Spannweite B (${u.label}) | Betrag der Differenz zur Summe der Spannweiten |`);
    lines.push('|---|---|---|---|---|---|---|---|---|');
    for (const r of f.rows) {
      if (r.status !== 'verglichen') {
        lines.push(`| ${r.comparison_id} | ${r.scenario} | ${r.status} | – | – | – | – | – | – |`);
        continue;
      }
      lines.push(`| ${r.comparison_id} | ${r.scenario} | ${fu(r.median_block1)} | ${fu(r.median_block2)} | ${fu(r.difference)} | ${r.difference_percent_of_block1 == null ? '–' : fmt(r.difference_percent_of_block1, 1)} | ${fu(r.range_between_campaigns_a)} | ${fu(r.range_between_campaigns_b)} | ${r.difference_to_range_sum == null ? '–' : fmt(r.difference_to_range_sum, 2)} |`);
    }
    lines.push('');
  }
}

lines.push('## Hypothesen (vorab festgelegt, DECISIONS.md 5.18)', '');
lines.push('| Nr. | Hypothese | Vergleiche | Messgröße | Laststufe | Bestätigt, wenn … |');
lines.push('|---|---|---|---|---|---|');
for (const h of plan.hypotheses) {
  lines.push(`| ${h.id} | ${h.text} | ${h.comparisons.length ? h.comparisons.join(', ') : '–'} | ${h.measure} | ${h.scenario} | ${h.rule ?? '–'} |`);
}
lines.push('', 'Allgemeine Entscheidungsregeln:', '', ...(plan.decisionRules?.general ?? []).map((g) => `- ${g}`), '');
lines.push('## Bewertung der Hypothesen (G1 bis G4)', '');
lines.push('Jede Hypothese ist in Fälle zerlegt. Ein Fall ist erfüllt, zeigt das Gegenteil oder ist unklar (fehlt, weniger als 20 verwertbare Paare, nicht signifikant oder Gleichstand). Nach G4 ist eine Hypothese bestätigt, wenn alle Fälle erfüllt sind, nicht bestätigt, wenn mindestens ein Fall das Gegenteil zeigt, und sonst unentschieden. Was je Art von Fall als Gegenteil gilt, legt DECISIONS.md 5.18 fest.', '');
lines.push('| Nr. | Ergebnis | erfüllt | Gegenteil | unklar |');
lines.push('|---|---|---|---|---|');
for (const a of assessment) {
  lines.push(`| ${a.id} | ${a.verdict} | ${a.counts.erfüllt} | ${a.counts.gegenteil} | ${a.counts.unklar} |`);
}
lines.push('');
for (const a of assessment) {
  lines.push(`### ${a.id}: ${a.verdict}`, '', a.text, '', '| Fall | Ergebnis | Werte |', '|---|---|---|');
  for (const c of a.cases) lines.push(`| ${c.label} | ${c.outcome} | ${c.detail} |`);
  lines.push('');
}
lines.push('### Wortlaut für die Arbeit (englisch)', '');
lines.push('General decision rules:', '', ...(plan.decisionRules?.general_en ?? []).map((g) => `- ${g}`), '');
if (plan.decisionRules?.replication_en) lines.push(`Replication: ${plan.decisionRules.replication_en}`, '');
for (const h of plan.hypotheses) {
  lines.push(`- **${h.id}:** ${h.text_en ?? '–'}`);
  if (h.rule_en) lines.push(`  *Supported if:* ${h.rule_en}`);
}
lines.push('');

if (notes.length) {
  lines.push('## Hinweise', '', ...notes.map((n) => `- ${n}`), '');
}
writeFileSync(path.join(outDir, 'evaluation.md'), lines.join('\n'));

console.log(`Gesamtauswertung: ${path.relative(REPO_ROOT, outDir)}`);
for (const family of families) {
  const measured = family.tests.filter((t) => t.status !== 'fehlt').length;
  const significant = family.tests.filter((t) => t.significant).length;
  console.log(`  ${family.measure}: ${measured}/${family.m} Tests gemessen (Block ${family.block}), ${significant} signifikant nach Holm`);
}
for (const r of replication) {
  console.log(`  Replikation ${r.measure}: ${r.compared} verglichen, ${r.replicated} repliziert (${r.same_direction} gleiche Richtung, ${r.ci_overlap} KI überlappen, ${r.same_magnitude} gleiche Effektklasse)`);
}
for (const a of assessment) {
  console.log(`  ${a.id}: ${a.verdict} (${a.counts.erfüllt} erfüllt, ${a.counts.gegenteil} Gegenteil, ${a.counts.unklar} unklar)`);
}
for (const n of notes) console.log(`  Hinweis: ${n}`);
