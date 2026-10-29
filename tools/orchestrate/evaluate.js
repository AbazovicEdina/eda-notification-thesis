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
// Usage: node tools/orchestrate/evaluate.js <campaign-directory>... [--include-aborted]
// Output: results/<timestamp>_evaluation/evaluation.json and evaluation.md

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { holmCorrection } from './stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'results');

const args = process.argv.slice(2);
const includeAborted = args.includes('--include-aborted');
const dirs = args.filter((a) => !a.startsWith('--'));
if (dirs.length === 0) {
  console.error('Aufruf: node tools/orchestrate/evaluate.js <kampagnen-verzeichnis>... [--include-aborted]');
  process.exit(1);
}

const plan = JSON.parse(readFileSync(path.join(__dirname, 'plan.json'), 'utf-8'));
const notes = [];

// Bring the result of a campaign comparison into the planned direction (a = plan.a).
function oriented(result, flipped) {
  if (!flipped || !result.wilcoxon) return result;
  const [lo, hi] = result.median_diff_ci95;
  return {
    ...result,
    wilcoxon: { ...result.wilcoxon, w_plus: result.wilcoxon.w_minus, w_minus: result.wilcoxon.w_plus },
    cliffs_delta: -result.cliffs_delta,
    rank_biserial: -result.rank_biserial,
    median_diff: result.median_diff == null ? null : -result.median_diff,
    median_diff_ci95: [hi == null ? null : -hi, lo == null ? null : -lo],
    pairs: { ...result.pairs, a: result.pairs.b, b: result.pairs.a },
  };
}

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
  campaigns.push(agg);
}

// Assign measured comparisons to the planned ones, separately per block
// (1 = confirmatory, 2 = replication, DECISIONS.md 5.9).
const found = new Map(); // key: `${planId}|${scenario}|${block}` -> { campaign, entry, flipped }
const duplicates = [];
for (const agg of campaigns) {
  const block = agg.block ?? 1;
  for (const [scenarioName, scenario] of Object.entries(agg.scenarios)) {
    if (scenario.incomplete) continue;
    for (const entry of scenario.comparisons) {
      const p = plan.comparisons.find((c) =>
        (c.a === entry.cell_a && c.b === entry.cell_b) || (c.a === entry.cell_b && c.b === entry.cell_a));
      if (!p) {
        notes.push(`${agg.campaign_dir}: Vergleich ${entry.cell_a} vs. ${entry.cell_b} ist nicht geplant — nicht in der Holm-Familie`);
        continue;
      }
      const key = `${p.id}|${scenarioName}|${block}`;
      if (found.has(key)) duplicates.push(`Vergleich ${p.id}, ${scenarioName}, Block ${block}: ${found.get(key).campaign.campaign_dir} und ${agg.campaign_dir}`);
      found.set(key, { campaign: agg, entry, flipped: p.a !== entry.cell_a });
    }
  }
}
if (duplicates.length) {
  console.error('Mehrfach gemessene Vergleiche — eindeutig festlegen, welche Kampagne zählt:');
  for (const d of duplicates) console.error(`  ${d}`);
  process.exit(1);
}

function testsFor(measure, block) {
  const tests = [];
  for (const cmp of plan.comparisons) {
    for (const scenarioName of plan.scenarios) {
      const hit = found.get(`${cmp.id}|${scenarioName}|${block}`);
      const raw = hit?.entry.measures?.[measure];
      const result = raw?.wilcoxon ? oriented(raw, hit.flipped) : null;
      tests.push({
        comparison_id: cmp.id,
        question: cmp.question,
        a: cmp.a,
        b: cmp.b,
        scenario: scenarioName,
        campaign: hit?.campaign.campaign_dir ?? null,
        status: result ? (result.conclusive ? 'gemessen' : 'nicht aussagekräftig') : 'fehlt',
        pValue: result ? result.wilcoxon.p : 1,
        result,
      });
    }
  }
  return tests;
}

// Build and correct the families (confirmatory block)
const families = plan.families.map((family) => {
  const corrected = holmCorrection(testsFor(family.measure, plan.confirmatoryBlock), plan.alpha);
  return { ...family, block: plan.confirmatoryBlock, alpha: plan.alpha, m: corrected.length, tests: corrected };
});

// Replication (block 2). Do direction and effect class agree with block 1,
// and do the confidence intervals overlap? Descriptive, without a
// significance statement of its own. A result counts as replicated if the
// direction is the same and the intervals overlap (plan.json, decisionRules).
// The effect class is reported but is not a condition.
const sign = (v) => (v == null || v === 0 ? 0 : Math.sign(v));
const replication = plan.families.map((family) => {
  const b1 = testsFor(family.measure, plan.confirmatoryBlock);
  const b2 = testsFor(family.measure, plan.replicationBlock);
  const rows = b1.map((t1, i) => {
    const r1 = t1.result;
    const r2 = b2[i].result;
    if (!r1 || !r2) return { comparison_id: t1.comparison_id, scenario: t1.scenario, status: !r1 ? 'Block 1 fehlt' : 'Block 2 fehlt' };
    const [lo1, hi1] = r1.median_diff_ci95;
    const [lo2, hi2] = r2.median_diff_ci95;
    return {
      comparison_id: t1.comparison_id,
      scenario: t1.scenario,
      status: 'verglichen',
      delta_block1: r1.cliffs_delta,
      delta_block2: r2.cliffs_delta,
      same_direction: sign(r1.median_diff) === sign(r2.median_diff),
      same_magnitude: r1.cliffs_magnitude === r2.cliffs_magnitude,
      ci_overlap: lo1 != null && lo2 != null && lo1 <= hi2 && lo2 <= hi1,
    };
  }).map((r) => (r.status === 'verglichen' ? { ...r, replicated: r.same_direction && r.ci_overlap } : r));
  const compared = rows.filter((r) => r.status === 'verglichen');
  return {
    measure: family.measure,
    compared: compared.length,
    same_direction: compared.filter((r) => r.same_direction).length,
    same_magnitude: compared.filter((r) => r.same_magnitude).length,
    ci_overlap: compared.filter((r) => r.ci_overlap).length,
    replicated: compared.filter((r) => r.replicated).length,
    rows,
  };
});

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
lines.push('| Messgröße | verglichen | repliziert | gleiche Richtung | KI überlappen | gleiche Effektklasse |');
lines.push('|---|---|---|---|---|---|');
for (const r of replication) {
  lines.push(`| ${r.measure} | ${r.compared} | ${r.replicated} | ${r.same_direction} | ${r.ci_overlap} | ${r.same_magnitude} |`);
}
lines.push('');

lines.push('## Hypothesen (vorab festgelegt, DECISIONS.md 5.18)', '');
lines.push('| Nr. | Hypothese | Vergleiche | Messgröße | Laststufe | Bestätigt, wenn … |');
lines.push('|---|---|---|---|---|---|');
for (const h of plan.hypotheses) {
  lines.push(`| ${h.id} | ${h.text} | ${h.comparisons.length ? h.comparisons.join(', ') : '–'} | ${h.measure} | ${h.scenario} | ${h.rule ?? '–'} |`);
}
lines.push('', 'Allgemeine Entscheidungsregeln:', '', ...(plan.decisionRules?.general ?? []).map((g) => `- ${g}`), '');
lines.push('Die Bewertung jeder Hypothese (bestätigt, nicht bestätigt, unentschieden) erfolgt in der Arbeit nach diesen Regeln anhand der Tabellen oben, der Skalierungs- und der Sättigungsreihe (series.md).', '');
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
for (const n of notes) console.log(`  Hinweis: ${n}`);
