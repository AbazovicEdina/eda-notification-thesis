// Read-only analysis of temporal dependence in Block 1. Reads the repository, writes only into the scratchpad.
// Usage: node 01-analyse-block1.mjs <repo> <out.json>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [ROOT, OUT] = process.argv.slice(2);
const S = await import(pathToFileURL(path.join(ROOT, 'tools/orchestrate/stats.js')).href);
const plan = JSON.parse(readFileSync(path.join(ROOT, 'tools/orchestrate/plan.json'), 'utf-8'));
const MEASURES = ['latency_mean_ms', 'cpu_seconds_total', 'working_set_peak_bytes_total', 'connect_mean_ms'];
const LEVELS = plan.scenarios;
const RES = path.join(ROOT, 'results');

// Only unprefixed Block 1 campaigns. Nothing of Block 2 is opened.
const dirs = readdirSync(RES).filter((d) => /^[0-9T:\-Z]+_b1-c\d\d-(baseline|medium|stress)$/.test(d));
console.log('Kampagnen', dirs.length);

const campaigns = {};
const lifetimes = {};
for (const d of dirs) {
  const m = d.match(/_b1-c(\d\d)-(\w+)$/);
  const id = Number(m[1]);
  const level = m[2];
  const p = plan.comparisons.find((c) => c.id === id);
  const runs = { [p.a]: {}, [p.b]: {} };
  const started = {};
  for (const f of readdirSync(path.join(RES, d, 'runs'))) {
    if (!f.endsWith('.json') || f.startsWith('.')) continue;
    const r = JSON.parse(readFileSync(path.join(RES, d, 'runs', f), 'utf-8'));
    const isMeasured = !r.run.warmup;
    for (const c of r.containers) {
      if (!started[c.service]) started[c.service] = new Set();
      started[c.service].add(c.started_at);
    }
    if (isMeasured) runs[r.run.config][r.run.run_index] = { m: r.measures, t: r.run.started_at };
  }
  campaigns[`${id}|${level}`] = { id, level, a: p.a, b: p.b, runs, dir: d, firstT: Object.values(runs[p.a]).map((x) => x.t).sort()[0] };
  lifetimes[`${id}|${level}`] = Object.fromEntries(Object.entries(started).map(([k, v]) => [k, [...v]]));
}

// ---- helpers
const mean = (x) => x.reduce((a, b) => a + b, 0) / x.length;
function acf(x, maxLag) {
  const m = mean(x);
  const g0 = x.reduce((s, v) => s + (v - m) ** 2, 0);
  const out = [1];
  for (let k = 1; k <= maxLag; k++) {
    let s = 0;
    for (let t = 0; t + k < x.length; t++) s += (x[t] - m) * (x[t + k] - m);
    out.push(g0 > 0 ? s / g0 : 0);
  }
  return { rho: out, g0: g0 / x.length };
}
function ols(x) {
  const n = x.length;
  const tb = (n - 1) / 2;
  const xb = mean(x);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (i - tb) ** 2;
    sxy += (i - tb) * (x[i] - xb);
  }
  const b = sxy / sxx;
  const res = x.map((v, i) => v - xb - b * (i - tb));
  const ssr = res.reduce((s, v) => s + v * v, 0);
  const sst = x.reduce((s, v) => s + (v - xb) ** 2, 0);
  const seB = Math.sqrt(ssr / (n - 2) / sxx);
  return { slope: b, res, r2: sst > 0 ? 1 - ssr / sst : 0, t: seB > 0 ? b / seB : 0 };
}
// Politis & White (2004) with the correction of Patton, Politis & White (2009), circular block bootstrap.
function pw(x) {
  const n = x.length;
  const maxLag = Math.min(n - 1, Math.floor(n / 2));
  const { rho, g0 } = acf(x, maxLag);
  if (g0 === 0) return { mhat: 0, M: 0, bCB: 1, tau: 1 };
  const Kn = Math.max(5, Math.ceil(Math.sqrt(Math.log10(n))));
  const crit = 2 * Math.sqrt(Math.log10(n) / n);
  let mhat = maxLag;
  for (let m = 0; m + Kn <= maxLag; m++) {
    let ok = true;
    for (let k = 1; k <= Kn; k++) if (Math.abs(rho[m + k]) >= crit) ok = false;
    if (ok) { mhat = m; break; }
  }
  const M = Math.min(2 * Math.max(mhat, 1), maxLag);
  const lam = (t) => (Math.abs(t) <= 0.5 ? 1 : Math.abs(t) <= 1 ? 2 * (1 - Math.abs(t)) : 0);
  let G = 0;
  let s2 = g0;
  for (let k = 1; k <= M; k++) {
    const R = rho[k] * g0;
    G += 2 * lam(k / M) * k * R;
    s2 += 2 * lam(k / M) * R;
  }
  s2 = Math.max(s2, 1e-300);
  const bMax = Math.ceil(Math.min(3 * Math.sqrt(n), n / 3));
  const b = ((2 * G * G) / ((4 / 3) * s2 * s2)) ** (1 / 3) * n ** (1 / 3);
  return { mhat, M, bCB: Math.max(1, Math.min(bMax, b)), tau: Math.max(1, s2 / g0) };
}
function medianFA(a) {
  a.sort();
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
const pct = (s, p) => s[Math.max(0, Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1))];
// Circular block bootstrap of the median, percentile interval by nearest rank as in stats.js.
function cbbCI(d, L, seed, R = 10000, alpha = 0.05) {
  const n = d.length;
  const rng = S.createRng(seed);
  const meds = new Float64Array(R);
  const buf = new Float64Array(n);
  for (let r = 0; r < R; r++) {
    let k = 0;
    while (k < n) {
      const st = Math.floor(rng() * n);
      for (let j = 0; j < L && k < n; j++) buf[k++] = d[(st + j) % n];
    }
    meds[r] = medianFA(buf);
  }
  meds.sort();
  return [pct(meds, (alpha / 2) * 100), pct(meds, (1 - alpha / 2) * 100)];
}

// ---- per test
const rows = [];
const LENGTHS = [1, 3, 5, 8, 10, 15, 20, 30];
for (const c of Object.values(campaigns)) {
  const idx = Object.keys(c.runs[c.a]).map(Number).sort((x, y) => x - y);
  for (const measure of MEASURES) {
    const A = idx.map((i) => c.runs[c.a][i].m[measure]);
    const B = idx.map((i) => c.runs[c.b][i].m[measure]);
    const d = A.map((v, i) => v - B[i]);
    const med = S.median(d);
    const tr = ols(d);
    const rawR = acf(d, 20).rho;
    const detR = acf(tr.res, 20).rho;
    const pwRaw = pw(d);
    const pwDet = pw(tr.res);
    const seed = 20261109 + c.id * 1000 + LEVELS.indexOf(c.level) * 10 + MEASURES.indexOf(measure);
    const ci = {};
    for (const L of LENGTHS) ci[L] = cbbCI(d, L, seed);
    const ciBonf = {};
    for (const L of [1, 5, 8, 10, 15, 20, 30]) ciBonf[L] = cbbCI(d, L, seed, 40000, 0.05 / 39);
    const iid = S.bootstrapMedianDiffCI(A, B, { resamples: 10000, seed });
    const w = S.wilcoxonSignedRank(A, B);
    rows.push({
      id: c.id, level: c.level, measure, n: d.length, median: med, iid: iid.ci,
      r1: rawR[1], r1Det: detR[1], r5: rawR[5], r10: rawR[10], r1A: acf(A, 1).rho[1], r1B: acf(B, 1).rho[1],
      slope: tr.slope, totalDrift: tr.slope * (d.length - 1), r2: tr.r2, tTrend: tr.t,
      mhatRaw: pwRaw.mhat, bRaw: pwRaw.bCB, tauRaw: pwRaw.tau, mhatDet: pwDet.mhat, bDet: pwDet.bCB, tauDet: pwDet.tau,
      ci, ciBonf, wilcoxonP: w.pValue, allSameSign: d.every((v) => v > 0) || d.every((v) => v < 0),
      sdDet: Math.sqrt(mean(tr.res.map((v) => v * v))),
    });
  }
}
const q = (x, p) => { const s = [...x].sort((a, b) => a - b); return s[Math.max(0, Math.ceil(p * s.length) - 1)]; };
const fmt = (v, d = 2) => (v == null ? 'na' : Number(v).toFixed(d));
const scale = (m) => (m.includes('bytes') ? 1 / 2 ** 20 : 1);
const excl = (ci) => ci[0] > 0 || ci[1] < 0;

console.log('\n=== Familienuebersicht');
for (const m of MEASURES) {
  const r = rows.filter((x) => x.measure === m);
  const col = (k) => r.map((x) => x[k]);
  const pp = (k, d = 2) => `${fmt(q(col(k), 0.25), d)}/${fmt(q(col(k), 0.5), d)}/${fmt(q(col(k), 0.75), d)}/${fmt(Math.max(...col(k)), d)}`;
  console.log(`\n${m}`);
  console.log(` lag1 roh Q1/Med/Q3/Max ${pp('r1')} | lag1 entrendet ${pp('r1Det')} | lag1 A ${pp('r1A')} | lag1 B ${pp('r1B')}`);
  console.log(` lag5 roh ${pp('r5')} | lag10 roh ${pp('r10')} | R2 Trend ${pp('r2')} | |t|>2 ${r.filter((x) => Math.abs(x.tTrend) > 2).length}`);
  console.log(` r1 ueber 0.211 roh ${r.filter((x) => x.r1 > 0.211).length}, entrendet ${r.filter((x) => x.r1Det > 0.211).length}`);
  console.log(` tau roh ${pp('tauRaw')} | tau entr ${pp('tauDet')} | mhat roh ${pp('mhatRaw', 0)} | mhat entr ${pp('mhatDet', 0)} | b roh ${pp('bRaw', 1)} | b entr ${pp('bDet', 1)}`);
  console.log(` n_eff=90/tau roh Median ${fmt(90 / q(col('tauRaw'), 0.5), 1)} | entr ${fmt(90 / q(col('tauDet'), 0.5), 1)}`);
  for (const L of LENGTHS) {
    const ratio = r.map((x) => { const wi = x.ci[1][1] - x.ci[1][0]; return wi > 0 ? (x.ci[L][1] - x.ci[L][0]) / wi : null; }).filter((v) => v != null);
    const iidRatio = r.map((x) => { const wi = x.iid[1] - x.iid[0]; return wi > 0 ? (x.ci[L][1] - x.ci[L][0]) / wi : null; }).filter((v) => v != null);
    console.log(`  L=${String(L).padStart(2)} KI schliesst 0 aus ${r.filter((x) => excl(x.ci[L])).length}/39 | Breite gegen iid Q2/Max ${fmt(q(iidRatio, 0.5))}/${fmt(Math.max(...iidRatio))}${ciLine(r, L)}`);
  }
}
function ciLine(r, L) {
  return r[0].ciBonf[L] ? ` | Niveau 1-0.05/39 schliesst 0 aus ${r.filter((x) => excl(x.ciBonf[L])).length}/39` : '';
}

console.log('\n=== Working Set je Test');
for (const x of rows.filter((v) => v.measure.includes('bytes')).sort((a, b) => a.id - b.id || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))) {
  console.log(`${String(x.id).padStart(2)} ${x.level.padEnd(8)} d ${fmt(x.median / 2 ** 20, 1).padStart(8)} iid [${fmt(x.iid[0] / 2 ** 20, 1)},${fmt(x.iid[1] / 2 ** 20, 1)}] L15 [${fmt(x.ci[15][0] / 2 ** 20, 1)},${fmt(x.ci[15][1] / 2 ** 20, 1)}] L30 [${fmt(x.ci[30][0] / 2 ** 20, 1)},${fmt(x.ci[30][1] / 2 ** 20, 1)}] r1 ${fmt(x.r1)} det ${fmt(x.r1Det)} R2 ${fmt(x.r2)} Drift ${fmt(x.totalDrift / 2 ** 20, 1)} tauDet ${fmt(x.tauDet, 1)} bDet ${fmt(x.bDet, 1)} same ${x.allSameSign ? 'j' : 'n'}`);
}

console.log('\n=== Prozesslebensdauer');
let multi = 0;
for (const [k, v] of Object.entries(lifetimes)) for (const [s, st] of Object.entries(v)) if (!/redis|nginx|sampler|simulator|producer/.test(s) && st.length > 1) multi++;
console.log('Dienste mit mehreren Startzeiten innerhalb einer Kampagne', multi);
const sorted = Object.values(campaigns).sort((a, b) => a.firstT.localeCompare(b.firstT));
const startsByService = {};
for (const c of sorted) {
  const lt = lifetimes[`${c.id}|${c.level}`];
  for (const [s, st] of Object.entries(lt)) {
    if (/redis|nginx|sampler|simulator|producer/.test(s)) continue;
    (startsByService[s] ||= []).push(st[0]);
  }
}
for (const [s, st] of Object.entries(startsByService)) console.log(s.padEnd(30), 'Kampagnen', st.length, 'verschiedene Starts', new Set(st).size);
const rs = {};
for (const c of sorted) for (const [s, st] of Object.entries(lifetimes[`${c.id}|${c.level}`])) if (/redis/.test(s)) (rs[s] ||= new Set()).add(st[0]);
console.log('Redis Starts', Object.fromEntries(Object.entries(rs).map(([k, v]) => [k, v.size])));

console.log('\n=== Streuung zwischen Kampagnen je Zelle und Stufe (Median der Laufwerte je Kampagne)');
const cellCamp = {};
for (const c of Object.values(campaigns)) {
  for (const cell of [c.a, c.b]) {
    for (const m of MEASURES) {
      const k = `${cell}|${c.level}|${m}`;
      const v = S.median(Object.values(c.runs[cell]).map((x) => x.m[m]));
      (cellCamp[k] ||= []).push({ id: c.id, v });
    }
  }
}
for (const m of MEASURES) {
  for (const level of LEVELS) {
    const entries = Object.entries(cellCamp).filter(([k]) => k.endsWith(`|${level}|${m}`));
    const ranges = entries.map(([, v]) => Math.max(...v.map((e) => e.v)) - Math.min(...v.map((e) => e.v)));
    const widths = rows.filter((r) => r.measure === m && r.level === level).map((r) => r.iid[1] - r.iid[0]);
    console.log(m.padEnd(30), level.padEnd(9), `Spannweite zwischen Kampagnen Median ${fmt(q(ranges, 0.5) * scale(m), 3)} Max ${fmt(Math.max(...ranges) * scale(m), 3)} | iid-KI-Breite Median ${fmt(q(widths, 0.5) * scale(m), 3)} | Verhaeltnis ${fmt(q(ranges, 0.5) / q(widths, 0.5), 1)}`);
  }
}

console.log('\n=== Quasi-Replikation innerhalb von Block 1');
for (const m of MEASURES) {
  let n = 0, inIid = 0, sameDir = 0;
  const hit = { 5: 0, 10: 0, 15: 0, 20: 0, 30: 0 };
  const dev = [];
  for (const r of rows.filter((x) => x.measure === m)) {
    const c = campaigns[`${r.id}|${r.level}`];
    const other = (cell) => cellCamp[`${cell}|${r.level}|${m}`].filter((e) => e.id !== r.id).map((e) => e.v);
    const oa = other(c.a);
    const ob = other(c.b);
    if (!oa.length || !ob.length) continue;
    const quasi = S.median(oa) - S.median(ob);
    n++;
    if (quasi >= r.iid[0] && quasi <= r.iid[1]) inIid++;
    if (Math.sign(quasi) === Math.sign(r.median)) sameDir++;
    for (const L of Object.keys(hit)) if (quasi >= r.ci[L][0] && quasi <= r.ci[L][1]) hit[L]++;
    dev.push(Math.abs(quasi - r.median) * scale(m));
  }
  console.log(m.padEnd(30), `Tests ${n} | Schaetzung aus anderen Kampagnen im iid-KI ${inIid} | gleiche Richtung ${sameDir} | im Block-KI ${JSON.stringify(hit)} | |Abw| Median ${fmt(q(dev, 0.5), 3)} Max ${fmt(Math.max(...dev), 3)}`);
}

console.log('\n=== Beispielreihen Differenz in MiB, je 10 Paare gemittelt');
for (const [id, level] of [[7, 'medium'], [5, 'stress'], [6, 'stress'], [12, 'baseline'], [13, 'stress']]) {
  const c = campaigns[`${id}|${level}`];
  const idx = Object.keys(c.runs[c.a]).map(Number).sort((x, y) => x - y);
  const d = idx.map((i) => (c.runs[c.a][i].m.working_set_peak_bytes_total - c.runs[c.b][i].m.working_set_peak_bytes_total) / 2 ** 20);
  const seg = [];
  for (let i = 0; i < 90; i += 10) seg.push(mean(d.slice(i, i + 10)).toFixed(1));
  console.log(id, level, seg.join(' '));
}
writeFileSync(OUT, JSON.stringify(rows));
