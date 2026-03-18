import { describe, it, expect } from 'vitest';
import { verticalWriting } from '../index';
import { EditorState } from '@codemirror/state';

describe('index.ts', () => {
    it('verticalWriting returns an array of extensions', () => {
        const ext = verticalWriting({
            fontFamily: 'MyFont'
        });

        expect(Array.isArray(ext)).toBe(true);
        // Theme (1 extension), tcy (array of 2), ruby (array of 2)
        // Usually, verticalWriting returns an array of extensions.
        expect(ext.length).toBe(3); // theme, tcy, ruby
    });

    it('verticalWriting can disable tcy and ruby', () => {
        const ext = verticalWriting({
            fontFamily: 'MyFont',
            tcy: false,
            ruby: false
        });

        expect(Array.isArray(ext)).toBe(true);
        expect(ext.length).toBe(1); // only theme
    });

    it('can be added to EditorState', () => {
        const ext = verticalWriting({
            fontFamily: 'MyFont'
        });

        const state = EditorState.create({
            doc: "test",
            extensions: [ext]
        });

        expect(state).toBeDefined();
        expect(state.doc.toString()).toBe("test");
    });
});
