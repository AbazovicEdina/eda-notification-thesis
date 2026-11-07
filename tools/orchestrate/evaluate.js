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
import { matchCampaigns, correctFamilies, replicationSummary, redisShares, assessHypotheses } from './assessment.js';

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
