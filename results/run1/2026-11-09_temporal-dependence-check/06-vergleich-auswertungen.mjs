// Compares a new evaluation of block 1 with the previous one. Apart from the
// generation time and the added temporal diagnosis nothing may differ.
// Usage: node 06-vergleich-auswertungen.mjs <old-evaluation-dir> <new-evaluation-dir>
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';

const [oldDir, newDir] = process.argv.slice(2);
const read = (d, f) => readFileSync(path.join(d, f), 'utf-8');
const oldJson = JSON.parse(read(oldDir, 'evaluation.json'));
const newJson = JSON.parse(read(newDir, 'evaluation.json'));

const IGNORED = new Set(['generated_at', 'temporal_dependence']);
const keys = (o) => Object.keys(o).filter((k) => !IGNORED.has(k)).sort();
console.log('Felder gleich:', isDeepStrictEqual(keys(oldJson), keys(newJson)));
console.log('Nur in der neuen Auswertung:', Object.keys(newJson).filter((k) => !(k in oldJson)).join(', '));
let different = 0;
for (const k of keys(oldJson)) {
  const same = isDeepStrictEqual(oldJson[k], newJson[k]);
  if (!same) different++;
  console.log(`  ${k}: ${same ? 'identisch' : 'ABWEICHEND'}`);
}

const decisions = (j) => j.families.flatMap((f) => f.tests.map((t) => `${f.measure}|${t.comparison_id}|${t.scenario}|${t.significant}|${t.pValue}|${t.pHolm}`));
const a = decisions(oldJson);
const b = decisions(newJson);
console.log('Holm-Entscheidungen gesamt:', a.length, '| signifikant alt:', oldJson.families.reduce((s, f) => s + f.tests.filter((t) => t.significant).length, 0), '| signifikant neu:', newJson.families.reduce((s, f) => s + f.tests.filter((t) => t.significant).length, 0), '| alle Einträge gleich:', isDeepStrictEqual(a, b));

const strip = (text) => {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => !l.startsWith('Erzeugt: '));
  const start = lines.findIndex((l) => l.startsWith('## Zeitliche Diagnose'));
  const end = lines.findIndex((l) => l.startsWith('## Hypothesen (vorab'));
  return start === -1 ? lines : [...lines.slice(0, start), ...lines.slice(end)];
};
const mdOld = strip(read(oldDir, 'evaluation.md'));
const mdNew = strip(read(newDir, 'evaluation.md'));
const mdSame = isDeepStrictEqual(mdOld, mdNew);
console.log('evaluation.md ohne Zeitangabe und ohne den neuen Abschnitt gleich:', mdSame, `(${mdOld.length} und ${mdNew.length} Zeilen)`);
const added = read(newDir, 'evaluation.md').match(/\n## Zeitliche Diagnose[\s\S]*?\n## Hypothesen/)?.[0] ?? '';
console.log('Neuer Abschnitt enthält Bootstrap, Stern oder Bestätigung als Ergebnis:', /bootstrap|\*\*\*|robust/i.test(added));
console.log(different === 0 && mdSame && isDeepStrictEqual(a, b) ? 'ERGEBNIS: unverändert' : 'ERGEBNIS: ABWEICHUNG');
