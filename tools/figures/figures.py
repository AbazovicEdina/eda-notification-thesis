"""Abbildungen für die schriftliche Arbeit (DECISIONS.md 5.24, 5.25).

Liest die Gesamtauswertung (evaluation.json aus tools/orchestrate/evaluate.js)
und die Auswertung von Skalierung und Sättigung (series.json aus
tools/orchestrate/series.js) und erzeugt Vektor-PDFs für Overleaf, dazu
figures.md mit einer Beschreibung jeder Abbildung.

Aufruf im Container (Pfade relativ zum Repository oder absolut unter /results):
    docker compose --profile tools run --rm figures \
        --evaluation results/<zeitstempel>_evaluation \
        --series results/<zeitstempel>_series

Ergebnis: results/<zeitstempel>_figures/*.pdf und figures.md.

Gestaltung: Schrift Computer Modern (passt zur Latin-Modern-Schrift der
HagenbergThesis-Vorlage), eingebettet als TrueType; Farben aus einer auf
Farbfehlsichtigkeit geprüften Palette, zusätzlich Schraffur, Linienart und
Markierung, damit die Abbildungen auch in Graustufen lesbar bleiben.
Achsenbeschriftungen auf Englisch, da die Arbeit auf Englisch verfasst wird.
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
import numpy as np  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402

RESULTS = "/results"

# Die eingebetteten Computer-Modern-Schriften haben sehr alte Zeitstempel;
# fontTools meldet das bei jedem Einbetten, ohne Folgen für die PDFs.
logging.getLogger("fontTools").setLevel(logging.ERROR)

# Farben (geprüft mit dem Palettenvalidator: Lightness, Chroma, CVD-Abstand,
# Kontrast). Sprache und Transport haben je ein eigenes Paar, damit eine Farbe
# nie zwei Bedeutungen trägt. Anhangsabbildungen (ohne/mit Framework bzw.
# Queue) sind bewusst in Graustufen.
NODE, PHP = "#2a78d6", "#eb6834"
SSE, WS, QUEUE = "#6250d6", "#008300", "#e34948"
INK, INK_2, GRID = "#0b0b0b", "#52514e", "#e4e3df"
GRAY_A, GRAY_B = "#ffffff", "#bdbbb4"

WIDTH = 5.75  # Textbreite der Vorlage in Zoll (A4, 32 mm Rand je Seite)

plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["cmr10", "DejaVu Serif"],
    "mathtext.fontset": "cm",
    "axes.formatter.use_mathtext": True,
    "axes.unicode_minus": False,
    "font.size": 8.5,
    "axes.labelsize": 8.5,
    "axes.titlesize": 8.5,
    "xtick.labelsize": 7.5,
    "ytick.labelsize": 7.5,
    "legend.fontsize": 8,
    "axes.edgecolor": INK_2,
    "axes.labelcolor": INK,
    "xtick.color": INK_2,
    "ytick.color": INK_2,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "axes.grid.axis": "y",
    "grid.color": GRID,
    "grid.linewidth": 0.6,
    "axes.axisbelow": True,
    "lines.linewidth": 1.4,
    "pdf.fonttype": 42,
    "savefig.dpi": 300,
})

SCENARIOS = [("baseline", "10 clients"), ("medium", "50 clients"), ("stress", "500 clients")]

MEASURES = {
    "latency_mean_ms": ("Mean event latency per run (ms)", 1.0),
    "cpu_seconds_total": ("CPU time per run,\nvariant and Redis (s)", 1.0),
    "working_set_peak_bytes_total": ("Peak working set,\nvariant and Redis (MiB)", 1 / 2 ** 20),
    "connect_mean_ms": ("Mean connection\nsetup time per run (ms)", 1.0),
}

# Vergleichsgruppen aus plan.json. Stufe nach DECISIONS.md 5.24.
SETS = [
    {"key": "language", "ids": [1, 2, 3, 4], "tier": "Kern (6.2)", "style": "color",
     "colors": (NODE, PHP), "legend": ("Node.js", "PHP"),
     "labels": {1: "minimal\nSSE", 2: "minimal\nWS", 3: "framework\nSSE", 4: "framework\nWS"}},
    {"key": "transport", "ids": [12, 13], "tier": "Kern (6.3)", "style": "color",
     "colors": (SSE, WS), "legend": ("Server-Sent Events", "WebSocket"),
     "labels": {12: "Node.js\nminimal", 13: "PHP\nminimal"}},
    {"key": "framework", "ids": [5, 6, 7, 8], "tier": "Ergänzung (6.4) bzw. Anhang", "style": "gray",
     "legend": ("minimal implementation", "framework-based implementation"),
     "labels": {5: "Node.js\nSSE", 6: "Node.js\nWS", 7: "PHP\nSSE", 8: "PHP\nWS"}},
    {"key": "queue", "ids": [9, 10], "tier": "Ergänzung (6.4) bzw. Anhang", "style": "gray",
     "legend": ("without queue", "with queue"),
     "labels": {9: "Node.js\n(BullMQ)", 10: "PHP\n(Laravel Queue)"}},
    {"key": "language-queue", "ids": [11], "tier": "Anhang", "style": "color",
     "colors": (NODE, PHP), "legend": ("Node.js", "PHP"),
     "labels": {11: "framework, SSE\nwith queue"}},
]

FAMILIES = [
    ("node-minimal", "Node.js, minimal"),
    ("node-express", "Node.js, Express"),
    ("php-minimal", "PHP, minimal"),
    ("php-laravel", "PHP, Laravel"),
]
SERIES_STYLE = {
    "sse": ("Server-Sent Events", SSE, "-", "o"),
    "ws": ("WebSocket", WS, "--", "^"),
    "sse-queue": ("Server-Sent Events with queue", QUEUE, ":", "s"),
}


def resolve(path):
    """Pfad relativ zum Repository (results/...) oder absolut im Container."""
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


def save(fig, out_dir, name):
    fig.savefig(os.path.join(out_dir, name), metadata={"CreationDate": None, "Creator": None, "Producer": None})
    plt.close(fig)


def style_box(box, color, style, second):
    for patch in box["boxes"]:
        if style == "color":
            patch.set_facecolor(color + "40")
            patch.set_edgecolor(color)
        else:
            patch.set_facecolor(GRAY_B if second else GRAY_A)
            patch.set_edgecolor(INK_2)
        patch.set_linewidth(1.0)
        if second:
            patch.set_hatch("////")
    edge = color if style == "color" else INK_2
    for part in ("whiskers", "caps"):
        for line in box[part]:
            line.set_color(edge)
            line.set_linewidth(1.0)
    for line in box["medians"]:
        line.set_color(INK)
        line.set_linewidth(1.4)
    for flier in box["fliers"]:
        flier.set(marker="o", markersize=2.5, markerfacecolor="none", markeredgecolor=edge, alpha=0.7)


def box_figure(evaluation, measure, spec, out_dir, notes):
    family = next((f for f in evaluation["families"] if f["measure"] == measure), None)
    if family is None:
        notes.append(f"{measure}: keine Familie in evaluation.json")
        return None
    label, scale = MEASURES[measure]
    # Drei Laststufen untereinander, damit die Gruppennamen in einer Zeile Platz haben.
    fig, axes = plt.subplots(3, 1, figsize=(WIDTH, 5.9), constrained_layout=True)
    counts = []
    missing = 0
    for ax, (scenario, title) in zip(axes, SCENARIOS):
        ax.set_title(title, color=INK, loc="left")
        drawn = 0
        for i, cid in enumerate(spec["ids"]):
            test = next((t for t in family["tests"] if t["comparison_id"] == cid and t["scenario"] == scenario), None)
            result = test and test.get("result")
            pairs = result and result.get("pairs")
            if not pairs or not pairs.get("a"):
                ax.text(i, 0.5, "no data", transform=ax.get_xaxis_transform(), ha="center", va="center",
                        color=INK_2, fontsize=7)
                missing += 1
                continue
            drawn += 1
            values = [np.asarray(pairs["a"], dtype=float) * scale, np.asarray(pairs["b"], dtype=float) * scale]
            counts.append(len(values[0]))
            for j, data in enumerate(values):
                pos = i + (-0.19 if j == 0 else 0.19)
                box = ax.boxplot([data], positions=[pos], widths=0.32, patch_artist=True, showfliers=True,
                                 manage_ticks=False)
                color = spec["colors"][j] if spec["style"] == "color" else INK_2
                style_box(box, color, spec["style"], j == 1)
        ax.set_xticks(range(len(spec["ids"])))
        ax.set_xticklabels([spec["labels"][cid].replace(chr(10), ", ") for cid in spec["ids"]])
        ax.set_xlim(-0.6, len(spec["ids"]) - 0.4)
        ax.grid(axis="x", visible=False)
        if drawn == 0:
            ax.set_yticks([])  # leeres Feld ohne bedeutungslose Skala
    fig.supylabel(label.replace(chr(10), " "), fontsize=8.5, color=INK)
    if spec["style"] == "color":
        handles = [Patch(facecolor=c + "40", edgecolor=c, hatch=h, label=l)
                   for c, h, l in zip(spec["colors"], ("", "////"), spec["legend"])]
    else:
        handles = [Patch(facecolor=GRAY_A, edgecolor=INK_2, label=spec["legend"][0]),
                   Patch(facecolor=GRAY_B, edgecolor=INK_2, hatch="////", label=spec["legend"][1])]
    fig.legend(handles=handles, loc="outside upper center", ncol=2, frameon=False)
    name = f"box-{measure.replace('_', '-')}-{spec['key']}.pdf"
    save(fig, out_dir, name)
    n = f"{min(counts)}–{max(counts)}" if counts else "0"
    gaps = f"; ohne Daten: {missing} von {3 * len(spec['ids'])} Gruppen" if missing else ""
    return {"file": name, "tier": spec["tier"],
            "what": f"Boxplots der Lauf-Werte ({measure}) für die Vergleiche {', '.join(map(str, spec['ids']))}, je Laststufe ein Feld; Paare je Vergleich und Stufe: {n}{gaps}"}


def place_labels(ax, items):
    """Direkte Beschriftung am Linienende, vertikal entzerrt."""
    if not items:
        return
    y0, y1 = ax.get_ylim()
    span = y1 - y0 or 1
    items = sorted(items, key=lambda it: it[1])
    min_gap = 0.075 * span
    placed = []
    for x, y, text in items:
        if placed and y - placed[-1][1] < min_gap:
            y = placed[-1][1] + min_gap
        placed.append((x, y, text))
    for x, y, text in placed:
        ax.annotate(text, xy=(x, y), xytext=(4, 0), textcoords="offset points", va="center", ha="left",
                    fontsize=7, color=INK_2, annotation_clip=False)


def scaling_figure(series, metric, out_dir, notes):
    configs = {
        "served": ("served_ratio_median", "Served clients (%)", 100.0, "scaling-served.pdf"),
        "latency": ("latency_mean_median_ms", "Mean event latency (ms)", 1.0, "scaling-latency.pdf"),
        "memory": ("working_set_peak_total_median_bytes", "Peak working set,\nvariant and Redis (MiB)", 1 / 2 ** 20, "scaling-memory.pdf"),
    }
    key, label, scale, name = configs[metric]
    scaling = series.get("scaling", {})
    if not scaling:
        notes.append("series.json: keine Skalierungsreihe")
        return None
    fig, axes = plt.subplots(2, 2, figsize=(WIDTH, 4.1), sharex=True, sharey=True, constrained_layout=True)
    steps_seen = set()
    for ax, (fam, title) in zip(axes.flat, FAMILIES):
        ax.set_title(title, color=INK)
        ends = []
        for suffix, (series_label, color, ls, marker) in SERIES_STYLE.items():
            cell = scaling.get(f"{fam}-{suffix}")
            if not cell:
                continue
            pts = [(s["clients"], s.get(key)) for s in cell["steps"] if s.get(key) is not None]
            if not pts:
                continue
            xs, ys = zip(*pts)
            steps_seen.update(xs)
            ys = [y * scale for y in ys]
            ax.plot(xs, ys, color=color, linestyle=ls, marker=marker, markersize=4, markeredgewidth=0)
            ends.append((xs[-1], ys[-1], {"sse": "SSE", "ws": "WS", "sse-queue": "SSE + queue"}[suffix]))
        if metric == "served":
            ax.axhline(99, color=INK_2, linewidth=0.8, linestyle=(0, (2, 2)))
        if not ends:
            ax.text(0.5, 0.5, "no data", transform=ax.transAxes, ha="center", va="center", color=INK_2, fontsize=7)
        ax._eda_ends = ends  # nach dem Setzen der Achsengrenzen beschriften
    for ax in axes.flat:
        ax.set_xscale("log")
        # 750 nicht beschriften, sonst kollidiert es auf der log-Achse mit 1000.
        ticks = [s for s in (sorted(steps_seen) or [10, 50, 100, 250, 500, 1000]) if s != 750]
        ax.set_xlim(7, 2400)  # Platz rechts für die direkten Beschriftungen
        ax.set_xticks(ticks)
        ax.set_xticklabels([str(t) for t in ticks], rotation=0)
        ax.minorticks_off()
        ax.grid(axis="x", visible=False)
    for ax in axes[1]:
        ax.set_xlabel("Concurrent clients")
    for ax in axes[:, 0]:
        ax.set_ylabel(label)
    if metric == "served":
        axes[0, 0].set_ylim(bottom=max(0, axes[0, 0].get_ylim()[0]), top=101)
        axes[0, 0].annotate("99 % criterion", xy=(1, 99), xycoords=("axes fraction", "data"), xytext=(-2, -9),
                            textcoords="offset points", ha="right", fontsize=7, color=INK_2)
    fig.canvas.draw()
    for ax in axes.flat:
        place_labels(ax, getattr(ax, "_eda_ends", []))
    handles = [Line2D([], [], color=c, linestyle=ls, marker=m, markersize=4, markeredgewidth=0, label=l)
               for l, c, ls, m in SERIES_STYLE.values()]
    fig.legend(handles=handles, loc="outside upper center", ncol=3, frameon=False)
    save(fig, out_dir, name)
    return {"file": name, "tier": "Kern (6.2, 6.3)",
            "what": f"Skalierungsreihe, {label.replace(chr(10), ' ')} über die Clientzahl, je Sprache und Framework-Wahl ein Feld, SSE, WebSocket und SSE mit Queue als Linien"}


def saturation_figure(series, out_dir, notes):
    saturation = series.get("saturation", {})
    if not saturation:
        notes.append("series.json: kein Sättigungstest")
        return None
    top = max((s["rate_per_s"] for c in saturation.values() for s in c["steps"]), default=None)
    fig, ax = plt.subplots(figsize=(WIDTH, 2.6), constrained_layout=True)
    width = 0.26
    for i, (fam, title) in enumerate(FAMILIES):
        for j, suffix in enumerate(("sse", "ws", "sse-queue")):
            cell = saturation.get(f"{fam}-{suffix}")
            if cell is None:
                continue
            series_label, color, _, _ = SERIES_STYLE[suffix]
            value = cell.get("max_sustainable_rate_per_s")
            x = i + (j - 1) * (width + 0.03)
            height = value or 0
            ax.bar(x, height, width=width, color=color + "40", edgecolor=color, linewidth=1.0,
                   hatch=("", "////", "....")[j])
            if value is None:
                text = "none"
            elif top is not None and value >= top:
                text = f"$\\geq${value:g}"
            else:
                text = f"{value:g}"
            ax.annotate(text, xy=(x, height), xytext=(0, 2), textcoords="offset points", ha="center",
                        va="bottom", fontsize=7, color=INK)
    ax.set_xticks(range(len(FAMILIES)))
    ax.set_xticklabels([t for _, t in FAMILIES])
    ax.set_ylabel("Maximum sustainable\nevent rate (events/s)")
    ax.set_ylim(0, (top or 1) * 1.15)
    ax.grid(axis="x", visible=False)
    handles = [Patch(facecolor=c + "40", edgecolor=c, hatch=h, label=l)
               for (l, c, _, _), h in zip(SERIES_STYLE.values(), ("", "////", "...."))]
    fig.legend(handles=handles, loc="outside upper center", ncol=3, frameon=False)
    save(fig, out_dir, "saturation.pdf")
    return {"file": "saturation.pdf", "tier": "Kern (6.3)",
            "what": "Sättigungstest, höchste nachhaltige Event-Rate je Variante; „≥“ bedeutet, dass die höchste getestete Stufe erreicht wurde"}


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
        "Schwerpunkte nach DECISIONS.md 5.24: Kernabbildungen im Text, die übrigen im Anhang.",
        "",
        "| Datei | Stufe | Inhalt |",
        "|---|---|---|",
    ]
    lines += [f"| `{m['file']}` | {m['tier']} | {m['what']} |" for m in made]
    if notes:
        lines += ["", "## Hinweise", ""] + [f"- {n}" for n in notes]
    with open(os.path.join(out_dir, "figures.md"), "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    print(f"Abbildungen: results/{os.path.basename(out_dir)} ({len(made)} Dateien)")
    for n in notes:
        print(f"  Hinweis: {n}")


if __name__ == "__main__":
    main()
