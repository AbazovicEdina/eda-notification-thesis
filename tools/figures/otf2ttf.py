"""Converts Latin Modern (OpenType with CFF outlines) to TrueType.

matplotlib embeds fonts with pdf.fonttype 42 as TrueType. For CFF fonts
the declared font type would otherwise not match the embedded data, which
PDF/A checks (veraPDF) may flag. The conversion follows the otf2ttf example
of fontTools (cubic to quadratic curves, error at most 1 unit) and runs
once when the image is built.

Usage: python otf2ttf.py <target> <source.otf> ...
"""

import os
import sys

from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable

MAX_ERR = 1.0


def otf_to_ttf(font):
    assert font.sfntVersion == "OTTO" and "CFF " in font
    order = font.getGlyphOrder()
    glyph_set = font.getGlyphSet()
    glyphs = {}
    for name in order:
        tt_pen = TTGlyphPen(glyph_set)
        glyph_set[name].draw(Cu2QuPen(tt_pen, MAX_ERR, reverse_direction=True))
        glyphs[name] = tt_pen.glyph()

    font["loca"] = newTable("loca")
    font["glyf"] = glyf = newTable("glyf")
    glyf.glyphOrder = order
    glyf.glyphs = glyphs
    del font["CFF "]
    if "VORG" in font:
        del font["VORG"]
    glyf.compile(font)

    hmtx = font["hmtx"]
    for name, glyph in glyf.glyphs.items():
        if hasattr(glyph, "xMin"):
            hmtx[name] = (hmtx[name][0], glyph.xMin)

    font["maxp"] = maxp = newTable("maxp")
    maxp.tableVersion = 0x00010000
    maxp.maxZones = 1
    maxp.maxTwilightPoints = 0
    maxp.maxStorage = 0
    maxp.maxFunctionDefs = 0
    maxp.maxInstructionDefs = 0
    maxp.maxStackElements = 0
    maxp.maxSizeOfInstructions = 0
    maxp.maxComponentElements = max(len(getattr(g, "components", []) or []) for g in glyf.glyphs.values())
    maxp.compile(font)

    post = font["post"]
    post.formatType = 2.0
    post.extraNames = []
    post.mapping = {}
    post.glyphOrder = order
    font.sfntVersion = "\000\001\000\000"


def main():
    target, sources = sys.argv[1], sys.argv[2:]
    os.makedirs(target, exist_ok=True)
    for source in sources:
        font = TTFont(source)
        otf_to_ttf(font)
        out = os.path.join(target, os.path.splitext(os.path.basename(source))[0] + ".ttf")
        font.save(out)
        print(f"{source} -> {out}")


if __name__ == "__main__":
    main()
