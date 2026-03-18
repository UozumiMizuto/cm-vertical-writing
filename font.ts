/**
 * Font injection utility for cm-vertical-writing.
 *
 * This module provides a function to dynamically inject the pre-rotated
 * STVerticalMincho font into the document via @font-face, so that
 * consumers of the library do not need to manually host or reference the font.
 *
 * The font file (STVerticalMincho.ttf) is shipped alongside this library
 * under dist/fonts/ and loaded via a URL relative to the installed package.
 */

const FONT_FAMILY_NAME = 'STVerticalMincho';
const STYLE_ELEMENT_ID = 'cm-vertical-writing-font';

/**
 * Resolves the URL of the bundled font file relative to the currently
 * executing script, so it works regardless of where the library is installed.
 */
function resolveDefaultFontUrl(): string {
    // In ES module context, import.meta.url points to the current module file.
    // In UMD/CJS context (no import.meta), we fall back to a relative path.
    try {
        // Works in native ESM environments and with bundlers that support import.meta.url
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return new URL(/* @vite-ignore */ './fonts/STVerticalMincho.ttf', import.meta.url).href;
    } catch {
        // Fallback: relative path from the page's base URL
        // This assumes the user hosts the 'fonts' folder at the same level as their JS
        return './fonts/STVerticalMincho.ttf';
    }
}

/**
 * Injects the bundled STVerticalMincho font into the document as a \@font-face rule.
 *
 * Call this once in your application entry point alongside `installPatches()`.
 * After calling this, you can use `'STVerticalMincho'` as the `fontFamily`
 * option in `verticalWriting()`.
 * 
 * For SSR (Next.js, etc.), this function safe-guards against 'document is not defined'.
 *
 * @param fontUrl - Optional custom URL for the font file. If not provided,
 *                  it attempts to resolve the URL relative to the library.
 *
 * @example
 * ```ts
 * import { injectFont, installPatches, verticalWriting } from '@uozumi/cm-vertical-writing';
 *
 * // Automatically resolve font path
 * injectFont();
 * 
 * // OR: Provide a custom path (useful for Next.js /public or CDNs)
 * injectFont('/fonts/STVerticalMincho.ttf');
 *
 * installPatches();
 * ```
 */
export function injectFont(fontUrl?: string): void {
    // SSR Safe-guard: Skip if not in a browser environment
    if (typeof document === 'undefined') {
        return;
    }

    // Avoid injecting multiple times
    if (document.getElementById(STYLE_ELEMENT_ID)) {
        return;
    }

    const url = fontUrl ?? resolveDefaultFontUrl();
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = `
\@font-face {
    font-family: '${FONT_FAMILY_NAME}';
    src: url('${url}') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
}
`;
    document.head.appendChild(style);
}
