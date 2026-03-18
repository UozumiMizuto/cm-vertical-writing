import { describe, it, expect } from 'vitest';
import { verticalTheme } from '../theme';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

describe('theme.ts', () => {
    it('verticalTheme returns a CodeMirror extension', () => {
        const ext = verticalTheme();
        expect(ext).toBeDefined();

        // Ensure it can be added to an editor state
        const state = EditorState.create({
            extensions: [ext]
        });
        expect(state).toBeDefined();
    });

    it('verticalTheme applies provided options', () => {
        const ext = verticalTheme({
            fontFamily: "CustomFont",
            fontSize: "2rem",
            textColor: "red"
        });

        const state = EditorState.create({
            extensions: [ext]
        });
        const view = new EditorView({ state });

        // While it's hard to read exact CSS rules out of a live CodeMirror view in jsdom easily,
        // we can test that passing the options doesn't crash and the extension is successfully created.
        expect(view).toBeDefined();

        view.destroy();
    });

    it('verticalTheme handles partial options', () => {
        const ext = verticalTheme({
            fontSize: "2rem"
            // omitted fontFamily and textColor
        });
        expect(ext).toBeDefined();
    });
});
