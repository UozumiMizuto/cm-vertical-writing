import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { injectFont } from '../font';

describe('font.ts', () => {
    beforeEach(() => {
        // Clear head before each test
        document.head.innerHTML = '';
    });

    afterEach(() => {
        document.head.innerHTML = '';
    });

    it('injectFont appends a style tag to document.head', () => {
        injectFont();

        const style = document.getElementById('cm-vertical-writing-font');
        expect(style).toBeDefined();
        expect(style?.tagName.toLowerCase()).toBe('style');
        expect(style?.textContent).toContain("@font-face");
        expect(style?.textContent).toContain("font-family: 'STVerticalMincho'");
    });

    it('injectFont uses the provided URL if given', () => {
        const customUrl = 'https://example.com/fonts/MyFont.ttf';
        injectFont(customUrl);

        const style = document.getElementById('cm-vertical-writing-font');
        expect(style?.textContent).toContain(`src: url('${customUrl}')`);
    });

    it('injectFont does not inject multiple times', () => {
        injectFont();
        injectFont();
        injectFont();

        const styles = document.querySelectorAll('#cm-vertical-writing-font');
        expect(styles.length).toBe(1);
    });
});
