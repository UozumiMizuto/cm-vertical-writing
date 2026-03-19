import { type Extension } from "@codemirror/state";
import {
    installPatches,
    setupVertical,
    attachMouseListeners,
    getPhysicalRect,
    getOriginalRect,
    uninstallPatches
} from "./core";
import { tcy } from "./tcy";
import { ruby } from "./ruby";
import { verticalTheme } from "./theme";
import { injectFont } from "./font";

// Exporting types and core functions
export {
    installPatches,
    setupVertical,
    attachMouseListeners,
    getPhysicalRect,
    getOriginalRect,
    uninstallPatches
};
export { tcy, ruby };
export { injectFont };

export interface VerticalWritingOptions {
    /** 
     * Font family for the editor. 
     * IMPORTANT: This should be a 'pre-rotated' font (where glyphs are rotated 90deg left).
     */
    fontFamily: string;
    fontSize?: string;
    textColor?: string;
    tcy?: boolean;
    ruby?: boolean;
}

/**
 * Entry point for the Vertical Writing library (CodeMirror 6 Extension).
 * 
 * This library implements vertical writing by:
 * 1. Forcing `horizontal-tb` mode inside CodeMirror.
 * 2. Rotating the entire editor wrapper 90deg using CSS `transform`.
 * 3. Re-mapping coordinate systems using global patches (core.ts).
 */
export function verticalWriting(options: VerticalWritingOptions): Extension {
    const extensions: Extension[] = [
        verticalTheme({
            fontFamily: options.fontFamily,
            fontSize: options.fontSize,
            textColor: options.textColor
        }),
    ];

    if (options.tcy !== false) extensions.push(tcy);
    if (options.ruby !== false) extensions.push(ruby);

    return extensions;
}
