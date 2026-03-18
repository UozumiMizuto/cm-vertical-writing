import sys
import urllib.request
import os
import argparse
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen

"""
CodeMirror 6 Vertical Writing Extension: Font Generator CLI
This script modifies a horizontal Japanese font to be 'pre-rotated' 90 degrees left.
Requires: Python 3.6+ and `pip install fonttools`
"""

def is_cjk(cp):
    # Common CJK and Japanese Unicode Ranges
    cjk_ranges = [
        (0x3000, 0x303F), (0x3040, 0x309F), (0x30A0, 0x30FF), 
        (0x3400, 0x4DBF), (0x4E00, 0x9FFF), (0xF900, 0xFAFF), 
        (0xFF00, 0xFFEF), (0x2000, 0x206F), (0x2500, 0x257F),
    ]
    return any(start <= cp <= end for start, end in cjk_ranges)

def generate(input_path, output_path, force=False):
    # If font doesn't exist, download Zen Old Mincho (OFL) from Google Fonts repo as sample
    if not os.path.exists(input_path) and input_path == "ZenOldMincho-Regular.ttf":
        print(f"Downloading sample font ({input_path})...")
        url = "https://github.com/googlefonts/zen-oldmincho/raw/main/fonts/ttf/ZenOldMincho-Regular.ttf"
        try:
            with urllib.request.urlopen(url) as response, open(input_path, 'wb') as f:
                f.write(response.read())
        except Exception as e:
            print(f"Error: Failed to download font: {e}")
            sys.exit(1)
    elif not os.path.exists(input_path):
        print(f"Error: Input file '{input_path}' not found.")
        sys.exit(1)

    try:
        font = TTFont(input_path)
    except Exception as e:
        print(f"Error: Failed to load font: {e}")
        sys.exit(1)

    glyf = font["glyf"]
    upm = font['head'].unitsPerEm
    os2 = font["OS/2"]
    base_ascender = os2.sTypoAscender 
    cmap = font.getBestCmap()

    # Identify CJK glyphs
    glyphs_to_process = set()
    for cp, name in cmap.items():
        if is_cjk(cp): glyphs_to_process.add(name)

    # Inspect GSUB for vertical forms (vert / vrt2)
    vert_substs = {}
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

    for k, v in vert_substs.items():
        if k in glyphs_to_process: glyphs_to_process.add(v)

    # Summary and Confirmation
    print("-" * 30)
    print(f"Input:  {input_path}")
    print(f"Output: {output_path}")
    print(f"Glyphs: CJK + Hiragana + Katakana (estimated ~{len(glyphs_to_process)} glyphs)")
    print("-" * 30)

    if not force:
        choice = input("Proceed? [y/N] ").lower()
        if choice != 'y':
            print("Aborted.")
            sys.exit(0)

    # Coordinate transformation: rotate 90deg left (counter-clockwise)
    shift_x = base_ascender
    shift_y = base_ascender - upm
    transform = (0, 1, -1, 0, shift_x, shift_y)

    success_count = 0
    skip_count = 0
    new_glyphs = {}

    print(f"Processing {len(glyphs_to_process)} glyphs...")
    for name in list(glyphs_to_process):
        try:
            glyph = glyf[name]
            pen = TTGlyphPen(glyf)
            tpen = TransformPen(pen, transform)
            glyph.draw(tpen, glyf)
            new_glyphs[name] = pen.glyph()
            success_count += 1
        except Exception:
            new_glyphs[name] = glyf[name]
            skip_count += 1

    # Apply modified glyphs
    for name in list(glyphs_to_process):
        if name in vert_substs:
            v_name = vert_substs[name]
            glyf[name] = new_glyphs.get(v_name, new_glyphs[name])
        else:
            glyf[name] = new_glyphs[name]

    # Change name to STVerticalMincho
    font["name"].setName("STVerticalMincho", 1, 3, 1, 1033)
    font["name"].setName("STVerticalMincho", 4, 3, 1, 1033)
    
    font.save(output_path)
    
    print(f"[OK] {success_count} glyphs converted")
    if skip_count > 0:
        print(f"[!] {skip_count} glyphs skipped (composite/empty)")
    print(f"Done! -> {output_path}")

def main():
    parser = argparse.ArgumentParser(
        description="Generate a 'pre-rotated' vertical font for CodeMirror 6 Vertical Writing Extension."
    )
    parser.add_argument("--input", "-i", type=str, default="ZenOldMincho-Regular.ttf", help="Path to the input horizontal TTF font.")
    parser.add_argument("--output", "-o", type=str, default="STVerticalMincho.ttf", help="Path for the generated vertical TTF font.")
    parser.add_argument("--yes", "-y", action="store_true", help="Skip confirmation prompt.")

    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(0)

    args = parser.parse_args()
    generate(args.input, args.output, force=args.yes)

if __name__ == '__main__':
    main()
