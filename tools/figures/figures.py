"""Figures for the written thesis (DECISIONS.md 5.24, 5.25).

Reads the overall evaluation (evaluation.json from tools/orchestrate/evaluate.js)
and the evaluation of scaling and saturation (series.json from
tools/orchestrate/series.js) and produces vector PDFs for Overleaf, plus
figures.md with a description of each figure.

Usage in the container (paths relative to the repository or absolute under /results):
    docker compose --profile tools run --rm figures \
        --evaluation results/<timestamp>_evaluation \
        --series results/<timestamp>_series

Output: results/<timestamp>_figures/*.pdf and figures.md. A series.json with
"test_data": true is marked as invented data inside every PDF made from it.

Styled like the TikZ diagrams of the thesis (images/diagram-styles.tex). All
colors come from PALETTE, which holds the same values as that file.

Encoding, the same in every figure:
- Every box plot figure is a grid. Each row is one comparison in the order of
  plan.json, each column one load level, from 10 to 500 clients from left to
  right. In every panel variant A stands left and variant B right, and each
  box is named directly below it.
- The fill of a box is the language of its variant (Node.js green, PHP violet).
- Outline, whiskers and points show what the comparison varies. In a comparison
  of the two languages they have the color of the language. In a comparison
  within one language, variant A keeps the color of its language and variant B
  takes the color of the property it adds or changes (WebSocket petrol,
  framework bronze, queue apricot).
- The line style is the transport (solid SSE, dashed WebSocket), as in the
  diagrams. Dots in the fill mark a variant with a queue, so that it stays
  distinct from Node.js where apricot and green look alike to readers with a
  red-green deficiency.
- Every panel of a box plot has its own y-axis zoomed to its data. It usually does
  not start at zero, because a box plot shows positions and spread, not lengths.
  The size of the differences is shown by the overview figure, on one scale per
  load level around the line of no difference.
- One overview per measure shows all comparisons and load levels as paired
  differences with their intervals. It is made for a landscape page.
- The legend sits above the panels in the same order in every figure, and check_layout reports texts that come too
  close to an edge or overlap.
Font Latin Modern Roman as in the HagenbergThesis template (lmodern, 11 pt), in
the optical sizes LaTeX uses for \\small (10 pt), \\footnotesize (9 pt) and
\\scriptsize (8 pt), embedded as TrueType. The figures are made for the full
text width (\\includegraphics[width=\\textwidth]), the overviews for a landscape
page at their natural size (\\includegraphics without a width), so that these
sizes hold in the thesis. Axis labels are in English, because the thesis is written in
English.
"""

import argparse
import itertools
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
from matplotlib.legend import Legend  # noqa: E402
from matplotlib.legend_handler import HandlerBase, HandlerLine2D  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402
from matplotlib.patches import FancyArrowPatch, Patch, PathPatch  # noqa: E402
from matplotlib.text import Text  # noqa: E402

RESULTS = "/results"

# The Latin Modern fonts carry very old timestamps. fontTools reports this
# on every embedding, without any effect on the PDFs.
logging.getLogger("fontTools").setLevel(logging.ERROR)

# Font of the template. hgbthesis loads lmodern at 11 pt. LaTeX sets \small with
# the 10 pt size, \footnotesize with the 9 pt size and \scriptsize with the 8 pt
# size of Latin Modern Roman. All three files share the same family name, so the
# file is chosen per text by its font size (apply_fonts).
# The files are converted to TrueType when the image is built (otf2ttf.py).
LM_DIR = "/usr/local/share/fonts/lm-ttf"
LM_FILES = {8: f"{LM_DIR}/lmroman8-regular.ttf", 9: f"{LM_DIR}/lmroman9-regular.ttf",
            10: f"{LM_DIR}/lmroman10-regular.ttf"}
for _path in LM_FILES.values():
    font_manager.fontManager.addfont(_path)
# Latin Modern Math for the math symbols (δ, ↑). Its character map assigns the
# glyphs their Unicode code points, so the symbols are copied and found by their
# code point. The BaKoMa fonts of mathtext.fontset "cm" stored δ at the code of "±".
LM_MATH = f"{LM_DIR}/latinmodern-math.ttf"
font_manager.fontManager.addfont(LM_MATH)
SMALL, FOOT, SCRIPT = 10, 9, 8  # \small, \footnotesize and \scriptsize of the template in pt

# Cliff's delta is a statistic, so it is set in italic like a variable, as LaTeX
# sets $\delta$ in the text. U+1D6FF is the mathematical italic small delta of
# Latin Modern Math. mathtext does not find this glyph and falls back to STIX, so
# the whole label "δ = +0.40*" is set as plain text in Latin Modern Math, like a
# formula in math mode (box_figure).
DELTA = "\U0001D6FF"

# Palette of images/diagram-styles.tex (sRGB), fill, line and text per role.
# Any change has to be made in both files (DECISIONS.md 5.25).
PALETTE = {
    "nodejs": ("#CCEDD2", "#5E8E68", "#2E4E35"),
    "php": ("#E4DDFF", "#7B68B5", "#3F3366"),
    "queue": ("#FFD9C8", "#C27A5A", "#6B3A24"),
    "websocket": ("#C1EAFE", "#005F7B", "#003C51"),
    "framework": ("#F2E1BE", "#6C5005", "#463200"),
    "infra": ("#F5F2F0", "#8C8480", "#3F3A37"),
}
FLOW = "#776F73"  # flow-line
INFRA_FILL, INFRA_LINE, INFRA_TEXT = PALETTE["infra"]
GRID = "#DDDAD9"  # infra-line, lightened to 30 %
DASHED = (0, (3, 2))  # ws style of the diagrams, on 3pt off 2pt
DOTTED = (0, (1.5, 1.5))  # lifeline style of the diagrams
QUEUE_HATCH = "...."  # dots for variants with a queue

WIDTH = 5.75  # text width of the template in inches (A4, 32 mm margin per side)
MM = 1 / 25.4  # one millimeter in inches
EDGE = 2.5 * MM  # free space between the content and every edge of a figure

plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["Latin Modern Roman"],
    "mathtext.fontset": "custom",  # δ and ↑ from Latin Modern Math (LM_MATH)
    "mathtext.rm": "Latin Modern Math",
    "mathtext.it": "Latin Modern Math",
    "mathtext.bf": "Latin Modern Math",
    "mathtext.sf": "Latin Modern Math",
    "mathtext.tt": "Latin Modern Math",
    "mathtext.cal": "Latin Modern Math",
    "axes.formatter.use_mathtext": True,
    "axes.unicode_minus": False,
    "font.size": SMALL,
    "axes.labelsize": SMALL,
    "axes.titlesize": SMALL,
    "xtick.labelsize": FOOT,
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
    "hatch.linewidth": 0.6,
    "legend.frameon": False,
    "legend.handlelength": 2.2,
    "legend.handleheight": 1.0,
    "legend.handletextpad": 0.6,
    "legend.columnspacing": 1.6,
    "legend.labelspacing": 0.45,
    "legend.borderaxespad": 0.2,
    "pdf.fonttype": 42,
    "savefig.dpi": 300,
})

SCENARIOS = [("baseline", "10 clients"), ("medium", "50 clients"), ("stress", "500 clients")]

# Axis title of each measure, in two lines, so that it also fits a figure with one row.
MEASURES = {
    "latency_mean_ms": ("Mean event latency\nper run (ms)", 1.0),
    "cpu_seconds_total": ("CPU time per run,\nvariant and Redis (s)", 1.0),
    "working_set_peak_bytes_total": ("Peak working set,\nvariant and Redis (MiB)", 1 / 2 ** 20),
    "connect_mean_ms": ("Mean connection setup\ntime per run (ms)", 1.0),
}


def language_of(cell):
    return "nodejs" if cell.startswith("node-") else "php"


def is_ws(cell):
    return cell.endswith("-ws")


def has_queue(cell):
    return cell.endswith("-queue")


def is_framework(cell):
    return cell.split("-")[1] in ("express", "laravel")


def factor_of(a, b):
    """Role of the property in which the two variants of a comparison differ,
    None for a comparison of the two languages."""
    if language_of(a) != language_of(b):
        return None
    if is_ws(a) != is_ws(b):
        return "websocket"
    if has_queue(a) != has_queue(b):
        return "queue"
    if is_framework(a) != is_framework(b):
        return "framework"
    raise ValueError(f"{a} und {b} unterscheiden sich in keiner bekannten Eigenschaft")


def line_roles(a, b):
    """Color role of outline, whiskers and points of variant A and variant B."""
    return language_of(a), factor_of(a, b) or language_of(b)


FRAMEWORK_NAMES = {"node-minimal": "minimal", "php-minimal": "minimal", "node-express": "Express",
                   "php-laravel": "Laravel"}


def box_name(cell, kind):
    """Name below a box, depending on what the comparisons of a figure vary."""
    if kind == "language":
        return "Node.js" if language_of(cell) == "nodejs" else "PHP"
    if kind == "transport":
        return "WebSocket" if is_ws(cell) else "SSE"
    if kind == "framework":
        return FRAMEWORK_NAMES["-".join(cell.split("-")[:2])]
    return "with\nqueue" if has_queue(cell) else "without\nqueue"


# Comparison groups from plan.json, tier according to DECISIONS.md 5.24.
# "rows" names each comparison above its row, "names" says how the boxes are named.
# Every panel has its own y-axis zoomed to its data, so that the distribution of the
# runs and the overlap of the two variants can be seen (DECISIONS.md 5.25).
SETS = [
    {"key": "language", "ids": [1, 2, 3, 4], "tier": "Anhang, einzelne im Text (5.24)", "names": "language",
     "rows": {1: "Minimal variants, SSE", 2: "Minimal variants, WebSocket",
              3: "Framework-based variants (Express, Laravel), SSE",
              4: "Framework-based variants (Express, Laravel), WebSocket"}},
    {"key": "transport", "ids": [12, 13], "tier": "Anhang, einzelne im Text (5.24)", "names": "transport",
     "rows": {12: "Node.js, minimal variants", 13: "PHP, minimal variants"}},
    {"key": "framework", "ids": [5, 6, 7, 8], "tier": "Anhang, einzelne im Text (5.24)", "names": "framework",
     "rows": {5: "Node.js, SSE", 6: "Node.js, WebSocket", 7: "PHP, SSE", 8: "PHP, WebSocket"}},
    {"key": "queue", "ids": [9, 10], "tier": "Anhang, einzelne im Text (5.24)", "names": "queue",
     "rows": {9: "Node.js, Express, SSE, queue BullMQ", 10: "PHP, Laravel, SSE, queue Laravel Queue"}},
    {"key": "language-queue", "ids": [11], "tier": "Anhang, einzelne im Text (5.24)", "names": "language",
     "rows": {11: "Framework-based variants with queue (BullMQ, Laravel Queue), SSE"}},
]

FACTOR_LABELS = {"websocket": "WebSocket", "framework": "framework-based", "queue": "with queue"}

FAMILIES = [
    ("node-minimal", "Node.js, minimal"),
    ("node-express", "Node.js, Express"),
    ("php-minimal", "PHP, minimal"),
    ("php-laravel", "PHP, Laravel"),
]
# Lines of the scaling series: SSE in the color of the language, WebSocket and the
# queue in the color of the property, as variant B in the box plots.
SERIES_STYLE = {
    "sse": ("SSE", "-", "o"),  # short label at the end of the line
    "ws": ("WS", DASHED, "^"),
    "sse-queue": ("queue", "-", "s"),
}


def series_role(cell_name):
    if cell_name.endswith("-sse-queue"):
        return "queue"
    if cell_name.endswith("-ws"):
        return "websocket"
    return language_of(cell_name)


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
        if not text.get_text() or getattr(text, "_eda_math", False):
            continue
        size = text.get_fontsize()
        design = 8 if size < 8.5 else 9 if size < 9.5 else 10
        text.set_fontproperties(font_manager.FontProperties(fname=LM_FILES[design], size=size))


def hidden_tick_labels(fig):
    """Tick labels that are not drawn: those of switched-off axes and those whose
    tick lies outside the visible range of its axis."""
    hidden = set()
    for ax in fig.axes:
        for axis in (ax.xaxis, ax.yaxis):
            labels = axis.get_majorticklabels() + axis.get_minorticklabels()
            if not ax.axison or not axis.get_visible():
                hidden.update(labels)
                continue
            lo, hi = sorted(axis.get_view_interval())
            span = (hi - lo) * 1e-6
            for loc, label in zip(axis.get_majorticklocs(), axis.get_majorticklabels()):
                if loc < lo - span or loc > hi + span:
                    hidden.add(label)
            hidden.update(axis.get_minorticklabels())
    return hidden


def check_layout(fig, name, notes):
    """Quality check of the rendered figure: every drawn text and every legend entry
    keeps the free space EDGE to all edges, and no two texts overlap."""
    fig.canvas.draw()
    renderer = fig._get_renderer()
    width, height = fig.bbox.width, fig.bbox.height
    edge = EDGE * fig.dpi * 0.9
    problems = []
    hidden = hidden_tick_labels(fig)
    texts = [t for t in fig.findobj(Text) if t.get_visible() and t.get_text().strip() and t not in hidden
             and t.get_alpha() != 0]
    boxes = []
    for t in texts:
        bb = t.get_window_extent(renderer)
        boxes.append((t.get_text().replace("\n", " "), bb))
        if bb.x0 < edge or bb.y0 < edge or bb.x1 > width - edge or bb.y1 > height - edge:
            problems.append(f"zu nah am Rand: „{boxes[-1][0]}“")
    for legend in fig.legends:
        for artist in legend.get_patches() + legend.get_lines():
            bb = artist.get_window_extent(renderer)
            if bb.width and (bb.x0 < edge or bb.x1 > width - edge or bb.y1 > height - edge):
                problems.append("Symbol der Legende zu nah am Rand oder abgeschnitten")
                break
    for (ta, a), (tb, b) in itertools.combinations(boxes, 2):
        if min(a.x1, b.x1) - max(a.x0, b.x0) > 0.5 and min(a.y1, b.y1) - max(a.y0, b.y0) > 0.5:
            problems.append(f"Texte überlappen: „{ta}“ und „{tb}“")
    for p in problems:
        notes.append(f"{name}: {p}")
    return problems


def outer_padding(fig, width, height, w_pad=1.0 * MM, h_pad=1.0 * MM, wspace=0.06, hspace=0.02, left=0.0):
    """Same free space EDGE to every edge of every figure, smaller gaps inside.
    left reserves room (inches) at the left edge for the common y title."""
    ex, ey, lx = EDGE / width, EDGE / height, (EDGE + left) / width
    fig.get_layout_engine().set(w_pad=w_pad, h_pad=h_pad, wspace=wspace, hspace=hspace,
                                rect=(lx, ey, 1 - lx - ex, 1 - 2 * ey))


def y_title(fig, label):
    """Common y title of all panels at the left edge. Returns the width it needs, which
    outer_padding keeps free. save() centers it on the panels."""
    lines = label.count("\n") + 1
    fig._eda_ytitle = fig.text(EDGE / fig.get_figwidth(), 0.5, label, rotation=90, ha="left", va="center",
                               fontsize=SMALL, linespacing=1.15, in_layout=False)
    return lines * SMALL * 1.2 / 72 + 1.5 * MM


def center_y_title(fig):
    title = getattr(fig, "_eda_ytitle", None)
    if title is None:
        return
    fig.canvas.draw()
    panels = [ax.get_position() for ax in fig.axes if ax.axison]
    title.set_y((min(p.y0 for p in panels) + max(p.y1 for p in panels)) / 2)


def thin_tick_labels(ax, axis="y"):
    """Leaves out tick labels that would touch their neighbor, the grid lines stay.
    The highest and the lowest label are always kept."""
    ax.figure.canvas.draw()
    renderer = ax.figure._get_renderer()
    labels = ax.get_yticklabels() if axis == "y" else ax.get_xticklabels()
    shown = [i for i, t in enumerate(labels) if t.get_text()]
    if len(shown) < 3:
        return
    key = (lambda bb: (bb.y0, bb.y1)) if axis == "y" else (lambda bb: (bb.x0, bb.x1))
    spans = {i: key(labels[i].get_window_extent(renderer)) for i in shown}
    order = sorted(shown, key=lambda i: spans[i][0])
    kept = [order[0]]
    for i in order[1:-1]:
        if spans[i][0] - spans[kept[-1]][1] >= 2:
            kept.append(i)
    last = order[-1]
    while len(kept) > 1 and spans[last][0] - spans[kept[-1]][1] < 2:
        kept.pop()
    kept.append(last)
    texts = [t.get_text() if i in kept else "" for i, t in enumerate(labels)]
    (ax.set_yticklabels if axis == "y" else ax.set_xticklabels)(texts)


TEST_DATA = False  # set from series.json, marks every series figure as invented data


def save(fig, out_dir, name, notes):
    apply_fonts(fig)
    center_y_title(fig)
    check_layout(fig, name, notes)
    metadata = {"CreationDate": None, "Creator": None, "Producer": None}
    if TEST_DATA:
        # After the layout check, on purpose: the stamp lies across the content.
        stamp = {"rotation": 22, "ha": "center", "va": "center", "color": PALETTE["queue"][2], "alpha": 0.34, "zorder": 1000}
        fig.text(0.5, 0.57, "TEST DATA", fontproperties=font_manager.FontProperties(fname=LM_FILES[10], size=48), **stamp)
        fig.text(0.54, 0.4, "invented values, not measured", fontproperties=font_manager.FontProperties(fname=LM_FILES[10], size=20), **stamp)
        metadata["Title"] = "TEST DATA, invented values, not measured"
    fig.savefig(os.path.join(out_dir, name), metadata=metadata)
    plt.close(fig)


def swatch(fill, line, linestyle, label, hatch=None):
    patch = Patch(facecolor=fill, edgecolor=line, linestyle=linestyle, linewidth=1.0, label=label, hatch=hatch)
    if hatch:
        patch.set_hatchcolor(PALETTE["queue"][1])
    return patch


def legend_marker(marker, color, label, filled=True, linestyle="none"):
    return Line2D([], [], linestyle=linestyle, marker=marker, markersize=4.5, markeredgewidth=0.8,
                  markerfacecolor=color if filled else "none", markeredgecolor=color, color=color, label=label)


BLANK = Patch(facecolor="none", edgecolor="none", label=" ")


class IntervalKey(Line2D):
    """Legend key of an interval, a line with an end mark on both sides."""


class ArrowKey(Line2D):
    """Legend key of a lower bound, an upward arrow as in the figure."""


class HandlerArrow(HandlerBase):
    def create_artists(self, legend, orig_handle, xdescent, ydescent, width, height, fontsize, trans):
        x = width / 2 - xdescent
        arrow = FancyArrowPatch((x, -ydescent - 0.15 * height), (x, -ydescent + 1.15 * height), arrowstyle="-|>",
                                mutation_scale=6, linewidth=0.7, color=orig_handle.get_color(), shrinkA=0, shrinkB=0,
                                linestyle=orig_handle.get_linestyle(), transform=trans)
        return [arrow]


Legend.update_default_handler_map({IntervalKey: HandlerLine2D(numpoints=2), ArrowKey: HandlerArrow()})


def figure_legend(fig, columns):
    """One legend for every figure, above the panels and centered. Two rows, filled
    column by column, the columns always in the same order: languages, the property a
    comparison varies, the transports, the marks of single runs or limits."""
    rows = max(len(c) for c in columns)
    handles = [h for column in columns for h in (list(column) + [BLANK] * (rows - len(column)))]
    # borderaxespad keeps the free space EDGE to the top edge (10 pt font, 0.8 em = 2.8 mm).
    return fig.legend(handles=handles, loc="outside upper center", ncol=len(columns), borderaxespad=0.8)


def fmt_delta(delta):
    """Cliff's delta with a true minus sign and explicit sign, two decimal places."""
    return f"{delta:+.2f}".replace("-", "−")


BOX_OFFSET, BOX_WIDTH = 0.23, 0.36  # position of the boxes around the panel center, width in data units


def draw_box(ax, x, data, cell, role, rng):
    """One box with its runs. The fill lies below the points, outline, whiskers and
    median above them, so that the dashes of WebSocket stay visible where the points
    cluster."""
    fill = PALETTE[language_of(cell)][0]
    _, line, median = PALETTE[role]
    linestyle = DASHED if is_ws(cell) else "-"
    box = ax.boxplot([data], positions=[x], widths=BOX_WIDTH, patch_artist=True, showfliers=False,
                     manage_ticks=False, whis=1.5)
    for patch in box["boxes"]:
        patch.set_facecolor(fill)
        patch.set_edgecolor("none")
        patch.set_linewidth(0)
        patch.set_zorder(1)
        if has_queue(cell):
            patch.set_hatch(QUEUE_HATCH)
            patch.set_hatchcolor(PALETTE["queue"][1])
        ax.add_patch(PathPatch(patch.get_path(), transform=patch.get_transform(), facecolor="none",
                               edgecolor=line, linewidth=1.0, linestyle=linestyle, zorder=3))
    for part in ("whiskers", "caps"):
        for item in box[part]:
            item.set_color(line)
            item.set_linewidth(1.0)
            item.set_linestyle(linestyle)
            item.set_zorder(3)
    for item in box["medians"]:
        item.set_color(median)
        item.set_linewidth(1.5)
        item.set_zorder(4)
    # Each run as a point, spread horizontally, so that distribution and sample size are visible.
    jitter = rng.uniform(-0.08, 0.08, len(data))
    ax.plot(x + jitter, data, linestyle="none", marker="o", markersize=1.8, markeredgewidth=0,
            color=line, alpha=0.65, zorder=2)


def draw_pair(ax, test, scale, rng):
    """Both boxes of one comparison in one panel. Returns the largest value and the number of runs."""
    result = test and test.get("result")
    pairs = result and result.get("pairs")
    if not pairs or not pairs.get("a"):
        ax.text(0, 0.5, "no data", transform=ax.get_xaxis_transform(), ha="center", va="center",
                color=INFRA_LINE, fontsize=SCRIPT)
        return None, 0
    values = [np.asarray(pairs["a"], dtype=float) * scale, np.asarray(pairs["b"], dtype=float) * scale]
    # Left box variant A, right box variant B of the comparison in plan.json.
    for x, data, cell, role in zip((-BOX_OFFSET, BOX_OFFSET), values, (test["a"], test["b"]),
                                   line_roles(test["a"], test["b"])):
        draw_box(ax, x, data, cell, role, rng)
    ax._eda_low = min(float(np.min(v)) for v in values)
    return max(float(np.max(v)) for v in values), len(values[0])


def box_legend(fig, comparisons):
    """Legend columns of a box plot figure, from the comparisons it shows."""
    cells = [c for cmp in comparisons for c in (cmp["a"], cmp["b"])]
    columns = [[swatch(PALETTE["nodejs"][0], PALETTE["nodejs"][1], "-", "Node.js"),
                swatch(PALETTE["php"][0], PALETTE["php"][1], "-", "PHP")]]
    factors = {factor_of(c["a"], c["b"]) for c in comparisons} - {None}
    factor_column = []
    for factor in ("websocket", "framework", "queue"):
        if factor in factors:
            factor_column.append(swatch("white", PALETTE[factor][1], DASHED if factor == "websocket" else "-",
                                        FACTOR_LABELS[factor], QUEUE_HATCH if factor == "queue" else None))
    if "queue" not in factors and any(has_queue(c) for c in cells):
        factor_column.append(swatch("white", INFRA_LINE, "-", "with queue", QUEUE_HATCH))
    if factor_column:
        columns.append(factor_column)
    if "websocket" not in factors and any(is_ws(c) for c in cells) and any(not is_ws(c) for c in cells):
        columns.append([swatch("white", INFRA_LINE, "-", "SSE"), swatch("white", INFRA_LINE, DASHED, "WebSocket")])
    columns.append([legend_marker("o", INFRA_LINE, "one run")])
    figure_legend(fig, columns)


def axis_sentence(zero_axes, drawn_axes):
    """What the y-axes of this figure really do, zoomed axes can reach zero."""
    if zero_axes == 0:
        return "Jedes Feld hat eine eigene, auf seine Daten gezoomte y-Achse, die nicht bei null beginnt."
    if zero_axes == drawn_axes:
        return "Jedes Feld hat eine eigene y-Achse. Sie beginnt hier in allen Feldern bei null, weil die beiden Varianten eines Paars weit auseinanderliegen."
    return f"Jedes Feld hat eine eigene, auf seine Daten gezoomte y-Achse. Sie beginnt in {zero_axes} von {drawn_axes} Feldern bei null, in den übrigen nicht."


def box_caption(label, n, alpha, zero_axes, drawn_axes):
    """Text for figures.md, everything the caption has to explain."""
    return (f"Jede Zeile ist ein Vergleich, jede Spalte eine Laststufe. Die Box zeigt den Interquartilsabstand, die "
            "Linie den Median, die Antennen höchstens das 1,5-Fache des Interquartilsabstands und die Punkte die "
            f"einzelnen Läufe (n = {n} je Box), horizontal zufällig gestreut. "
            "Links steht Variante A, rechts Variante B des Vergleichs aus plan.json, unter jeder Box ihr Name. "
            "δ ist Cliff's Delta von A gegenüber B (positiv, wenn A höher liegt), * kennzeichnet einen Unterschied, "
            f"der nach Holm-Korrektur in Block 1 bei α = {alpha:g} signifikant ist. "
            f"Die y-Achse zeigt „{label.replace(chr(10), ' ')}“. {axis_sentence(zero_axes, drawn_axes)} "
            "Höhen sind nur innerhalb eines Feldes vergleichbar, die Größe der Unterschiede zeigt die Übersicht. "
            "Die Füllung zeigt die Sprache (Node.js grün, PHP violett). Umrandung und Punkte zeigen, was der "
            "Vergleich ändert. Bei Vergleichen innerhalb einer Sprache trägt Variante B die Farbe der geänderten "
            "Eigenschaft (WebSocket petrol, Framework bronze, Queue apricot). Gestrichelt ist WebSocket, "
            "durchgezogen SSE, gepunktet gefüllt sind Varianten mit Queue. Die Legende über den Feldern erklärt "
            "Farben, Linienart und Muster.")


HEAD, PLOT, LEGEND = 0.2, 1.2, 0.5  # heights of a header line, a panel and the legend in inches


def box_figure(evaluation, measure, spec, out_dir, notes, extra):
    family = next((f for f in evaluation["families"] if f["measure"] == measure), None)
    if family is None:
        notes.append(f"{measure}: keine Familie in evaluation.json")
        return None
    label, scale = MEASURES[measure]
    plan_cmp = {c["id"]: c for c in (evaluation.get("plan") or {}).get("comparisons", [])}
    comparisons = []
    for cid in spec["ids"]:
        test = next((t for t in family["tests"] if t["comparison_id"] == cid), None)
        comparisons.append(plan_cmp.get(cid) or test)
    name_lines = max(box_name(c[k], spec["names"]).count("\n") + 1 for c in comparisons for k in ("a", "b"))
    # Same seed for every figure, so the jitter of the points is identical on every re-evaluation.
    rng = np.random.default_rng(1)
    rows = len(spec["ids"])
    # Every row has the same height: header line, panel, names below the boxes, gap.
    names_h = 0.16 * name_lines + 0.08
    height = 2 * EDGE + LEGEND + HEAD + rows * (HEAD + PLOT + names_h + 0.1)
    fig = plt.figure(figsize=(WIDTH, height), layout="constrained")
    outer_padding(fig, WIDTH, height, wspace=0.07, hspace=0.09, left=y_title(fig, label))
    gs = fig.add_gridspec(rows, 3)
    axes = [[fig.add_subplot(gs[r, col]) for col in range(3)] for r in range(rows)]
    for r, cid in enumerate(spec["ids"]):
        # The header of a row stands where the title of its first panel would. It stays out of
        # the layout, so that a long header does not widen the first column, and may run on
        # above the next panels. An invisible title in every panel reserves its height.
        axes[r][0].annotate(spec["rows"][cid], xy=(0, 1), xycoords="axes fraction", xytext=(0, 7),
                            textcoords="offset points", ha="left", va="baseline", fontsize=SMALL,
                            annotation_clip=False).set_in_layout(False)
        for ax in axes[r]:
            ax.set_title("Ag", loc="center", fontsize=SMALL, pad=7, alpha=0)
    # Load levels once above the grid, above the header of the first row.
    for col, (_, title) in enumerate(SCENARIOS):
        axes[0][col].annotate(title, xy=(0.5, 1), xycoords="axes fraction", xytext=(0, 22),
                              textcoords="offset points", ha="center", va="bottom", fontsize=SMALL)
    counts, missing = [], 0
    tops = np.zeros((rows, 3))
    deltas = {}
    for r, cid in enumerate(spec["ids"]):
        cmp = comparisons[r]
        for col, (scenario, _) in enumerate(SCENARIOS):
            ax = axes[r][col]
            test = next((t for t in family["tests"] if t["comparison_id"] == cid and t["scenario"] == scenario), None)
            high, runs = draw_pair(ax, test, scale, rng)
            ax.set_xticks([-BOX_OFFSET, BOX_OFFSET])
            ax.set_xticklabels([box_name(cmp["a"], spec["names"]), box_name(cmp["b"], spec["names"])],
                               linespacing=1.0)
            ax.tick_params(axis="x", length=2.5, pad=2.5)
            ax.set_xlim(-0.5, 0.5)
            ax.grid(axis="x", visible=False)
            if high is None:
                missing += 1
                ax.set_yticks([])  # empty panel without a meaningless scale
                continue
            counts.append(runs)
            tops[r, col] = high
            if test["result"].get("cliffs_delta") is not None:
                deltas[(r, col)] = (test["result"]["cliffs_delta"], bool(test.get("significant")))
    # Own axis per panel, zoomed to the data. The lower limit is clipped at zero, and the
    # caption says in how many panels that happens.
    zero_axes, drawn_axes = 0, 0
    for r in range(rows):
        for col in range(3):
            top = tops[r, col]
            if top <= 0:
                continue
            ax = axes[r][col]
            low = ax._eda_low
            span = (top - low) or (top * 0.05)
            lower = max(0.0, low - 0.12 * span)
            drawn_axes += 1
            zero_axes += lower == 0.0
            ax.set_ylim(lower, top + 0.42 * span)
            ax.yaxis.set_major_locator(matplotlib.ticker.MaxNLocator(nbins=4))
            if (r, col) in deltas:
                delta, significant = deltas[(r, col)]
                text = ax.text(0, top + 0.17 * span, f"{DELTA} = {fmt_delta(delta)}{'*' if significant else ''}",
                               ha="center", va="bottom", color=INFRA_TEXT,
                               fontproperties=font_manager.FontProperties(fname=LM_MATH, size=FOOT),
                               bbox={"facecolor": "white", "edgecolor": "none", "pad": 0.8})
                text._eda_math = True  # keeps Latin Modern Math (apply_fonts)
    box_legend(fig, comparisons)
    name = f"box-{measure.replace('_', '-')}-{spec['key']}.pdf"
    save(fig, out_dir, name, notes)
    n = "0" if not counts else str(min(counts)) if min(counts) == max(counts) else f"{min(counts)}–{max(counts)}"
    gaps = f", ohne Daten {missing} von {3 * rows} Feldern" if missing else ""
    alpha = (evaluation.get("plan") or {}).get("alpha", 0.05)
    caption = box_caption(label, n, alpha, zero_axes, drawn_axes)
    if name in extra:
        caption += f" Zusätzlich zu erklären. {extra[name]}"
    groups = ", ".join(
        f"Zeile {r + 1} „{spec['rows'][cid]}“ Vergleich {cid}"
        + (f" ({plan_cmp[cid]['a']} links, {plan_cmp[cid]['b']} rechts)" if cid in plan_cmp else "")
        for r, cid in enumerate(spec["ids"]))
    return {"file": name, "tier": spec["tier"], "caption": caption,
            "what": f"Boxplots der Lauf-Werte ({measure}) für die Vergleiche {', '.join(map(str, spec['ids']))}, "
                    f"je Vergleich eine Zeile und je Laststufe eine Spalte, Paare je Feld {n}{gaps}. {groups}"}


# Overview of the differences (DECISIONS.md 5.24, 5.25). One figure per measure with all
# comparisons, in the order of plan.json, grouped by what they vary.
OVERVIEW_GROUPS = [
    ("Node.js − PHP", [(1, "minimal, SSE"), (2, "minimal, WebSocket"), (3, "framework, SSE"), (4, "framework, WebSocket")]),
    ("minimal − framework", [(5, "Node.js, SSE"), (6, "Node.js, WebSocket"), (7, "PHP, SSE"), (8, "PHP, WebSocket")]),
    ("without − with queue", [(9, "Node.js"), (10, "PHP")]),
    ("Node.js − PHP, with queue", [(11, "framework, SSE")]),
    ("SSE − WebSocket", [(12, "Node.js, minimal"), (13, "PHP, minimal")]),
]
OVERVIEW_UNITS = {
    "latency_mean_ms": ("Event latency", "ms", 1.0, 2),
    "cpu_seconds_total": ("CPU time", "s", 1.0, 3),
    "working_set_peak_bytes_total": ("Working set", "MiB", 1 / 2 ** 20, 1),
    "connect_mean_ms": ("Connection setup", "ms", 1.0, 2),
}


# The overview is meant for a landscape page, 215 mm wide at its natural size. The panels
# are then almost twice as wide as on a portrait page, which the narrow intervals need.
OVERVIEW_WIDTH, OVERVIEW_ROW, OVERVIEW_CHROME = 215 * MM, 0.16, 1.62


OVERVIEW_ENGLISH = {
    "latency_mean_ms": "Mean event latency per run",
    "cpu_seconds_total": "CPU time per run (variant and Redis)",
    "working_set_peak_bytes_total": "Peak working set (variant and Redis)",
    "connect_mean_ms": "Mean connection setup time per run",
}


def fmt_de(value, digits):
    return f"{value:.{digits}f}".replace(".", ",")


def overview_figure(evaluation, family, out_dir, notes):
    """Median of the paired differences A - B with its 95 % bootstrap interval. Filled means
    significant in the Wilcoxon test after Holm, a ring marks a different sign test decision."""
    measure = family["measure"]
    quantity, unit, scale, digits = OVERVIEW_UNITS[measure]
    plan_cmp = {c["id"]: c for c in evaluation["plan"]["comparisons"]}
    block = next((b for b in evaluation.get("sensitivity", []) if b["block"] == family["block"]), None)
    if block is None:
        notes.append(f"{measure}: keine Sensitivitätsanalyse in evaluation.json, Abweichungen zum Vorzeichentest nicht markiert")
    sens = next((f for f in block["families"] if f["measure"] == measure), None) if block else None
    differs = {(r["comparison_id"], r["scenario"]) for r in (sens["rows"] if sens else [])
               if r.get("sign_test") and r["wilcoxon_significant"] != r["sign_significant"]}
    ypos, heads, seps, ticks, y = {}, [], [], [], 0.0
    for name, rows in OVERVIEW_GROUPS:
        heads.append((name, y))
        y += 1.0
        for cid, text in rows:
            ypos[cid] = y
            ticks.append((y, text))
            y += 1.0
        seps.append(y - 0.15)
        y += 0.3
    width, height = OVERVIEW_WIDTH, OVERVIEW_CHROME + OVERVIEW_ROW * y
    fig, axes = plt.subplots(1, 3, figsize=(width, height), sharey=True, layout="constrained")
    outer_padding(fig, width, height, wspace=0.05)
    drawn_ring = False
    widest, steps, diverging, disagreeing, resamples = {}, {}, [], [], None
    for col, (scenario, title) in enumerate(SCENARIOS):
        ax = axes[col]
        ax.set_title(title, fontsize=SMALL, pad=15)
        # The zero line lies below everything and stays thin, so that points close to it stay visible.
        ax.axvline(0, color=INFRA_LINE, linewidth=0.6, zorder=1)
        ax.grid(axis="y", visible=False)
        ax.grid(axis="x", visible=True)
        for sep in seps[:-1]:
            ax.axhline(sep, color=GRID, linewidth=0.5, zorder=0)
        ends = [0.0]
        for t in family["tests"]:
            if t["scenario"] != scenario:
                continue
            res = t.get("result")
            if not res or res.get("median_diff") is None or None in res["median_diff_ci95"]:
                notes.append(f"{measure}: Vergleich {t['comparison_id']}, {scenario} ohne Intervall")
                continue
            resamples = (res.get("bootstrap") or {}).get("resamples", resamples)
            yy = ypos[t["comparison_id"]]
            cmp = plan_cmp[t["comparison_id"]]
            role = factor_of(cmp["a"], cmp["b"])
            color = PALETTE[role][1] if role else INFRA_TEXT
            lo, hi = (v * scale for v in res["median_diff_ci95"])
            ends += [lo, hi]
            widest[scenario] = max(widest.get(scenario, 0.0), hi - lo)
            md = res["median_diff"] * scale
            significant = bool(t.get("significant"))
            excludes_zero = lo > 0 or hi < 0
            if excludes_zero != significant:
                disagreeing.append((t["comparison_id"], title.split()[0]))
                diverging.append(f"Vergleich {t['comparison_id']} bei {title.replace('clients', 'Clients')} "
                                 + ("(Intervall ohne 0, Test nicht signifikant)" if excludes_zero else "(Intervall berührt 0, Test signifikant)"))
            # Thin end marks reaching far beyond the point: two end marks stay apart from about
            # 0.25 mm on, and the point in front of them hides neither.
            ax.plot([lo, hi], [yy, yy], color=color, linewidth=0.7, solid_capstyle="butt", zorder=3)
            for end in (lo, hi):
                ax.plot([end, end], [yy - 0.38, yy + 0.38], color=color, linewidth=0.55, solid_capstyle="butt", zorder=3)
            ax.plot(md, yy, marker="o", markersize=3.4, linestyle="none", zorder=4,
                    markerfacecolor=color if significant else "white", markeredgecolor=color, markeredgewidth=0.7)
            if (t["comparison_id"], scenario) in differs:
                drawn_ring = True
                ax.plot(md, yy, marker="o", markersize=8.5, linestyle="none", zorder=5, markerfacecolor="none",
                        markeredgecolor=INFRA_TEXT, markeredgewidth=0.7, clip_on=False)
        # Free space on both sides, so that no point sits on the edge of a panel.
        low, high = min(ends), max(ends)
        pad = 0.09 * ((high - low) or 1.0)
        ax.set_xlim(low - pad, high + pad)
        ax.set_ylim(y - 0.5, -0.7)
        ax.tick_params(axis="x", labelsize=FOOT)
        ax.tick_params(axis="y", length=0)
        ax.locator_params(axis="x", nbins=4)
        inside = [t for t in ax.get_xticks() if low - pad <= t <= high + pad]
        steps[scenario] = round(float(inside[1] - inside[0]), 10)
        ax.annotate(f"x-axis step {steps[scenario]:g} {unit}", xy=(0.5, 1), xycoords="axes fraction", xytext=(0, 3),
                    textcoords="offset points", ha="center", va="bottom", fontsize=FOOT)
    axes[0].set_yticks([t[0] for t in ticks])
    axes[0].set_yticklabels([t[1] for t in ticks], fontsize=FOOT)
    for name, yh in heads:
        axes[0].annotate(name, xy=(0, yh), xycoords=("axes fraction", "data"), xytext=(-4, 0), textcoords="offset points",
                         ha="right", va="center", fontsize=SMALL, annotation_clip=False)
    axes[1].set_xlabel(f"{quantity}, median of the paired differences A − B ({unit})\n"
                       "Left of 0 the first named variant is lower. Each column has its own x-axis.\n"
                       "Filled or open follows the test, not the interval.", fontsize=SMALL, linespacing=1.15)
    interval = [IntervalKey([], [], color=INFRA_TEXT, linewidth=0.8, marker="|", markersize=7, markeredgewidth=0.7,
                            label="95 % bootstrap interval of the median, not Holm-corrected")]
    if drawn_ring:
        interval.append(Line2D([], [], linestyle="none", marker="o", markersize=8, markerfacecolor="none",
                               markeredgecolor=INFRA_TEXT, markeredgewidth=0.7, label="sign test decides differently"))
    figure_legend(fig, [[legend_marker("o", INFRA_TEXT, "significant (Wilcoxon, Holm)"),
                         legend_marker("o", INFRA_TEXT, "not significant", filled=False)], interval])
    name = f"overview-{measure.replace('_', '-')}.pdf"
    save(fig, out_dir, name, notes)
    alpha = (evaluation.get("plan") or {}).get("alpha", 0.05)
    long_name = MEASURES[measure][0].replace("\n", " ")
    widths = ", ".join(f"{fmt_de(widest[sc], digits)} {unit} bei {title.replace('clients', 'Clients')}" for sc, title in SCENARIOS if sc in widest)
    caption = (f"Messgröße ist {long_name}. Punkt ist der Median der gepaarten Differenzen A − B, nicht die Differenz der Gruppenmediane. "
               f"Das 95-%-Bootstrap-Intervall dieses Medians (Perzentilmethode, {resamples} Stichproben) gilt je Test und ist nicht nach Holm korrigiert. "
               f"Gefüllt heißt signifikant im Wilcoxon-Test nach Holm über {family.get('m', 39)} Tests. Der Test wertet die Ränge aller Differenzen aus, das Intervall nur ihren Median. "
               "Das Intervall ist deshalb keine Signifikanzentscheidung. "
               + (f"Beide laufen in {'einem Test' if len(diverging) == 1 else str(len(diverging)) + ' Tests'} auseinander, " + " und ".join(diverging) + ". " if diverging else "Beide laufen in keinem Test auseinander. ")
               + f"Breitestes Intervall {widths}. Jede Spalte hat eine eigene x-Achse."
               + (f" Ein Ring markiert {len(differs)} Tests mit abweichendem Vorzeichentest (DECISIONS.md 5.8)." if differs else ""))
    english_widths = " and ".join(filter(None, [", ".join(f"{widest[sc]:.{digits}f}" for sc, _ in SCENARIOS[:-1]), f"{widest[SCENARIOS[-1][0]]:.{digits}f}~{unit}"]))
    disagree = " and ".join(f"comparison~{cid} at {load}~clients" for cid, load in disagreeing)
    caption_en = (f"{OVERVIEW_ENGLISH[measure]} in Block~{family['block']}. Points show the median of the paired differences $A - B$, bars its 95\\% percentile bootstrap interval, "
                  "which holds per test, is not Holm-corrected and is no significance decision. "
                  f"Filled points are significant in the Wilcoxon signed-rank test after Holm correction over {family.get('m', 39)}~tests ($\\alpha = {alpha:g}$). "
                  + ("Rings mark a different sign test decision. " if differs else "")
                  + (f"Interval and test differ for {disagree}. " if disagree else "")
                  + f"Widest interval per column {english_widths}.")
    return {"file": name, "tier": "Kern (6.2, 6.3, 6.4)", "caption": caption, "caption_en": caption_en,
            "what": f"Übersicht aller 13 Vergleiche und 3 Laststufen für {measure}, Median der gepaarten Differenzen mit 95-%-Intervall, Block {family['block']}, Querformat, natürliche Größe 215 mm breit"}


# Detail to the flat boxes of the working set: every run as its deviation from the median
# of its own campaign, so that spread can be seen without breaking an axis.
SPREAD_CELLS = [
    ("node-minimal-sse", "Node.js, minimal, SSE"), ("node-minimal-ws", "Node.js, minimal, WebSocket"),
    ("node-express-sse", "Node.js, Express, SSE"), ("node-express-ws", "Node.js, Express, WebSocket"),
    ("node-express-sse-queue", "Node.js, Express, SSE, queue"),
    ("php-minimal-sse", "PHP, minimal, SSE"), ("php-minimal-ws", "PHP, minimal, WebSocket"),
    ("php-laravel-sse", "PHP, Laravel, SSE"), ("php-laravel-ws", "PHP, Laravel, WebSocket"),
    ("php-laravel-sse-queue", "PHP, Laravel, SSE, queue"),
]


def spread_figure(evaluation, measure, out_dir, notes):
    family = next((f for f in evaluation["families"] if f["measure"] == measure), None)
    if family is None:
        return None
    _, scale = MEASURES[measure]
    data = {}
    for t in family["tests"]:
        pairs = (t.get("result") or {}).get("pairs")
        if not pairs:
            continue
        for key in ("a", "b"):
            values = np.asarray(pairs[key], dtype=float) * scale
            data.setdefault((t[key], t["scenario"]), []).append(values - np.median(values))
    ypos, y = {}, 0.0
    for i, (cell, _) in enumerate(SPREAD_CELLS):
        if i == 5:
            y += 0.45
        ypos[cell] = y
        y += 1.0
    height = 1.5 + 0.195 * y
    fig, axes = plt.subplots(1, 3, figsize=(WIDTH, height), sharey=True, sharex=True, layout="constrained")
    outer_padding(fig, WIDTH, height, wspace=0.05)
    rng = np.random.default_rng(1)
    limit, runs = 0.0, set()
    for col, (scenario, title) in enumerate(SCENARIOS):
        ax = axes[col]
        ax.set_title(title, fontsize=SMALL)
        ax.axvline(0, color=INFRA_LINE, linewidth=0.6, zorder=1)
        ax.grid(axis="y", visible=False)
        ax.grid(axis="x", visible=True)
        for cell, _ in SPREAD_CELLS:
            parts = data.get((cell, scenario))
            if not parts:
                notes.append(f"Streuung {measure}: keine Daten für {cell}, {scenario}")
                continue
            values = np.concatenate(parts)
            runs.add(len(values))
            limit = max(limit, float(np.max(np.abs(values))))
            yy = ypos[cell]
            lang = language_of(cell)
            fill, line, median = PALETTE[lang]
            linestyle = DASHED if is_ws(cell) else "-"
            box = ax.boxplot([values], positions=[yy], widths=0.62, patch_artist=True, showfliers=False, manage_ticks=False,
                             whis=1.5, orientation="horizontal")
            for patch in box["boxes"]:
                patch.set_facecolor(fill)
                patch.set_edgecolor("none")
                patch.set_linewidth(0)
                patch.set_zorder(1)
                if has_queue(cell):
                    patch.set_hatch(QUEUE_HATCH)
                    patch.set_hatchcolor(PALETTE["queue"][1])
                ax.add_patch(PathPatch(patch.get_path(), transform=patch.get_transform(), facecolor="none", edgecolor=line,
                                       linewidth=0.8, linestyle=linestyle, zorder=3))
            for part in ("whiskers", "caps"):
                for item in box[part]:
                    item.set_color(line)
                    item.set_linewidth(0.8)
                    item.set_linestyle(linestyle)
                    item.set_zorder(3)
            for item in box["medians"]:
                item.set_color(median)
                item.set_linewidth(1.2)
                item.set_zorder(4)
            ax.plot(values, yy + rng.uniform(-0.26, 0.26, len(values)), linestyle="none", marker="o", markersize=1.5, markeredgewidth=0,
                    color=line, alpha=0.55, zorder=2)
        ax.set_ylim(y - 0.4, -0.6)
        ax.tick_params(axis="x", labelsize=SCRIPT)
        ax.tick_params(axis="y", length=0)
    for ax in axes:
        ax.set_xlim(-limit * 1.08, limit * 1.08)
    axes[0].set_yticks([ypos[c] for c, _ in SPREAD_CELLS])
    axes[0].set_yticklabels([t for _, t in SPREAD_CELLS], fontsize=FOOT)
    axes[1].set_xlabel("Deviation of each run from the median of its campaign (MiB)\nNo absolute memory values, 0 is the median of each campaign", fontsize=SMALL, linespacing=1.15)
    figure_legend(fig, [[swatch(PALETTE["nodejs"][0], PALETTE["nodejs"][1], "-", "Node.js"), swatch(PALETTE["php"][0], PALETTE["php"][1], "-", "PHP")],
                        [swatch("white", INFRA_LINE, "-", "SSE"), swatch("white", INFRA_LINE, DASHED, "WebSocket")],
                        [swatch("white", PALETTE["queue"][1], "-", "with queue", hatch=QUEUE_HATCH), legend_marker("o", INFRA_TEXT, "one run")]])
    name = f"spread-{measure.replace('_', '-')}.pdf"
    save(fig, out_dir, name, notes)
    caption = ("Ergänzung zu den Boxplots des Working Set, in denen die Boxen flach sind, wenn sich zwei Varianten eines Paars stark unterscheiden. "
               "Gezeigt sind Abweichungen vom Median der eigenen Kampagne, keine absoluten Speicherwerte. Die Lage der Varianten zeigt die Übersicht. "
               f"Alle Felder teilen sich eine x-Achse ohne Unterbrechung. Je Box {min(runs)} bis {max(runs)} Läufe aus allen Kampagnen der Variante.")
    caption_en = (f"Spread of the peak working set (variant and Redis) in Block~{family['block']}. Each run is shown as its deviation from the median of its own campaign, "
                  "so the values are deviations and not absolute memory values. "
                  f"All panels share one unbroken $x$-axis. Each box pools {min(runs)} to {max(runs)}~runs from all campaigns of the variant.")
    return {"file": name, "tier": "Anhang, Ergänzung", "caption": caption, "caption_en": caption_en,
            "what": "Streuung des Working Set je Variante und Laststufe, Abstand zum Median der eigenen Kampagne"}


def place_labels(ax, items, log=False):
    """Direct labels at the end of each line, spread vertically so they do not overlap."""
    if not items:
        return
    to_axis = np.log10 if log else (lambda v: v)
    from_axis = (lambda v: 10 ** v) if log else (lambda v: v)
    y0, y1 = (to_axis(v) for v in ax.get_ylim())
    span = y1 - y0 or 1
    items = sorted(((x, to_axis(y), text, color) for x, y, text, color in items), key=lambda it: it[1])
    min_gap = 0.1 * span
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


def series_legend(fig, extra):
    columns = [[legend_marker("o", PALETTE["nodejs"][1], "SSE, Node.js", linestyle="-"),
                legend_marker("o", PALETTE["php"][1], "SSE, PHP", linestyle="-")],
               [Line2D([], [], color=PALETTE["websocket"][1], linestyle=DASHED, marker="^", markersize=4.5,
                       markeredgewidth=0, label="WebSocket"),
                legend_marker("s", PALETTE["queue"][1], "SSE with queue", linestyle="-")]]
    columns.append(extra)
    figure_legend(fig, columns)


def scaling_figure(series, metric, out_dir, notes):
    # Measure, axis title, factor, file, fields of the range (run.js, scalingSummary)
    configs = {
        "served": ("served_ratio_median", "Served clients (%)", 100.0, "scaling-served.pdf",
                   ("served_ratio_min", "served_ratio_max")),
        "latency": ("latency_mean_median_ms", "Mean event latency (ms)", 1.0, "scaling-latency.pdf",
                    ("latency_mean_min_ms", "latency_mean_max_ms")),
        "memory": ("working_set_peak_total_median_bytes", "Peak working set, variant\nand Redis (MiB)", 1 / 2 ** 20,
                   "scaling-memory.pdf", ("working_set_peak_total_min_bytes", "working_set_peak_total_max_bytes")),
    }
    key, label, scale, name, (key_min, key_max) = configs[metric]
    scaling = series.get("scaling", {})
    if not scaling:
        notes.append("series.json: keine Skalierungsreihe")
        return None
    fig, axes = plt.subplots(2, 2, figsize=(WIDTH, 5.4), sharex=True, sharey=True, layout="constrained")
    outer_padding(fig, WIDTH, 5.4, wspace=0.06, hspace=0.06)
    steps_seen, values, runs = set(), [], set()
    has_range = False
    for ax, (fam, title) in zip(axes.flat, FAMILIES):
        ax.set_title(title, loc="left")
        ends = []
        for suffix, (short, ls, marker) in SERIES_STYLE.items():
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
            _, line, text = PALETTE[series_role(cell_name)]
            ax.plot(xs, ys, color=line, linestyle=ls, marker=marker, markersize=3.8, markeredgewidth=0)
            if all(s.get(key_min) is not None and s.get(key_max) is not None for s in steps):
                has_range = True
                lo = [y - s[key_min] * scale for y, s in zip(ys, steps)]
                hi = [s[key_max] * scale - y for y, s in zip(ys, steps)]
                ax.errorbar(xs, ys, yerr=[lo, hi], fmt="none", ecolor=line, elinewidth=0.6, capsize=1.8,
                            capthick=0.6)
            ends.append((xs[-1], ys[-1], short, text))
        if metric == "served":
            ax.axhline(99, color=FLOW, linewidth=0.6, linestyle=DOTTED)
        if not ends:
            ax.text(0.5, 0.5, "no data", transform=ax.transAxes, ha="center", va="center", color=INFRA_LINE,
                    fontsize=SCRIPT)
        ax._eda_ends = ends  # label after the axis limits are set
    # Logarithmic y axis if the values span more than a factor of 20, otherwise the frugal
    # variants would not be readable on the shared axis.
    positive = [v for v in values if v > 0]
    log_y = metric != "served" and positive and max(positive) / min(positive) > 20
    all_steps = sorted(steps_seen) or [10, 50, 100, 250, 500, 1000]
    for ax in axes.flat:
        ax.set_xscale("log")
        if log_y:
            ax.set_yscale("log")
            ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:g}"))
            ax.yaxis.set_minor_formatter(matplotlib.ticker.NullFormatter())
        ax.set_xlim(7, 2900)  # room on the right for the direct labels
        # Every level gets a tick. 750 has no number, otherwise it collides with 1000.
        ax.set_xticks(all_steps)
        ax.set_xticklabels(["" if s == 750 else str(s) for s in all_steps], rotation=0, fontsize=SCRIPT)
        ax.xaxis.set_minor_locator(matplotlib.ticker.NullLocator())
        ax.grid(axis="x", visible=False)
    for ax in axes[1]:
        ax.set_xlabel("Concurrent clients")
    # One y title for both rows, as in the box plots, the note on the log scale in its last line.
    title = label + ((", log scale" if "\n" in label else "\nlog scale") if log_y else "")
    outer_padding(fig, WIDTH, 5.4, wspace=0.06, hspace=0.06, left=y_title(fig, title))
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
    extra = []
    if has_range:
        extra.append(Line2D([], [], color=INFRA_LINE, linestyle="none", marker="|", markersize=7,
                            markeredgewidth=0.8, label="smallest to largest run"))
    if metric == "served":
        extra.append(Line2D([], [], color=FLOW, linestyle=DOTTED, linewidth=0.8, label="99 % criterion"))
    series_legend(fig, extra or [BLANK])
    thin_tick_labels(axes[1, 0], "x")  # the panels share the x axis and its labels
    save(fig, out_dir, name, notes)
    n = "–".join(str(r) for r in sorted({min(runs), max(runs)})) if runs else "unbekannt"
    caption = (f"Punkte und Linien: Median über n = {n} Läufe je Stufe"
               + (", Fehlerbalken: kleinster bis größter Lauf" if has_range else ", ohne Fehlerbalken (keine Spannweite in series.json)")
               + (". y-Achse logarithmisch." if log_y else ".")
               + " SSE in der Farbe der Sprache, WebSocket petrol und gestrichelt, SSE mit Queue apricot."
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

    def row_of(cell):
        if cell.get("max_sustainable_rate_per_s") is not None:
            return None
        return "not_evaluable" if cell.get("limit") == "loadgen" else "none"

    # A variant without a value has no position on the rate axis. It gets a row of its own
    # below the axis, which carries no scale and names its meaning.
    present = {row_of(c) for c in saturation.values()} - {None}
    rows = [r for r in ("none", "not_evaluable") if r in present]
    row_labels = {"none": "none sustained", "not_evaluable": "not evaluable"}
    strip_height = 0.22 * len(rows) + 0.08 if rows else 0.0
    height = 3.4 + strip_height
    if rows:
        fig, (ax, strip) = plt.subplots(2, 1, figsize=(WIDTH, height), sharex=True, layout="constrained",
                                        height_ratios=[2.0, strip_height])
    else:
        fig, ax = plt.subplots(figsize=(WIDTH, height), layout="constrained")
        strip = None
    outer_padding(fig, WIDTH, height, hspace=0.01)
    offsets = {"sse": -0.22, "ws": 0.0, "sse-queue": 0.22}
    marks = set()
    for i, (fam, _) in enumerate(FAMILIES):
        for suffix in ("sse", "ws", "sse-queue"):
            cell_name = f"{fam}-{suffix}"
            cell = saturation.get(cell_name)
            if cell is None:
                continue
            _, line, text = PALETTE[series_role(cell_name)]
            marker = SERIES_STYLE[suffix][2]
            value = cell.get("max_sustainable_rate_per_s")
            x = i + offsets[suffix]
            row = row_of(cell)
            if row is not None:
                strip.plot(x, rows.index(row), linestyle="none", marker=marker, markersize=5.5, markerfacecolor="none",
                           markeredgecolor=line, markeredgewidth=0.9, clip_on=False)
                marks.add("empty")
                continue
            ax.plot(x, value, linestyle="none", marker=marker, markersize=5.5, color=line, markeredgewidth=0)
            # A value that is only a lower bound gets an upward arrow. Solid: all levels passed.
            # Dashed: the series ended at a level the load generator could not serve.
            limit = cell.get("limit")
            bounded_by_load = limit == "loadgen"
            passed_all = limit == "highest_rate" or (limit is None and value >= top)
            if bounded_by_load or passed_all:
                marks.add("loadgen" if bounded_by_load else "highest")
                ax.annotate("", xy=(x, value * 1.85), xytext=(x, value * 1.14),
                            arrowprops={"arrowstyle": "-|>", "color": text, "linewidth": 0.7, "mutation_scale": 6,
                                        "shrinkA": 0, "shrinkB": 0, "linestyle": DASHED if bounded_by_load else "-"})
    ax.set_yscale("log")
    if rates:
        ax.set_yticks(rates)
        ax.set_yticklabels([f"{r:g}" for r in rates])
        ax.yaxis.set_minor_locator(matplotlib.ticker.NullLocator())
        ax.set_ylim(rates[0] / 1.25, top * 2.2)
    ax.set_xlim(-0.6, len(FAMILIES) - 0.4)
    ax.set_ylabel("Maximum sustainable\nevent rate (events/s)")
    ax.grid(axis="x", visible=False)
    bottom = strip if strip is not None else ax
    if strip is not None:
        ax.tick_params(axis="x", length=0, labelbottom=False)
        ax.spines["bottom"].set_visible(False)
        strip.set_facecolor(INFRA_FILL)
        strip.set_ylim(len(rows) - 0.5, -0.5)
        strip.set_yticks(range(len(rows)))
        strip.set_yticklabels([row_labels[r] for r in rows], fontsize=FOOT)
        strip.tick_params(axis="y", length=0)
        strip.grid(False)
    bottom.set_xticks(range(len(FAMILIES)))
    bottom.set_xticklabels([t for _, t in FAMILIES])
    bottom.tick_params(axis="x", labelsize=FOOT)
    columns = [[legend_marker("o", PALETTE["nodejs"][1], "SSE, Node.js"),
                legend_marker("o", PALETTE["php"][1], "SSE, PHP")],
               [legend_marker("^", PALETTE["websocket"][1], "WebSocket"),
                legend_marker("s", PALETTE["queue"][1], "SSE with queue")],
               []]
    arrow = lambda linestyle, label: ArrowKey([], [], color=FLOW, linestyle=linestyle, label=label)
    if "highest" in marks:
        columns[2].append(arrow("-", "at least, all rates sustained"))
    if "loadgen" in marks:
        columns[2].append(arrow(DASHED, "at least, load generator limit"))
    if "empty" in marks:
        columns[2].append(legend_marker("o", FLOW, "no rate, see the lowest rows", filled=False))
    figure_legend(fig, [c for c in columns if c])
    # Every tested rate keeps its grid line, labels that would touch their neighbor are left out.
    thin_tick_labels(ax)
    save(fig, out_dir, "saturation.pdf", notes)
    crit = next(iter(saturation.values())).get("criteria") or {}
    rule = ""
    if crit.get("minDeliveryRatio") is not None and crit.get("maxP95LatencyMs") is not None:
        rule = (f" Nachhaltig: mindestens {crit['minDeliveryRatio'] * 100:g} % zugestellte Events und p95-Latenz "
                f"höchstens {crit['maxP95LatencyMs']:g} ms auf dieser und allen niedrigeren Stufen.")
    caption = ("Gefülltes Symbol: höchste getestete Event-Rate, die eine Variante nachhaltig zustellt. y-Achse logarithmisch, "
               "waagrechte Linien bei den getesteten Stufen. Durchgezogener Pfeil nach oben: alle Stufen bestanden, die Grenze liegt mindestens beim gezeigten Wert. "
               "Gestrichelter Pfeil nach oben: die Reihe endete an einer Stufe, auf der der Lastgenerator über 80 % ausgelastet war, die Grenze liegt mindestens beim gezeigten Wert. "
               "Die Zeilen unter der Achse haben keine Skala und zeigen keinen Messwert. Offenes Symbol in der Zeile none sustained: schon die niedrigste getestete Stufe wurde nicht bestanden. "
               "Offenes Symbol in der Zeile not evaluable: schon die niedrigste Stufe ließ sich wegen des Lastgenerators nicht auswerten." + rule + " SSE in der Farbe der Sprache, "
               "WebSocket petrol, SSE mit Queue apricot, dazu je Transport ein eigenes Symbol.")
    return {"file": "saturation.pdf", "tier": "Kern (6.3)", "caption": caption,
            "what": "Sättigungstest, höchste nachhaltige Event-Rate je Variante"}


def main():
    global TEST_DATA
    parser = argparse.ArgumentParser(description="Abbildungen für die schriftliche Arbeit")
    parser.add_argument("--evaluation", help="Verzeichnis mit evaluation.json")
    parser.add_argument("--series", help="Verzeichnis mit series.json")
    parser.add_argument("--note", action="append", default=[], metavar="DATEI=TEXT",
                        help="zusätzlicher Hinweis für die Bildunterschrift einer Abbildung, mehrfach möglich")
    args = parser.parse_args()
    if not args.evaluation and not args.series:
        parser.error("mindestens --evaluation oder --series angeben")
    extra = {}
    for note in args.note:
        file, sep, text = note.partition("=")
        if not sep or not text.strip():
            parser.error(f"--note braucht die Form DATEI=TEXT, nicht {note!r}")
        extra[file.strip()] = text.strip()

    evaluation = load(resolve(args.evaluation), "evaluation.json")
    series = load(resolve(args.series), "series.json")
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%f")[:-3] + "Z"
    out_dir = os.path.join(RESULTS, f"{stamp}_figures")
    os.makedirs(out_dir, exist_ok=True)

    notes, made = [], []
    if evaluation:
        for family in evaluation["families"]:
            made.append(overview_figure(evaluation, family, out_dir, notes))
        entry = spread_figure(evaluation, "working_set_peak_bytes_total", out_dir, notes)
        if entry:
            made.append(entry)
        for spec in SETS:
            for measure in MEASURES:
                entry = box_figure(evaluation, measure, spec, out_dir, notes, extra)
                if entry:
                    made.append(entry)
    if series:
        TEST_DATA = bool(series.get("test_data"))
        if TEST_DATA:
            notes.append("series.json trägt test_data, Skalierung und Sättigung zeigen ERFUNDENE Testdaten")
        for metric in ("served", "latency", "memory"):
            entry = scaling_figure(series, metric, out_dir, notes)
            if entry:
                made.append(entry)
        entry = saturation_figure(series, out_dir, notes)
        if entry:
            made.append(entry)

    palette = ", ".join(f"{role} (Füllung {fill}, Linie {line}, Text {text})" for role, (fill, line, text) in PALETTE.items())
    lines = [
        "# Abbildungen",
        "",
        f"Erzeugt: {stamp}. Quellen: {args.evaluation or '–'} (evaluation.json), {args.series or '–'} (series.json).",
        "",
        "Vektor-PDFs für den Ordner `images/` im Overleaf-Projekt, eingebunden mit `\\includegraphics[width=\\textwidth]{<datei ohne .pdf>}`. Die vier Übersichten stehen auf einer Querformatseite in natürlicher Größe, also ohne `width`. Sonst stimmen die Schriftgrößen nicht.",
        f"Farben wie in images/diagram-styles.tex. {palette}.",
        "Die Füllung einer Box zeigt die Sprache, Umrandung und Punkte zeigen, was ein Vergleich ändert. Durchgezogen umrandet Server-Sent Events, gestrichelt WebSocket, gepunktet gefüllt Varianten mit Queue.",
        "Schwerpunkte nach DECISIONS.md 5.24: Kernabbildungen im Text, die übrigen im Anhang.",
        "Die Spalte „Für die Bildunterschrift“ nennt, was die Unterschrift erklären muss, damit die Abbildung ohne den Fließtext lesbar ist.",
        "",
        "| Datei | Stufe | Inhalt | Für die Bildunterschrift |",
        "|---|---|---|---|",
    ]
    lines += [f"| `{m['file']}` | {m['tier']} | {m['what']} | {m['caption']} |" for m in made]
    english = [m for m in made if m.get("caption_en")]
    if english:
        lines += ["", "## Vorschläge für die Bildunterschriften", ""]
        lines += [f"- `{m['file']}`: {m['caption_en']}" for m in english]
    if notes:
        lines += ["", "## Hinweise", ""] + [f"- {n}" for n in notes]
    with open(os.path.join(out_dir, "figures.md"), "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    print(f"Abbildungen: results/{os.path.basename(out_dir)} ({len(made)} Dateien)")
    for n in notes:
        print(f"  Hinweis: {n}")


if __name__ == "__main__":
    main()
