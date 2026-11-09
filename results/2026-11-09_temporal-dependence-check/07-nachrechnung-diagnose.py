"""Separate recomputation of the temporal diagnosis of block 1 from the single run files.

Written independently of stats.js and assessment.js, but by the same author, so
it checks the implementation and is no external validation.
Usage: python -I -X utf8 07-nachrechnung-diagnose.py <results_dir> <evaluation.json> <plan.json>
"""
import glob
import json
import math
import os
import re
import statistics as st
import sys
from collections import Counter, defaultdict

RESULTS, EVALUATION, PLAN = sys.argv[1:4]
MEASURES = ["latency_mean_ms", "cpu_seconds_total", "working_set_peak_bytes_total", "connect_mean_ms"]
plan = json.load(open(PLAN, encoding="utf-8"))
evaluation = json.load(open(EVALUATION, encoding="utf-8"))
A_B = {c["id"]: (c["a"], c["b"]) for c in plan["comparisons"]}
# Only unprefixed campaigns of block 1. Block 2 is never read.
NAME = re.compile(r"^[0-9T\-Z]+_b1-c(\d\d)-(baseline|medium|stress)$")


def lag1(x, runs, reference):
    n = len(x)
    centre = math.fsum(x) / n
    dev = [v - centre for v in x]
    denominator = math.fsum(v * v for v in dev)
    products = [dev[i] * dev[i + 1] for i in range(n - 1) if runs[i + 1] == runs[i] + 1]
    if denominator <= (1e-10 * reference) ** 2 * n or not products:
        return None, len(products)
    return (n - 1) / len(products) * math.fsum(products) / denominator, len(products)


def detrend(x, runs):
    n = len(x)
    mx, my = math.fsum(runs) / n, math.fsum(x) / n
    sxx = math.fsum((r - mx) ** 2 for r in runs)
    slope = math.fsum((r - mx) * (v - my) for r, v in zip(runs, x)) / sxx
    residuals = [v - my - slope * (r - mx) for r, v in zip(runs, x)]
    sst = math.fsum((v - my) ** 2 for v in x)
    return residuals, 1 - math.fsum(e * e for e in residuals) / sst


series = {}
starts = defaultdict(lambda: defaultdict(set))
started = {}
names = [d for d in os.listdir(RESULTS) if NAME.match(d)]
for d in names:
    m = NAME.match(d)
    cid, level = int(m.group(1)), m.group(2)
    started[d] = json.load(open(os.path.join(RESULTS, d, "aggregate.json"), encoding="utf-8"))["started_at"]
    runs = defaultdict(dict)
    for f in glob.glob(os.path.join(RESULTS, d, "runs", "*.json")):
        r = json.load(open(f, encoding="utf-8"))
        for c in r["containers"]:
            starts[(d, r["run"]["cell"])][c["service"]].add(c["started_at"])
        if not r["run"]["warmup"] and r["run"]["valid"]:
            runs[r["run"]["config"]][r["run"]["run_index"]] = r["measures"]
    a, b = A_B[cid]
    idx = sorted(set(runs[a]) & set(runs[b]))
    for measure in MEASURES:
        series[(cid, level, measure)] = (idx, [runs[a][i][measure] - runs[b][i][measure] for i in idx])

block1 = [b for b in evaluation["temporal_dependence"]["blocks"] if b["block"] == 1][0]
block2 = [b for b in evaluation["temporal_dependence"]["blocks"] if b["block"] == 2][0]
print("Kampagnen", len(names), "| Reihen", len(series), "| Diagnosen Block 2 in der Auswertung", sum(f["diagnoses"] for f in block2["families"]))
maxima = Counter()
mismatch = 0
classes = Counter()
holm = Counter()
for family in block1["families"]:
    for row in family["rows"]:
        runs, d = series[(row["comparison_id"], row["scenario"], family["measure"])]
        n = len(d)
        limit = 2 / math.sqrt(n)
        reference = max(abs(v) for v in d)
        r1, adjacent = lag1(d, runs, reference)
        residuals, share = detrend(d, runs)
        r1_detrended, _ = lag1(residuals, runs, reference)
        first = [v for r, v in zip(runs, d) if r <= 50]
        second = [v for r, v in zip(runs, d) if r > 50]
        change = st.median(second) - st.median(first)
        label = "nicht bestimmbar" if r1 is None or r1_detrended is None else "Reststruktur" if r1_detrended > limit else "nur linearer Trend" if r1 > limit else "ohne Befund"
        for key, ours, theirs in [("n", n, row["n_pairs"]), ("Nachbarpaare", adjacent, row["n_adjacent_pairs"]), ("Haelfte1", len(first), row["n_first_half"]), ("Haelfte2", len(second), row["n_second_half"]), ("fehlend", runs[-1] - runs[0] + 1 - n, row["missing_runs_inside"])]:
            if ours != theirs:
                mismatch += 1
                print("ABWEICHUNG", key, row["comparison_id"], row["scenario"], ours, theirs)
        scale = max(reference, 1e-300)
        for key, ours, theirs in [("Grenze", limit, row["limit"]), ("r1", r1, row["r1"]), ("r1_trendbereinigt", r1_detrended, row["r1_detrended"]), ("Trendanteil", share, row["trend_share"])]:
            maxima[key] = max(maxima[key], abs(ours - theirs))
        maxima["Aenderung_relativ"] = max(maxima["Aenderung_relativ"], abs(change - row["median_change_between_halves"]) / scale)
        if label != row["diagnosis"]:
            mismatch += 1
            print("ABWEICHUNG Einordnung", row["comparison_id"], row["scenario"], family["measure"], label, row["diagnosis"])
        classes[(family["measure"], label)] += 1
        if row["holm_decision_of_main_analysis"]:
            holm[label] += 1
print("Groesste absolute Abweichungen:", {k: float(f"{v:.3e}") for k, v in maxima.items()})
print("Abweichungen bei Anzahlen und Einordnungen:", mismatch)
print("Diagnosen je Block:", sum(classes.values()), "| bei zwei Bloecken insgesamt geplant:", 2 * sum(classes.values()))
for measure in MEASURES:
    print(" ", measure, {k[1]: v for k, v in sorted(classes.items()) if k[0] == measure})
print("Nach Holm signifikant, je Einordnung:", dict(holm), "| zusammen", sum(holm.values()))

seen = defaultdict(set)
continued_campaigns = set()
for d in sorted(names, key=lambda x: started[x]):
    for (name, cell), services in list(starts.items()):
        if name != d:
            continue
        if any(s in seen[service] for service, times in services.items() for s in times):
            continued_campaigns.add(d)
    for (name, cell), services in starts.items():
        if name == d:
            for service, times in services.items():
                seen[service] |= times
pc = [p for p in evaluation["temporal_dependence"]["process_continuity"] if p["block"] == 1][0]
print("Kampagnen mit weiterlaufendem Prozess, Nachrechnung:", len(continued_campaigns), "| Auswertung:", pc["campaigns_with_continued_process"], "von", pc["campaigns"])
print("ERGEBNIS:", "uebereinstimmend" if mismatch == 0 and max(maxima.values()) < 1e-9 and len(continued_campaigns) == pc["campaigns_with_continued_process"] else "ABWEICHUNG")
