// Paarbildung für den gepaarten Vergleich zweier Konfigurationen
// (DECISIONS.md 5.8). Läufe mit derselben Laufnummer lagen im
// alternierenden Design A, B, A, B direkt nebeneinander — nur sie bilden
// ein Paar. Ein Paar zählt nur, wenn BEIDE Läufe gültig sind und für die
// Messgröße einen endlichen Wert haben ("complete-case" auf Paarebene).
// Früher wurden die Paare über die Position in einer Liste gebildet; ein
// einziger fehlgeschlagener Lauf hat dann alle folgenden Paare verschoben.
//
// runsA/runsB: Arrays von Lauf-Datensätzen mit `run_index` (Laufnummer pro
// Konfiguration) und `valid`. valueOf(run) liefert den Wert der Messgröße.
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
