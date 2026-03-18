/**
 * Coordinate Mapping logic for Vertical Writing (90deg Rotated).
 * This manages the translation between visual coordinates and logical coordinates.
 */

// Store original implementations to restore later and for internal use
// We use a global variable to ensure we don't save already-patched versions
const WIN = typeof window !== 'undefined' ? window : null;
const DOC = typeof document !== 'undefined' ? document : null;

// @ts-ignore
const _originals = WIN?.__CM_VERTICAL_ORIGINALS__ || {
    elementGBCR: Element.prototype.getBoundingClientRect,
    rangeGBCR: Range.prototype.getBoundingClientRect,
    rangeGetClientRects: Range.prototype.getClientRects,
    caretRange: DOC?.caretRangeFromPoint ? DOC.caretRangeFromPoint.bind(DOC) : null,
    // @ts-ignore
    caretPosition: DOC?.caretPositionFromPoint ? DOC.caretPositionFromPoint.bind(DOC) : null
};

if (WIN && !(WIN as any).__CM_VERTICAL_ORIGINALS__) {
    (WIN as any).__CM_VERTICAL_ORIGINALS__ = _originals;
}

const originals = _originals;

let active = false;
let wrapper: HTMLElement | null = null;
let lastVisualX = 0;
let lastVisualY = 0;

function getInverseMatrix(): DOMMatrix | null {
    if (!wrapper) return null;
    const style = getComputedStyle(wrapper);
    if (!style.transform || style.transform === 'none') return null;
    return new DOMMatrix(style.transform).inverse();
}

function getOrigin(): { x: number; y: number } | null {
    if (!wrapper?.parentElement) return null;
    // We expect the parent to be the container that defines the 0,0 for transform origin (top left)
    const pr = originals.elementGBCR.call(wrapper.parentElement);
    return { x: pr.left, y: pr.top };
}

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

function visualToLogical(vx: number, vy: number): { x: number; y: number } {
    const inv = getInverseMatrix();
    const o = getOrigin();
    if (!inv || !o) return { x: vx, y: vy };
    const p = inv.transformPoint(new DOMPoint(vx - o.x, vy - o.y));
    return { x: p.x + o.x, y: p.y + o.y };
}

function mouseHandler(e: MouseEvent) {
    if (!active || !wrapper) return;
    lastVisualX = e.clientX;
    lastVisualY = e.clientY;
    const logical = visualToLogical(e.clientX, e.clientY);

    Object.defineProperty(e, 'clientX', { value: logical.x, configurable: true });
    Object.defineProperty(e, 'clientY', { value: logical.y, configurable: true });
    Object.defineProperty(e, 'pageX', { value: logical.x + window.scrollX, configurable: true });
    Object.defineProperty(e, 'pageY', { value: logical.y + window.scrollY, configurable: true });
}

let installed = false;

/**
 * Installs global patches to redirect coordinate queries through the rotation matrix.
 */
export function installPatches() {
    if (installed) return;
    installed = true;

    Element.prototype.getBoundingClientRect = function (this: Element) {
        const rect = originals.elementGBCR.call(this);
        if (!active || !wrapper || !wrapper.contains(this)) return rect;
        return inverseTransformRect(rect);
    };

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
        for (let i = 0; i < rects.length; i++) transformed.push(inverseTransformRect(rects[i]));
        return Object.assign(transformed, {
            item: (index: number) => transformed[index] ?? null,
        }) as unknown as DOMRectList;
    };

    if (originals.caretRange) {
        document.caretRangeFromPoint = (x: number, y: number) => {
            if (active && originals.caretRange) return originals.caretRange(lastVisualX, lastVisualY);
            return originals.caretRange ? originals.caretRange(x, y) : null;
        };
    }

    if (originals.caretPosition) {
        // @ts-ignore
        document.caretPositionFromPoint = (x: number, y: number) => {
            // @ts-ignore
            if (active && originals.caretPosition) return originals.caretPosition(lastVisualX, lastVisualY);
            // @ts-ignore
            return originals.caretPosition ? originals.caretPosition(x, y) : null;
        };
    }
}

/**
 * Uninstalls global patches and restores original prototypes.
 */
export function uninstallPatches() {
    if (!installed) return;
    installed = false;
    Element.prototype.getBoundingClientRect = originals.elementGBCR;
    Range.prototype.getBoundingClientRect = originals.rangeGBCR;
    Range.prototype.getClientRects = originals.rangeGetClientRects;
    if (originals.caretRange) document.caretRangeFromPoint = originals.caretRange;
    // @ts-ignore
    if (originals.caretPosition) document.caretPositionFromPoint = originals.caretPosition;
}

/**
 * Sets the current active vertical editor wrapper.
 */
export function setupVertical(isActive: boolean, wrapperEl: HTMLElement | null) {
    active = isActive;
    wrapper = wrapperEl;
}

/**
 * Attaches mouse listeners to the wrapper to capture and transform coordinates.
 */
export function attachMouseListeners(wrapperEl: HTMLElement): () => void {
    const events = ['mousedown', 'mousemove', 'mouseup', 'click'] as const;
    events.forEach(ev => wrapperEl.addEventListener(ev, mouseHandler, { capture: true }));
    return () => events.forEach(ev => wrapperEl.removeEventListener(ev, mouseHandler, { capture: true }));
}

/**
 * Helper to get the actual bounding box of an element ignoring the patch.
 * Useful for layout calculations (like syncing container size).
 */
export function getPhysicalRect(el: Element): DOMRect {
    return originals.elementGBCR.call(el);
}
