/**
 * Coordinate Mapping logic for Vertical Writing (90deg Rotated).
 * This manages the translation between visual coordinates and logical coordinates.
 *
 * CM6 is built for horizontal writing (horizontal-tb). 
 * We rotate the entire editor globally using CSS 'transform: rotate(90deg)'.
 * Browsers return 'visual' coordinates (post-rotation) for DOM queries,
 * but CM6 expects 'logical' coordinates (pre-rotation).
 * 
 * We patch 4 types of global APIs to bridge this gap:
 *  1. Element.prototype.getBoundingClientRect
 *  2. Range.prototype.getBoundingClientRect / getClientRects
 *  3. MouseEvents (mousedown, mousemove, mouseup, click)
 *  4. document.caretRangeFromPoint / caretPositionFromPoint
 */

const WIN = typeof window !== 'undefined' ? window : null;
const DOC = typeof document !== 'undefined' ? document : null;

// Global flag to avoid double patching and double inverse calculation
const PATCHED_KEY = '__CM_VERTICAL_PATCHED__';
const ORIGINALS_KEY = '__CM_VERTICAL_ORIGINALS__';

interface Originals {
    elementGBCR: typeof Element.prototype.getBoundingClientRect;
    rangeGBCR: typeof Range.prototype.getBoundingClientRect;
    rangeGetClientRects: typeof Range.prototype.getClientRects;
    caretRange: typeof document.caretRangeFromPoint | null;
    caretPosition: any | null;
}

// Ensure we only store the "real" originals once globally
if (WIN && !(WIN as any)[ORIGINALS_KEY]) {
    (WIN as any)[ORIGINALS_KEY] = {
        elementGBCR: Element.prototype.getBoundingClientRect,
        rangeGBCR: Range.prototype.getBoundingClientRect,
        rangeGetClientRects: Range.prototype.getClientRects,
        caretRange: DOC?.caretRangeFromPoint ? DOC.caretRangeFromPoint.bind(DOC) : null,
        // @ts-ignore
        caretPosition: DOC?.caretPositionFromPoint ? DOC.caretPositionFromPoint.bind(DOC) : null
    };
}

const originals: Originals = WIN ? (WIN as any)[ORIGINALS_KEY] : {} as any;

let active = false;
let wrapper: HTMLElement | null = null;
let lastVisualX = 0;
let lastVisualY = 0;

/**
 * Calculates the inverse transform matrix for the editor wrapper.
 */
function getInverseMatrix(): DOMMatrix | null {
    if (!wrapper) return null;
    const style = getComputedStyle(wrapper);
    if (!style.transform || style.transform === 'none') return null;
    try {
        return new DOMMatrix(style.transform).inverse();
    } catch {
        return null;
    }
}

/**
 * Gets the transform-origin point (top-left of the wrapper's parent container).
 */
function getOrigin(): { x: number; y: number } | null {
    if (!wrapper?.parentElement) return null;
    const pr = originals.elementGBCR.call(wrapper.parentElement);
    return { x: pr.left, y: pr.top };
}

/**
 * Maps a visual (rotated) rect back to its logical (horizontal) orientation.
 */
function inverseTransformRect(rect: DOMRect): DOMRect {
    const inv = getInverseMatrix();
    const o = getOrigin();
    if (!inv || !o) return rect;

    const corners = [
        { x: rect.left, y: rect.top },
        { x: rect.right, y: rect.top },
        { x: rect.left, y: rect.bottom },
        { x: rect.right, y: rect.bottom },
    ].map(c => {
        const p = inv.transformPoint(new DOMPoint(c.x - o.x, c.y - o.y));
        return { x: p.x + o.x, y: p.y + o.y };
    });

    const x = Math.min(...corners.map(c => c.x));
    const y = Math.min(...corners.map(c => c.y));
    const w = Math.max(...corners.map(c => c.x)) - x;
    const h = Math.max(...corners.map(c => c.y)) - y;

    return new DOMRect(x, y, w, h);
}

/**
 * Maps visual (rotated) screen coordinates back to logical (horizontal) coordinates.
 */
function visualToLogical(vx: number, vy: number): { x: number; y: number } {
    const inv = getInverseMatrix();
    const o = getOrigin();
    if (!inv || !o) return { x: vx, y: vy };
    const p = inv.transformPoint(new DOMPoint(vx - o.x, vy - o.y));
    return { x: p.x + o.x, y: p.y + o.y };
}

/**
 * Capture-phase mouse event handler to re-write cursor coordinates.
 */
function mouseHandler(e: MouseEvent) {
    if (!active || !wrapper) return;

    // Store last known visual coordinates for caretRangeFromPoint patch
    lastVisualX = e.clientX;
    lastVisualY = e.clientY;

    const logical = visualToLogical(e.clientX, e.clientY);

    // Override read-only properties
    Object.defineProperty(e, 'clientX', { value: logical.x, configurable: true });
    Object.defineProperty(e, 'clientY', { value: logical.y, configurable: true });
    Object.defineProperty(e, 'pageX', { value: logical.x + window.scrollX, configurable: true });
    Object.defineProperty(e, 'pageY', { value: logical.y + window.scrollY, configurable: true });
}

/**
 * Global patch installation status.
 */
let installed = false;

/**
 * Installs global patches to redirect coordinate queries through the rotation matrix.
 * Safe to call multiple times (idempotent).
 */
export function installPatches() {
    if (installed || (WIN && (WIN as any)[PATCHED_KEY])) return;
    installed = true;
    if (WIN) (WIN as any)[PATCHED_KEY] = true;

    // 1. Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function (this: Element) {
        const rect = originals.elementGBCR.call(this);
        if (!active || !wrapper || !wrapper.contains(this)) return rect;
        return inverseTransformRect(rect);
    };

    // 2. Range.prototype.getBoundingClientRect/getClientRects
    Range.prototype.getBoundingClientRect = function (this: Range) {
        const rect = originals.rangeGBCR.call(this);
        if (!active || !wrapper) return rect;
        const container = this.commonAncestorContainer;
        const el = container.nodeType === Node.ELEMENT_NODE ? container as Element : container.parentElement;
        if (!el || !wrapper.contains(el)) return rect;
        return inverseTransformRect(rect);
    };

    Range.prototype.getClientRects = function (this: Range) {
        const rects = originals.rangeGetClientRects.call(this);
        if (!active || !wrapper) return rects;
        const container = this.commonAncestorContainer;
        const el = container.nodeType === Node.ELEMENT_NODE ? container as Element : container.parentElement;
        if (!el || !wrapper.contains(el)) return rects;

        const transformed: DOMRect[] = [];
        for (let i = 0; i < rects.length; i++) {
            transformed.push(inverseTransformRect(rects[i]));
        }
        return Object.assign(transformed, {
            item: (index: number) => transformed[index] ?? null,
        }) as unknown as DOMRectList;
    };

    // 3. caretRangeFromPoint / caretPositionFromPoint
    if (DOC && originals.caretRange) {
        document.caretRangeFromPoint = (x: number, y: number) => {
            if (active) return originals.caretRange!(lastVisualX, lastVisualY);
            return originals.caretRange!(x, y);
        };
    }

    if (DOC && originals.caretPosition) {
        // @ts-ignore
        document.caretPositionFromPoint = (x: number, y: number) => {
            if (active) return originals.caretPosition(lastVisualX, lastVisualY);
            return originals.caretPosition(x, y);
        };
    }
}

/**
 * Uninstalls global patches and restores original prototypes.
 */
export function uninstallPatches() {
    if (!installed) return;
    installed = false;
    if (WIN) (WIN as any)[PATCHED_KEY] = false;

    Element.prototype.getBoundingClientRect = originals.elementGBCR;
    Range.prototype.getBoundingClientRect = originals.rangeGBCR;
    Range.prototype.getClientRects = originals.rangeGetClientRects;
    if (DOC && originals.caretRange) document.caretRangeFromPoint = originals.caretRange;
    if (DOC && originals.caretPosition) {
        // @ts-ignore
        document.caretPositionFromPoint = originals.caretPosition;
    }
}

/**
 * Connects the current vertical editor wrapper to the coordinate mapping logic.
 * @param isActive - Set to true to enable coordinate mapping.
 * @param wrapperEl - The element that has the 'rotate(90deg)' transform.
 */
export function setupVertical(isActive: boolean, wrapperEl: HTMLElement | null) {
    active = isActive;
    wrapper = wrapperEl;
}

/**
 * Attaches mouse listeners to a wrapper to capture and transform coordinates in the capture phase.
 * @returns A cleanup function to remove the listeners.
 */
export function attachMouseListeners(wrapperEl: HTMLElement): () => void {
    const events = ['mousedown', 'mousemove', 'mouseup', 'click'] as const;
    events.forEach(ev => wrapperEl.addEventListener(ev, mouseHandler, { capture: true }));
    return () => {
        events.forEach(ev => wrapperEl.removeEventListener(ev, mouseHandler, { capture: true }));
    };
}

/**
 * Helper to get the actual bounding box of an element ignoring the patch.
 * Useful for layout calculations (like syncing container size).
 */
export function getPhysicalRect(el: Element): DOMRect {
    return originals.elementGBCR.call(el);
}

// Alias for getPhysicalRect to match some common naming patterns (like in StoryWritingTool)
export const getOriginalRect = getPhysicalRect;

