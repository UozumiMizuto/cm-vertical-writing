import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

/**
 * Basic theme for vertical writing mode (90deg rotation).
 * 
 * Note: We explicitly avoid setting `writing-mode: vertical-rl` on CodeMirror itself.
 * Browser implementations of vertical-rl often introduce bugs in CodeMirror 6, 
 * such as misaligned cursors, poor scroll performance, and broken viewport calculation.
 * 
 * Instead, we force standard horizontal-tb and rotate the entire editor globally.
 */
export const verticalTheme = (options: { fontFamily?: string, fontSize?: string, textColor?: string } = {}): Extension => {
    return EditorView.theme({
        "&": {
            height: "100%",
            width: "100%",
            fontSize: options.fontSize || "1.1rem",
            backgroundColor: "transparent",
            writingMode: "horizontal-tb", // Forced horizontal context for reliable coordinate logic
        },
        ".cm-scroller": {
            overflowX: "auto",
            overflowY: "auto",
        },
        ".cm-content": {
            padding: "40px",
            minHeight: "100%",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            color: options.textColor || "inherit",
            fontFamily: options.fontFamily || "serif",
        },
        ".cm-cursor": {
            borderLeft: "1.2px solid currentColor",
        }
    });
};
