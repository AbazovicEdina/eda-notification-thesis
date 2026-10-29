"""Figures for the written thesis (DECISIONS.md 5.24, 5.25).

Reads the overall evaluation (evaluation.json from tools/orchestrate/evaluate.js)
and the evaluation of scaling and saturation (series.json from
tools/orchestrate/series.js) and produces vector PDFs for Overleaf, plus
figures.md with a description of each figure.

Usage in the container (paths relative to the repository or absolute under /results):
    docker compose --profile tools run --rm figures \
        --evaluation results/<timestamp>_evaluation \
        --series results/<timestamp>_series

Output: results/<timestamp>_figures/*.pdf and figures.md.

Styled like the TikZ diagrams of the thesis (diagram-styles.tex, palette A).
Color encodes the language (PHP, Node.js) or the queue, gray the shared
infrastructure, the line style the transport (solid SSE, dashed
WebSocket). Font Latin Modern Roman as in the HagenbergThesis template
(lmodern, 11 pt), in the optical sizes LaTeX uses for \\small (10 pt) and
\\scriptsize (8 pt), embedded as TrueType. Hatching and markers keep the
figures readable in black-and-white print. Axis labels are in English,
because the thesis is written in English.
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone

import matplotlib

matplotlib.use("pdf")
import matplotlib.pyplot as plt  # noqa: E402
import matplotlib.ticker  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib import font_manager  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402
from matplotlib.text import Text  # noqa: E402

RESULTS = "/results"

# The Latin Modern fonts carry very old timestamps. fontTools reports this
# on every embedding, without any effect on the PDFs.
logging.getLogger("fontTools").setLevel(logging.ERROR)

# Font of the template. hgbthesis loads lmodern at 11 pt. LaTeX sets \small with
# the 10 pt size and \scriptsize with the 8 pt size of Latin Modern Roman.
# All three files share the same family name, so the file is chosen per
# text by its font size (apply_fonts).
# The files are converted to TrueType when the image is built (otf2ttf.py).
LM_DIR = "/usr/local/share/fonts/lm-ttf"
LM_FILES = {8: f"{LM_DIR}/lmroman8-regular.ttf", 9: f"{LM_DIR}/lmroman9-regular.ttf",
            10: f"{LM_DIR}/lmroman10-regular.ttf"}
for _path in LM_FILES.values():
    font_manager.fontManager.addfont(_path)
SMALL, SCRIPT = 10, 8  # \small and \scriptsize of the template in pt

# Palette A from diagram-styles.tex (sRGB), fill, line and text per role.
ROLES = {
    "php": ("#EEE8F8", "#7B68B5", "#3F3366"),
    "nodejs": ("#E6F1E8", "#5E8E68", "#2E4E35"),
    "queue": ("#FCE9DF", "#C27A5A", "#6B3A24"),
    "infra": ("#F5F2F0", "#8C8480", "#3F3A37"),
}
FLOW = "#776F73"  # flow-line
INFRA_FILL, INFRA_LINE, INFRA_TEXT = ROLES["infra"]
GRID = "#DDDAD9"  # infra-line, lightened to 30 %
DASHED = (0, (3, 2))  # ws style of the diagrams, on 3pt off 2pt
DOTTED = (0, (1.5, 1.5))  # lifeline style of the diagrams

WIDTH = 5.75  # text width of the template in inches (A4, 32 mm margin per side)

plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["Latin Modern Roman"],
    "mathtext.fontset": "cm",  # only for ≥, Computer Modern matches Latin Modern
    "axes.formatter.use_mathtext": True,
    "axes.unicode_minus": False,
    "font.size": SMALL,
    "axes.labelsize": SMALL,
    "axes.titlesize": SMALL,
    "xtick.labelsize": SCRIPT,
    "ytick.labelsize": SCRIPT,
    "legend.fontsize": SMALL,
    "text.color": INFRA_TEXT,
    "axes.edgecolor": INFRA_LINE,
    "axes.labelcolor": INFRA_TEXT,
    "axes.titlecolor": INFRA_TEXT,
    "xtick.color": INFRA_LINE,
    "ytick.color": INFRA_LINE,
    "xtick.labelcolor": INFRA_TEXT,
    "ytick.labelcolor": INFRA_TEXT,
    "axes.linewidth": 0.6,
    "xtick.major.width": 0.6,
    "ytick.major.width": 0.6,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "axes.grid.axis": "y",
    "grid.color": GRID,
    "grid.linewidth": 0.5,
    "axes.axisbelow": True,
    "lines.linewidth": 1.2,
    "hatch.linewidth": 0.5,
    "legend.frameon": False,
    "pdf.fonttype": 42,
    "savefig.dpi": 300,
})

SCENARIOS = [("baseline", "10 clients"), ("medium", "50 clients"), ("stress", "500 clients")]

MEASURES = {
    "latency_mean_ms": ("Mean event latency per run (ms)", 1.0),
    "cpu_seconds_total": ("CPU time per run, variant and Redis (s)", 1.0),
    "working_set_peak_bytes_total": ("Peak working set, variant and Redis (MiB)", 1 / 2 ** 20),
    "connect_mean_ms": ("Mean connection setup time per run (ms)", 1.0),
}

def role_of(cell):
    """Color role of a variant, queue variants in the queue color, otherwise the language."""
    if cell.endswith("-queue"):
        return "queue"
    return "nodejs" if cell.startswith("node-") else "php"


def is_ws(cell):
    return cell.endswith("-ws")


# Comparison groups from plan.json, tier according to DECISIONS.md 5.24. The
# second box of a pair is hatched when color and line style do not
# distinguish it from the first in black-and-white print.
SETS = [
    {"key": "language", "ids": [1, 2, 3, 4], "tier": "Kern (6.2)", "hatch_b": "////", "ws": True,
     "labels": {1: "minimal, SSE", 2: "minimal, WS", 3: "framework, SSE", 4: "framework, WS"},
     "legend": [("nodejs", "", "-", "Node.js"), ("php", "////", "-", "PHP")]},
    {"key": "transport", "ids": [12, 13], "tier": "Kern (6.3)", "hatch_b": "", "ws": True,
     "labels": {12: "Node.js, minimal", 13: "PHP, minimal"},
     "legend": [("nodejs", "", "-", "Node.js"), ("php", "", "-", "PHP")]},
    {"key": "framework", "ids": [5, 6, 7, 8], "tier": "Ergänzung (6.4) bzw. Anhang", "hatch_b": "////", "ws": True,
     "labels": {5: "Node.js, SSE", 6: "Node.js, WS", 7: "PHP, SSE", 8: "PHP, WS"},
     "legend": [("nodejs", "", "-", "Node.js"), ("php", "", "-", "PHP"),
                ("infra", "", "-", "minimal"), ("infra", "////", "-", "framework-based")]},
    {"key": "queue", "ids": [9, 10], "tier": "Ergänzung (6.4) bzw. Anhang", "hatch_b": "....",
     "labels": {9: "Node.js (BullMQ)", 10: "PHP (Laravel Queue)"},
     "legend": [("nodejs", "", "-", "Node.js without queue"), ("php", "", "-", "PHP without queue"),
                ("queue", "....", "-", "with queue")]},
    {"key": "language-queue", "ids": [11], "tier": "Anhang", "hatch_b": "////",
     "labels": {11: "framework, SSE with queue"},
     "legend": [("nodejs", "", "-", "Node.js (BullMQ)"), ("php", "////", "-", "PHP (Laravel Queue)")]},
]
# Line style of the transports for every group with WebSocket comparisons ("ws").
TRANSPORT_LEGEND = [("infra", "", "-", "Server-Sent Events"), ("infra", "", DASHED, "WebSocket")]

FAMILIES = [
    ("node-minimal", "Node.js, minimal"),
    ("node-express", "Node.js, Express"),
    ("php-minimal", "PHP, minimal"),
    ("php-laravel", "PHP, Laravel"),
]
# Lines of the scaling series, color from the variant, line style from the transport.
SERIES_STYLE = {
    "sse": ("Server-Sent Events", "-", "o"),
    "ws": ("WebSocket", DASHED, "^"),
    "sse-queue": ("Server-Sent Events with queue", "-", "s"),
}
SERIES_SHORT = {"sse": "SSE", "ws": "WS", "sse-queue": "SSE + queue"}


def resolve(path):
    """Path relative to the repository (results/...) or absolute in the container."""
    if path is None:
        return None
    if path.startswith("results/") or path.startswith("results\\"):
        return os.path.join(RESULTS, path.split("/", 1)[-1].split("\\", 1)[-1])
    return path


def load(path, name):
    if path is None:
        return None
    file = os.path.join(path, name)
    if not os.path.exists(file):
        sys.exit(f"{file} nicht gefunden")
    with open(file, encoding="utf-8") as handle:
        return json.load(handle)


def apply_fonts(fig):
    """Choose the optical size of Latin Modern per text, as LaTeX does."""
    fig.canvas.draw()
    for text in fig.findobj(Text):
        if not text.get_text():
            continue
        size = text.get_fontsize()
        design = 8 if size < 8.5 else 9 if size < 9.5 else 10
        text.set_fontproperties(font_manager.FontProperties(fname=LM_FILES[design], size=size))


def save(fig, out_dir, name):
    apply_fonts(fig)
    fig.savefig(os.path.join(out_dir, name), metadata={"CreationDate": None, "Creator": None, "Producer": None})
    plt.close(fig)


def legend_patch(role, hatch, linestyle, label):
    fill, line, _ = ROLES[role]
    return Patch(facecolor=fill, edgecolor=line, hatch=hatch, linestyle=linestyle, linewidth=0.8, label=label)


def legend_marker(marker, color, label, filled=True):
    return Line2D([], [], linestyle="none", marker=marker, markersize=4, markeredgewidth=0.6,
                  markerfacecolor=color if filled else "none", markeredgecolor=color, label=label)


def fmt_delta(delta):
    """Cliff's delta with a true minus sign and explicit sign, two decimal places."""
    return f"{delta:+.2f}".replace("-", "−")


def style_box(box, role, hatch, linestyle):
    fill, line, text = ROLES[role]
    for patch in box["boxes"]:
        patch.set_facecolor(fill)
        patch.set_edgecolor(line)
        patch.set_linewidth(0.8)
        patch.set_linestyle(linestyle)
        if hatch:
            patch.set_hatch(hatch)
    for part in ("whiskers", "caps"):
        for item in box[part]:
            item.set_color(line)
            item.set_linewidth(0.8)
            item.set_linestyle(linestyle)
    for item in box["medians"]:
        item.set_color(text)
        item.set_linewidth(1.2)


def box_figure(evaluation, measure, spec, out_dir, notes):
    family = next((f for f in evaluation["families"] if f["measure"] == measure), None)
    if family is None:
        notes.append(f"{measure}: keine Familie in evaluation.json")
        return None
    label, scale = MEASURES[measure]
    # Same seed for every figure, so the jitter of the points is identical on every re-evaluation.
    rng = np.random.default_rng(1)
    # Three load levels stacked vertically, so the group names fit on one line.
    fig, axes = plt.subplots(3, 1, figsize=(WIDTH, 6.9), constrained_layout=True)
    counts = []
    missing = 0
    for ax, (scenario, title) in zip(axes, SCENARIOS):
        ax.set_title(title, loc="left")
        drawn = 0
        top = 0.0
        deltas = []
        for i, cid in enumerate(spec["ids"]):
            test = next((t for t in family["tests"] if t["comparison_id"] == cid and t["scenario"] == scenario), None)
            result = test and test.get("result")
            pairs = result and result.get("pairs")
            if not pairs or not pairs.get("a"):
                ax.text(i, 0.5, "no data", transform=ax.get_xaxis_transform(), ha="center", va="center",
                        color=INFRA_LINE, fontsize=SCRIPT)
                missing += 1
                continue
            drawn += 1
            values = [np.asarray(pairs["a"], dtype=float) * scale, np.asarray(pairs["b"], dtype=float) * scale]
            counts.append(len(values[0]))
            for j, (data, cell) in enumerate(zip(values, (test["a"], test["b"]))):
                pos = i + (-0.19 if j == 0 else 0.19)
                box = ax.boxplot([data], positions=[pos], widths=0.32, patch_artist=True, showfliers=False,
                                 manage_ticks=False, whis=1.5)
                style_box(box, role_of(cell), spec["hatch_b"] if j == 1 else "", DASHED if is_ws(cell) else "-")
                # Each run as a point, so that distribution and sample size are visible.
                jitter = rng.uniform(-0.07, 0.07, len(data))
                ax.plot(pos + jitter, data, linestyle="none", marker="o", markersize=1.6, markeredgewidth=0,
                        color=ROLES[role_of(cell)][1], alpha=0.6, zorder=3)
                top = max(top, float(np.max(data)))
            if result.get("cliffs_delta") is not None:
                deltas.append((i, result["cliffs_delta"], bool(test.get("significant"))))
        ax.set_xticks(range(len(spec["ids"])))
        ax.set_xticklabels([spec["labels"][cid] for cid in spec["ids"]])
        ax.set_xlim(-0.6, len(spec["ids"]) - 0.4)
        ax.grid(axis="x", visible=False)
        if drawn == 0:
            ax.set_yticks([])  # empty panel without a meaningless scale
            continue
        # Axis from zero, all measures are on a ratio scale, so differences are not exaggerated.
        ax.set_ylim(0, top * 1.2)
        for i, delta, significant in deltas:
            ax.text(i, top * 1.08, rf"$\delta$ = {fmt_delta(delta)}{'*' if significant else ''}",
                    ha="center", va="bottom", fontsize=SCRIPT, color=INFRA_TEXT)
    fig.supylabel(label, fontsize=SMALL)
    entries = list(spec["legend"])
    if spec.get("ws"):
        entries += TRANSPORT_LEGEND
    handles = [legend_patch(*e) for e in entries]
    handles.append(legend_marker("o", INFRA_LINE, "one run"))
    # The caption (figures.md) explains δ and * above the pairs, so that the legend fits the text width.
    # One pair per column (language, framework, transport), so that related entries are stacked.
    fig.legend(handles=handles, loc="outside upper center", ncol=(len(handles) + 1) // 2 if len(handles) > 4 else len(handles),
               handlelength=1.6, columnspacing=1.5)
    name = f"box-{measure.replace('_', '-')}-{spec['key']}.pdf"
    save(fig, out_dir, name)
    n = "0" if not counts else str(min(counts)) if min(counts) == max(counts) else f"{min(counts)}–{max(counts)}"
    gaps = f"; ohne Daten: {missing} von {3 * len(spec['ids'])} Gruppen" if missing else ""
    caption = ("Box: Interquartilsabstand, Linie: Median, Antennen: höchstens das 1,5-Fache des Interquartilsabstands, "
               f"Punkte: einzelne Läufe (n = {n} je Box). δ: Cliff's Delta der linken gegenüber der rechten Variante "
               "(positiv: links höher), *: signifikant nach Holm-Korrektur in Block 1. Achse ab null. "
               "Gestrichelt: WebSocket. Schraffur: zweite Variante des Paares.")
    return {"file": name, "tier": spec["tier"], "caption": caption,
            "what": f"Boxplots der Lauf-Werte ({measure}) für die Vergleiche {', '.join(map(str, spec['ids']))}, je Laststufe ein Feld; Paare je Vergleich und Stufe: {n}{gaps}"}


def place_labels(ax, items, log=False):
    """Direct labels at the end of each line, spread vertically so they do not overlap."""
    if not items:
        return
    to_axis = np.log10 if log else (lambda v: v)
    from_axis = (lambda v: 10 ** v) if log else (lambda v: v)
    y0, y1 = (to_axis(v) for v in ax.get_ylim())
    span = y1 - y0 or 1
    items = sorted(((x, to_axis(y), text, color) for x, y, text, color in items), key=lambda it: it[1])
    min_gap = 0.085 * span
    placed = []
    for x, y, text, color in items:
        if placed and y - placed[-1][1] < min_gap:
            y = placed[-1][1] + min_gap
        placed.append((x, y, text, color))
    # Center the group around the original middle and keep it inside the panel.
    shift = np.mean([it[1] for it in items]) - np.mean([p[1] for p in placed])
    shift = min(shift, y1 - placed[-1][1])
    shift = max(shift, y0 - placed[0][1])
    for x, y, text, color in placed:
        ax.annotate(text, xy=(x, from_axis(y + shift)), xytext=(4, 0), textcoords="offset points", va="center",
                    ha="left", fontsize=SCRIPT, color=color, annotation_clip=False)


def scaling_figure(series, metric, out_dir, notes):
    # Measure, axis title, factor, file, fields of the range (run.js, scalingSummary)
    configs = {
        "served": ("served_ratio_median", "Served clients (%)", 100.0, "scaling-served.pdf",
                   ("served_ratio_min", "served_ratio_max")),
        "latency": ("latency_mean_median_ms", "Mean event latency (ms)", 1.0, "scaling-latency.pdf",
                    ("latency_mean_min_ms", "latency_mean_max_ms")),
        "memory": ("working_set_peak_total_median_bytes", "Peak working set,\nvariant and Redis (MiB)", 1 / 2 ** 20,
                   "scaling-memory.pdf", ("working_set_peak_total_min_bytes", "working_set_peak_total_max_bytes")),
    }
    key, label, scale, name, (key_min, key_max) = configs[metric]
    scaling = series.get("scaling", {})
    if not scaling:
        notes.append("series.json: keine Skalierungsreihe")
        return None
    fig, axes = plt.subplots(2, 2, figsize=(WIDTH, 4.8), sharex=True, sharey=True, constrained_layout=True)
    steps_seen, values, runs = set(), [], set()
    has_range = False
    for ax, (fam, title) in zip(axes.flat, FAMILIES):
        ax.set_title(title)
        ends = []
        for suffix, (_, ls, marker) in SERIES_STYLE.items():
            cell_name = f"{fam}-{suffix}"
            cell = scaling.get(cell_name)
            if not cell:
                continue
            steps = [s for s in cell["steps"] if s.get(key) is not None]
            if not steps:
                continue
            xs = [s["clients"] for s in steps]
            ys = [s[key] * scale for s in steps]
            steps_seen.update(xs)
            values += ys
            runs.update(s["runs"] for s in steps if s.get("runs"))
            _, line, text = ROLES[role_of(cell_name)]
            ax.plot(xs, ys, color=line, linestyle=ls, marker=marker, markersize=3.5, markeredgewidth=0)
            if all(s.get(key_min) is not None and s.get(key_max) is not None for s in steps):
                has_range = True
                lo = [y - s[key_min] * scale for y, s in zip(ys, steps)]
                hi = [s[key_max] * scale - y for y, s in zip(ys, steps)]
                ax.errorbar(xs, ys, yerr=[lo, hi], fmt="none", ecolor=line, elinewidth=0.6, capsize=1.8,
                            capthick=0.6)
            ends.append((xs[-1], ys[-1], SERIES_SHORT[suffix], text))
        if metric == "served":
            ax.axhline(99, color=FLOW, linewidth=0.6, linestyle=DOTTED)
        if not ends:
            ax.text(0.5, 0.5, "no data", transform=ax.transAxes, ha="center", va="center", color=INFRA_LINE,
                    fontsize=SCRIPT)
        ax._eda_ends = ends  # label after the axis limits are set
    # Logarithmic y axis if the values span more than an order of magnitude and a factor of 20,
    # otherwise the frugal variants would not be readable on the shared axis.
    positive = [v for v in values if v > 0]
    log_y = metric != "served" and positive and max(positive) / min(positive) > 20
    all_steps = sorted(steps_seen) or [10, 50, 100, 250, 500, 1000]
    for ax in axes.flat:
        ax.set_xscale("log")
        if log_y:
            ax.set_yscale("log")
            ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:g}"))
            ax.yaxis.set_minor_formatter(matplotlib.ticker.NullFormatter())
        ax.set_xlim(7, 2600)  # room on the right for the direct labels
        # Every level gets a tick. 750 has no number, otherwise it collides with 1000.
        ax.set_xticks(all_steps)
        ax.set_xticklabels(["" if s == 750 else str(s) for s in all_steps], rotation=0)
        ax.xaxis.set_minor_locator(matplotlib.ticker.NullLocator())
        ax.grid(axis="x", visible=False)
    for ax in axes[1]:
        ax.set_xlabel("Concurrent clients")
    for ax in axes[:, 0]:
        ax.set_ylabel(label + (" (log scale)" if log_y and "\n" not in label else "\n(log scale)" if log_y else ""))
    if metric != "served" and not log_y:
        axes[0, 0].set_ylim(bottom=0)  # linear axis from zero, as for the box plots
    if metric == "served":
        axes[0, 0].set_ylim(bottom=max(0, axes[0, 0].get_ylim()[0]), top=101)
        # left below the line, so it does not cover the labels at the line ends
        axes[0, 0].annotate("99 % criterion", xy=(0, 99), xycoords=("axes fraction", "data"), xytext=(4, -9),
                            textcoords="offset points", ha="left", fontsize=SCRIPT, color=INFRA_TEXT)
    fig.canvas.draw()
    for ax in axes.flat:
        place_labels(ax, getattr(ax, "_eda_ends", []), log=log_y)
    handles = [Line2D([], [], color=FLOW, linestyle="-", marker="o", markersize=3.5, markeredgewidth=0,
                      label="Server-Sent Events"),
               Line2D([], [], color=FLOW, linestyle=DASHED, marker="^", markersize=3.5, markeredgewidth=0,
                      label="WebSocket"),
               Line2D([], [], color=ROLES["queue"][1], linestyle="-", marker="s", markersize=3.5, markeredgewidth=0,
                      label="Server-Sent Events with queue")]
    fig.legend(handles=handles, loc="outside upper center", ncol=3)
    save(fig, out_dir, name)
    n = "–".join(str(r) for r in sorted({min(runs), max(runs)})) if runs else "unbekannt"
    caption = (f"Punkte und Linien: Median über n = {n} Läufe je Stufe"
               + (", Fehlerbalken: kleinster bis größter Lauf" if has_range else ", ohne Fehlerbalken (keine Spannweite in series.json)")
               + (". y-Achse logarithmisch." if log_y else ".")
               + " Farbe nach Sprache bzw. Queue, gestrichelt WebSocket."
               + (" Gepunktete Linie: Kriterium von 99 % bedienten Clients." if metric == "served" else ""))
    return {"file": name, "tier": "Kern (6.2, 6.3)", "caption": caption,
            "what": f"Skalierungsreihe, {label.replace(chr(10), ' ')} über die Clientzahl, je Sprache und Framework-Wahl ein Feld"}


def saturation_figure(series, out_dir, notes):
    saturation = series.get("saturation", {})
    if not saturation:
        notes.append("series.json: kein Sättigungstest")
        return None
    rates = sorted({s["rate_per_s"] for c in saturation.values() for s in c["steps"]})
    top = rates[-1] if rates else None
    # Dot plot instead of bars, because the result is the highest level passed, not a continuous value.
    fig, ax = plt.subplots(figsize=(WIDTH, 3.0), constrained_layout=True)
    offsets = {"sse": -0.22, "ws": 0.0, "sse-queue": 0.22}
    floor = rates[0] / 1.8 if rates else 1
    for i, (fam, _) in enumerate(FAMILIES):
        for suffix in ("sse", "ws", "sse-queue"):
            cell_name = f"{fam}-{suffix}"
            cell = saturation.get(cell_name)
            if cell is None:
                continue
            _, line, text = ROLES[role_of(cell_name)]
            marker = SERIES_STYLE[suffix][2]
            value = cell.get("max_sustainable_rate_per_s")
            x = i + offsets[suffix]
            # The value sits on a grid line of the tested levels and needs no number.
            if value is None:
                ax.plot(x, floor, linestyle="none", marker=marker, markersize=5, markerfacecolor="none",
                        markeredgecolor=line, markeredgewidth=0.8, clip_on=False)
            else:
                ax.plot(x, value, linestyle="none", marker=marker, markersize=5, color=line, markeredgewidth=0)
                if value >= top:
                    # Highest level passed, the limit lies above, shown by an upward arrow.
                    ax.annotate("", xy=(x, value * 1.55), xytext=(x, value * 1.12),
                                arrowprops={"arrowstyle": "-|>", "color": text, "linewidth": 0.7,
                                            "mutation_scale": 6, "shrinkA": 0, "shrinkB": 0})
    ax.set_yscale("log")
    if rates:
        ax.set_yticks(rates)
        ax.set_yticklabels([f"{r:g}" for r in rates])
        ax.yaxis.set_minor_locator(matplotlib.ticker.NullLocator())
        ax.set_ylim(floor / 1.3, top * 1.9)
    ax.set_xticks(range(len(FAMILIES)))
    ax.set_xticklabels([t for _, t in FAMILIES])
    ax.tick_params(axis="x", labelsize=SMALL)
    ax.set_xlim(-0.6, len(FAMILIES) - 0.4)
    ax.set_ylabel("Maximum sustainable\nevent rate (events/s)")
    ax.grid(axis="x", visible=False)
    handles = [legend_marker("o", FLOW, "Server-Sent Events"), legend_marker("^", FLOW, "WebSocket"),
               legend_marker("s", ROLES["queue"][1], "Server-Sent Events with queue"),
               legend_marker(r"$\uparrow$", FLOW, "highest tested rate sustained"),
               legend_marker("o", FLOW, "no tested rate sustained", filled=False)]
    fig.legend(handles=handles, loc="outside upper center", ncol=3, handlelength=1.0, columnspacing=1.5)
    save(fig, out_dir, "saturation.pdf")
    crit = next(iter(saturation.values())).get("criteria") or {}
    rule = ""
    if crit.get("minDeliveryRatio") is not None and crit.get("maxP95LatencyMs") is not None:
        rule = (f" Nachhaltig: mindestens {crit['minDeliveryRatio'] * 100:g} % zugestellte Events und p95-Latenz "
                f"höchstens {crit['maxP95LatencyMs']:g} ms auf dieser und allen niedrigeren Stufen.")
    caption = ("Punkt: höchste getestete Event-Rate, die eine Variante nachhaltig zustellt; y-Achse logarithmisch, "
               "waagrechte Linien bei den getesteten Stufen; Pfeil nach oben: höchste Stufe bestanden, die Grenze liegt darüber; "
               "offenes Symbol: schon die niedrigste Stufe nicht bestanden." + rule + " Farbe nach Sprache bzw. Queue, "
               "Symbol nach Transport.")
    return {"file": "saturation.pdf", "tier": "Kern (6.3)", "caption": caption,
            "what": "Sättigungstest, höchste nachhaltige Event-Rate je Variante"}


def main():
    parser = argparse.ArgumentParser(description="Abbildungen für die schriftliche Arbeit")
    parser.add_argument("--evaluation", help="Verzeichnis mit evaluation.json")
    parser.add_argument("--series", help="Verzeichnis mit series.json")
    args = parser.parse_args()
    if not args.evaluation and not args.series:
        parser.error("mindestens --evaluation oder --series angeben")

    evaluation = load(resolve(args.evaluation), "evaluation.json")
    series = load(resolve(args.series), "series.json")
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%f")[:-3] + "Z"
    out_dir = os.path.join(RESULTS, f"{stamp}_figures")
    os.makedirs(out_dir, exist_ok=True)

    notes, made = [], []
    if evaluation:
        for spec in SETS:
            for measure in MEASURES:
                entry = box_figure(evaluation, measure, spec, out_dir, notes)
                if entry:
                    made.append(entry)
    if series:
        for metric in ("served", "latency", "memory"):
            entry = scaling_figure(series, metric, out_dir, notes)
            if entry:
                made.append(entry)
        entry = saturation_figure(series, out_dir, notes)
        if entry:
            made.append(entry)

    lines = [
        "# Abbildungen",
        "",
        f"Erzeugt: {stamp}. Quellen: {args.evaluation or '–'} (evaluation.json), {args.series or '–'} (series.json).",
        "",
        "Vektor-PDFs für den Ordner `images/` im Overleaf-Projekt, eingebunden mit `\\includegraphics[width=\\textwidth]{<datei ohne .pdf>}`.",
        "Farben und Linienarten wie in den TikZ-Diagrammen (diagram-styles.tex): Farbe nach Sprache bzw. Queue, durchgezogen SSE, gestrichelt WebSocket.",
        "Schwerpunkte nach DECISIONS.md 5.24: Kernabbildungen im Text, die übrigen im Anhang.",
        "Die Spalte „Für die Bildunterschrift“ nennt, was die Unterschrift erklären muss, damit die Abbildung ohne den Fließtext lesbar ist.",
        "",
        "| Datei | Stufe | Inhalt | Für die Bildunterschrift |",
        "|---|---|---|---|",
    ]
    lines += [f"| `{m['file']}` | {m['tier']} | {m['what']} | {m['caption']} |" for m in made]
    if notes:
        lines += ["", "## Hinweise", ""] + [f"- {n}" for n in notes]
    with open(os.path.join(out_dir, "figures.md"), "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    print(f"Abbildungen: results/{os.path.basename(out_dir)} ({len(made)} Dateien)")
    for n in notes:
        print(f"  Hinweis: {n}")


if __name__ == "__main__":
    main()
