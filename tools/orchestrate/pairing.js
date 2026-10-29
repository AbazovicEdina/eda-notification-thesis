// Pairing for the paired comparison of two configurations
// (DECISIONS.md 5.8). In the alternating design A, B, A, B, runs with the
// same run number ran directly next to each other, so only they form a
// pair. A pair counts only if BOTH runs are valid and have a finite value
// for the measure (complete case at the pair level). Pairs used to be
// formed by position in a list, so a single failed run shifted all
// following pairs.
//
// runsA/runsB are arrays of run records with `run_index` (run number per
// configuration) and `valid`. valueOf(run) returns the value of the measure.
export function pairByRunIndex(runsA, runsB, valueOf) {
  const byIndexB = new Map(runsB.map((r) => [r.run_index, r]));
  const a = [];
  const b = [];
  const indices = [];
  const dropped = [];
  for (const runA of [...runsA].sort((x, y) => x.run_index - y.run_index)) {
    const runB = byIndexB.get(runA.run_index);
    const va = runA.valid ? valueOf(runA) : null;
    const vb = runB?.valid ? valueOf(runB) : null;
    if (Number.isFinite(va) && Number.isFinite(vb)) {
      a.push(va);
      b.push(vb);
      indices.push(runA.run_index);
    } else {
      dropped.push(runA.run_index);
    }
  }
  const indicesA = new Set(runsA.map((r) => r.run_index));
  for (const runB of runsB) {
    if (!indicesA.has(runB.run_index)) dropped.push(runB.run_index);
  }
  return { a, b, indices, dropped: [...new Set(dropped)].sort((x, y) => x - y) };
}
