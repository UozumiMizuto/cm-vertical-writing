import { ViewPlugin, Decoration, type DecorationSet, ViewUpdate, EditorView } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

/**
 * Tate-chu-yoko (Horizontal-in-Vertical)
 * Improvements: 
 * - Use lookaround (if supported) or specific boundary checks to handle Japanese text without \b.
 * - Targets: 2 digits (10-99), 2 characters, or 1-2 punctuation marks. 
 *   1-digit/1-char is usually rotated naturally by the vertical font, so we skip them.
 */
export const tateChuYokoPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDeco(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = this.buildDeco(update.view);
        }
    }

    buildDeco(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        const { selection } = view.state;
        const mark = Decoration.mark({ class: "cm-tcy" });

        // Match 2 digits, 2 Latin chars, or 1-2 punctuation marks (!, ?)
        const regex = /(?<![A-Za-z0-9])([A-Za-z0-9]{2}|[!?]{1,2})(?![A-Za-z0-9])/g;

        for (const { from, to } of view.visibleRanges) {
            let pos = from;
            while (pos <= to) {
                const line = view.state.doc.lineAt(pos);
                const text = line.text;
                let match;

                const offset = Math.max(0, from - line.from);
                const endOffset = Math.min(line.length, to - line.from);

                regex.lastIndex = offset;
                while ((match = regex.exec(text)) !== null) {
                    if (match.index >= endOffset) break;
                    const start = line.from + match.index;
                    const end = start + match[0].length;

                    // COORDINATE STABILITY FIX:
                    // Avoid splitting DOM inside line if selection intersects.
                    // This follows the rule: "Don't divide DOM nodes in ways that break coordinate mapping".
                    const isInside = selection.ranges.some(r => r.from <= end && r.to >= start);
                    if (!isInside) {
                        builder.add(start, end, mark);
                    }
                }
                pos = line.to + 1;
            }
        }
        return builder.finish();
    }
}, {
    decorations: v => v.decorations
});

export const tcyTheme = EditorView.baseTheme({
    ".cm-tcy": {
        display: "inline-block",
        transform: "rotate(-90deg)",
        transformOrigin: "center center",
        lineHeight: "1",
        margin: "0 2px"
    }
});

export const tcy = [tateChuYokoPlugin, tcyTheme];
