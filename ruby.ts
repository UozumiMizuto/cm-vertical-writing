import {
    Decoration,
    type DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder, type Extension } from "@codemirror/state";

/**
 * Ruby Widget (Replaces text with <ruby> tag)
 */
class RubyWidget extends WidgetType {
    readonly baseText: string;
    readonly rubyText: string;

    constructor(base: string, ruby: string) {
        super();
        this.baseText = base;
        this.rubyText = ruby;
    }

    toDOM() {
        const ruby = document.createElement("ruby");
        ruby.textContent = this.baseText;
        const rt = document.createElement("rt");
        rt.textContent = this.rubyText;
        ruby.appendChild(rt);
        return ruby;
    }

    ignoreEvent() {
        return false;
    }
}

// 1. Aozora style: |Base《Ruby》
const AOZORA_RUBY_REGEX = /\|([^《]+)《([^》]+)》/g;
// 2. Narou style (Kanji only): Kanji《Ruby》
const NAROU_RUBY_REGEX = /([一-龠々〆ヵヶ]+)《([^》]+)》/g;
// 3. Emphasis: 《《Text》》
const EMPHASIS_REGEX = /《《([^》]+)》》/g;

/**
 * Support for Aozora/Narou style ruby and emphasis dots.
 * Processed line by line within visible ranges for performance.
 */
const rubyViewPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.buildDeco(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = this.buildDeco(update.view);
            }
        }

        buildDeco(view: EditorView) {
            const builder = new RangeSetBuilder<Decoration>();
            const { selection } = view.state;
            const selectionRanges = selection.ranges;

            for (const { from, to } of view.visibleRanges) {
                let pos = from;
                while (pos <= to) {
                    const line = view.state.doc.lineAt(pos);
                    const text = line.text;
                    const matches: { from: number; to: number; type: 'ruby' | 'emphasis'; data?: { base: string; ruby: string } }[] = [];

                    // 1. AOZORA
                    AOZORA_RUBY_REGEX.lastIndex = 0;
                    let m;
                    while ((m = AOZORA_RUBY_REGEX.exec(text)) !== null) {
                        matches.push({
                            from: line.from + m.index,
                            to: line.from + m.index + m[0].length,
                            type: 'ruby',
                            data: { base: m[1], ruby: m[2] }
                        });
                    }

                    // 2. NAROU
                    NAROU_RUBY_REGEX.lastIndex = 0;
                    while ((m = NAROU_RUBY_REGEX.exec(text)) !== null) {
                        const start = line.from + m.index;
                        const end = start + m[0].length;
                        if (!matches.some(existing => (start < existing.to && end > existing.from))) {
                            matches.push({
                                from: start,
                                to: end,
                                type: 'ruby',
                                data: { base: m[1], ruby: m[2] }
                            });
                        }
                    }

                    // 3. EMPHASIS
                    EMPHASIS_REGEX.lastIndex = 0;
                    while ((m = EMPHASIS_REGEX.exec(text)) !== null) {
                        matches.push({
                            from: line.from + m.index,
                            to: line.from + m.index + m[0].length,
                            type: 'emphasis'
                        });
                    }

                    matches.sort((a, b) => a.from - b.from);

                    for (const match of matches) {
                        const isCursorInside = selectionRanges.some(r => r.from <= match.to && r.to >= match.from);
                        if (isCursorInside) continue;

                        if (match.type === 'ruby' && match.data) {
                            builder.add(match.from, match.to, Decoration.replace({ widget: new RubyWidget(match.data.base, match.data.ruby) }));
                        } else if (match.type === 'emphasis') {
                            builder.add(match.from, match.from + 2, Decoration.replace({}));
                            builder.add(match.from + 2, match.to - 2, Decoration.mark({ class: "cm-emphasis" }));
                            builder.add(match.to - 2, match.to, Decoration.replace({}));
                        }
                    }
                    pos = line.to + 1;
                }
            }

            return builder.finish();
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);

export const rubyTheme = EditorView.baseTheme({
    "ruby": {
        position: "relative",
        display: "inline-flex",
        flexDirection: "column-reverse",
        verticalAlign: "bottom",
    },
    ".cm-emphasis": {
        textEmphasis: "filled dot",
        "-webkit-text-emphasis": "filled dot",
        textEmphasisPosition: "over right",
        "-webkit-text-emphasis-position": "over right",
    }
});

export const ruby: Extension = [rubyViewPlugin, rubyTheme];
