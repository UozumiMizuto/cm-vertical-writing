import sys
import urllib.request
import os
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen

"""
CodeMirror 6 Vertical Writing Extension: Font Generator
This script modifies a horizontal Japanese font to be 'pre-rotated' 90 degrees left.
Requires: Python 3.6+ and `pip install fonttools`
"""

def generate(base_font_path="ZenOldMincho-Regular.ttf", out_path="STVerticalMincho.ttf"):
    # If font doesn't exist, download Zen Old Mincho (OFL) from Google Fonts repo as sample
    if not os.path.exists(base_font_path):
        print(f"Downloading sample font ({base_font_path})...")
        url = "https://github.com/googlefonts/zen-oldmincho/raw/main/fonts/ttf/ZenOldMincho-Regular.ttf"
        
        # Use open() and urlopen() instead of the deprecated urlretrieve()
        try:
            with urllib.request.urlopen(url) as response, open(base_font_path, 'wb') as f:
                f.write(response.read())
        except Exception as e:
            print(f"Failed to download font: {e}")
            return

    print(f"Loading '{base_font_path}'...")
    font = TTFont(base_font_path)
    glyf = font["glyf"]
    upm = font['head'].unitsPerEm
    os2 = font["OS/2"]
    
    # Use TypoAscender for coordinate reference in rotation
    base_ascender = os2.sTypoAscender 
    print(f"UPM: {upm}, TypoAscender: {base_ascender}")

    # Calculate rotation offsets (to keep glyphs aligned in a 1000x1000 EM box)
    shift_x = base_ascender
    shift_y = base_ascender - upm

    # Common CJK and Japanese Unicode Ranges
    cjk_ranges = [
        (0x3000, 0x303F), (0x3040, 0x309F), (0x30A0, 0x30FF), 
        (0x3400, 0x4DBF), (0x4E00, 0x9FFF), (0xF900, 0xFAFF), 
        (0xFF00, 0xFFEF), (0x2000, 0x206F), (0x2500, 0x257F),
    ]

    def is_cjk(cp):
        return any(start <= cp <= end for start, end in cjk_ranges)

    cmap = font.getBestCmap()
    vert_substs = {}

    # Inspect GSUB for vertical forms (vert / vrt2)
    try:
        gsub = font["GSUB"].table
        for feat in gsub.FeatureList.FeatureRecord:
            if feat.FeatureTag in ["vert", "vrt2"]:
                for idx in feat.Feature.LookupListIndex:
                    lkp = gsub.LookupList.Lookup[idx]
                    for subt in lkp.SubTable:
                        if subt.LookupType == 1:
                            vert_substs.update(subt.mapping)
    except Exception:
        pass

    glyphs_to_process = set()
    for cp, name in cmap.items():
        if is_cjk(cp): glyphs_to_process.add(name)
    for k, v in vert_substs.items():
        if k in glyphs_to_process: glyphs_to_process.add(v)

    print(f"Generating {len(glyphs_to_process)} pre-rotated glyphs...")

    # Transform Matrix: rotate 90deg left (counter-clockwise)
    # x' = -y + shift_x, y' = x + shift_y
    transform = (0, 1, -1, 0, shift_x, shift_y)

    new_glyphs = {}
    for name in list(glyphs_to_process):
        try:
            glyph = glyf[name]
            pen = TTGlyphPen(glyf)
            tpen = TransformPen(pen, transform)
            glyph.draw(tpen, glyf)
            new_glyphs[name] = pen.glyph()
        except Exception:
            new_glyphs[name] = glyf[name]

    # Swap horizontal glyphs with their vertical alternates (if available) for base mapping
    for name in list(glyphs_to_process):
        if name in vert_substs:
            v_name = vert_substs[name]
            glyf[name] = new_glyphs.get(v_name, new_glyphs[name])
        else:
            glyf[name] = new_glyphs[name]

    # Change name to STVerticalMincho (Avoid Reserved Font Name violations)
    font["name"].setName("STVerticalMincho", 1, 3, 1, 1033)
    font["name"].setName("STVerticalMincho", 4, 3, 1, 1033)
    
    font.save(out_path)
    print(f"Done! Created '{out_path}'.")

if __name__ == '__main__':
    generate()
