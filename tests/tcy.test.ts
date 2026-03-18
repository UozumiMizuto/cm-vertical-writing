import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tcy, tateChuYokoPlugin } from '../tcy';

describe('tcy.ts', () => {
    it('creates tate-chu-yoko decorations for correct patterns', () => {
        const doc = "あいう12えお!?かき!!くけABこ";
        const state = EditorState.create({
            doc,
            extensions: [tcy]
        });

        const parent = document.createElement('div');
        document.body.appendChild(parent);

        const view = new EditorView({ state, parent });

        const plugin = view.plugin(tateChuYokoPlugin as any);
        expect(plugin).toBeDefined();

        if (plugin) {
            let iter = plugin.decorations.iter();
            const ranges: { from: number, to: number }[] = [];
            while (iter.value) {
                ranges.push({ from: iter.from, to: iter.to });
                iter.next();
            }

            // Expected matches:
            // "12" -> index 3 to 5
            // "!?" -> index 7 to 9
            // "!!" -> index 11 to 13
            // "AB" -> index 15 to 17

            expect(ranges.length).toBe(4);
            expect(ranges[0]).toEqual({ from: 3, to: 5 });
            expect(ranges[1]).toEqual({ from: 7, to: 9 });
            expect(ranges[2]).toEqual({ from: 11, to: 13 });
            expect(ranges[3]).toEqual({ from: 15, to: 17 });

            // Check DOM structure of widget
            iter = plugin.decorations.iter();
            const widget = iter.value?.spec.widget;
            expect(widget).toBeDefined();

            const dom = widget?.toDOM(view);
            expect(dom?.className).toBe("cm-tcy");
            expect(dom?.textContent).toBe("12");
        }

        view.destroy();
        document.body.removeChild(parent);
    });

    it('does not create tcy decorations when cursor is inside', () => {
        const doc = "あいう12えお";
        const state = EditorState.create({
            doc,
            selection: { anchor: 4 }, // Cursor between '1' and '2'
            extensions: [tcy]
        });

        const parent = document.createElement('div');
        document.body.appendChild(parent);

        const view = new EditorView({ state, parent });

        const plugin = view.plugin(tateChuYokoPlugin as any);
        expect(plugin).toBeDefined();

        if (plugin) {
            let iter = plugin.decorations.iter();
            let count = 0;
            while (iter.value) {
                count++;
                iter.next();
            }
            // Decoration should not be applied because cursor is inside
            expect(count).toBe(0);
        }

        view.destroy();
        document.body.removeChild(parent);
    });
});
