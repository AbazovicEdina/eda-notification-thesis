"""Read-only: course of the working set of single cells over the run number in Block 1.
Usage: python -I -X utf8 05-verlauf-working-set.py <results_dir>"""
import glob
import json
import os
import re
import statistics as st
import sys

R = sys.argv[1]


def series(cid, level, cell):
    d = [x for x in os.listdir(R) if re.search(r"^[0-9T\-Z]+_b1-c%02d-%s$" % (cid, level), x)][0]
    out = {}
    for f in glob.glob(os.path.join(R, d, "runs", "*_%s_run*.json" % cell)):
        r = json.load(open(f, encoding="utf-8"))
        out[r["run"]["run_index"]] = r["measures"]["working_set_peak_bytes"] / 2 ** 20
    return [out[i] for i in sorted(out)]


for cid, level, cell in [(1, "baseline", "php-minimal-sse"), (13, "baseline", "php-minimal-sse"), (7, "baseline", "php-minimal-sse"), (1, "medium", "php-minimal-sse"), (1, "stress", "php-minimal-sse"),
                         (7, "baseline", "php-laravel-sse"), (7, "medium", "php-laravel-sse"), (7, "stress", "php-laravel-sse"), (1, "baseline", "node-minimal-sse"), (2, "medium", "php-minimal-ws"), (2, "medium", "node-minimal-ws")]:
    s = series(cid, level, cell)
    dec = [round(st.mean(s[i:i + 10]), 1) for i in range(0, 90, 10)]
    print(cid, level.ljust(8), cell.ljust(18), "Laeufe", len(s), "Dezile", dec, "| erste 12 Laeufe", [round(v, 1) for v in s[:12]] if level != "baseline" else "")
