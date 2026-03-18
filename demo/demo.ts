import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { lineNumbers, highlightActiveLine, drawSelection, keymap } from "@codemirror/view";
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";

// Import from parent directory
import {
    installPatches,
    setupVertical,
    attachMouseListeners,
    verticalWriting,
    getPhysicalRect,
    uninstallPatches
} from "../index";

/**
 * Vertical Writing Editor Demo (OSS Version)
 * demonstrating the 90-degree rotation technique.
 */

// 1. Install global coordinate mapping patches once.
installPatches();

const container = document.getElementById("container")!;
const wrapper = document.getElementById("wrapper")!;

// 2. Initial Document Text
const initialText =
    `『縦書きエディタ (OSS 抽出版)』のデモへようこそ。

この実装は、ブラウザ標準の縦書き (writing-mode: vertical-rl) を使わず、
【横書きエディタを丸ごと90度回転させる】というアプローチを採用しています。

主なメリット:
・カーソル位置の計算や選択範囲が、ブラウザの縦書きバグに左右されず安定。
・日本語特有の |縦中横《たてちゅうよこ》 ( !! や 12 など ) に対応。
・|ルビ《るび》表示や、《《強調》》ドットのリアルタイムプレビューに対応。

実装のポイント:
1. 専用フォント (STVerticalMincho) : 90度回転済みのフォントを利用。
2. 座標マッピング : 逆転写による getBoundingClientRect とマウス座標のシミュレート。
3. サイズ補正 : コンテナの幅と高さを動的にスワップ。

ぜひ、このエディタで文章を綴ってみてください。
`;

// 3. Editor Configuration
const state = EditorState.create({
    doc: initialText,
    extensions: [
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        markdown(),
        keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
        ]),

        // Apply vertical writing extension
        verticalWriting({
            fontFamily: "'STVerticalMincho', 'Noto Serif JP', serif",
            fontSize: "1.2rem",
            textColor: "#eee",
            tcy: true,
            ruby: true
        }),
    ],
});

// 4. Initialize Editor View
const view = new EditorView({
    state,
    parent: wrapper,
});

// 5. Activate vertical logic and listen for mouse events
setupVertical(true, wrapper);
const detachMouse = attachMouseListeners(wrapper);

/**
 * Handle layout re-sync to swap width and height on rotation.
 */
function syncSize() {
    if (!container || !view.dom) return;

    // Get actual (physical) container dimensions ignoring the patch
    const rect = getPhysicalRect(container);

    // Since we're rotating 90deg, swap W and H
    view.dom.style.width = rect.height + "px";
    view.dom.style.height = rect.width + "px";

    view.requestMeasure();
}

syncSize();
window.addEventListener("resize", syncSize);

/**
 * CLEANUP (Memory leak prevention)
 */
function handleCleanup() {
    window.removeEventListener("resize", syncSize);
    detachMouse();
    setupVertical(false, null);
    view.destroy();

    // Optional: Uninstall global patches if this is the last vertical editor
    // uninstallPatches();

    console.log("Cleanup complete.");
}

// In a real SPA application, you would call handleCleanup() during the unmount phase.
// (e.g., useEffect return in React or onDestroy in others).

console.log("Vertical Editor Demo initialized!");
