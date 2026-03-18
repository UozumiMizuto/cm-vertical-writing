# CodeMirror 6 Vertical Writing Extension (90deg Rotation)

A high-performance vertical writing extension for CodeMirror 6 that bypasses browser-specific `writing-mode: vertical-rl` bugs by using a 90-degree rotation hack.

## 🚀 Key Features
- **Stable Layout**: No cursor drift or selection misalignment found in standard vertical-rl modes.
- **Japanese Typography Support**:
  - **Tate-chu-yoko (TCY)**: Rotates 2-character sequences like `!!`, `!?`, or `10-99` for readability.
  - **Ruby Support**: Previews Aozora/Narou style ruby text (`|漢字《かんじ》`) and emphasis dots (`《《強調》》`).
- **Flexible Theme**: Customizable font family, size, and colors.

---

## ⚠️ Important Architectural Requirements & Constraints

### 1. Global Coordinate Patches
Since this library rotates the entire editor globally using CSS transforms, CodeMirror's internal coordinate calculations break. We fix this by patching global DOM APIs (`getBoundingClientRect`, `caretRangeFromPoint`, etc.).

**You must call `installPatches()` once at the start of your application.**
```typescript
import { installPatches, uninstallPatches } from "@uozum/cm-vertical-writing";
installPatches();
```
*Note: We provide `uninstallPatches()` to restore original prototypes if needed.*

> [!WARNING]
> **Single Instance Constraint**: Due to the nature of global DOM patches, displaying multiple vertical editors on the same page is currently not supported.

### 2. Browser Compatibility
The Tate-chu-yoko (TCY) implementation uses Regex Lookbehind (`(?<!...)`). This requires a modern browser (e.g., **Safari 16.4+**, **Chrome 62+**, **Firefox 78+**). If you need to support older versions of Safari/iOS, TCY may not function correctly.

### 3. Pre-Rotated Font
This library requires a "pre-rotated" font where the glyphs themselves are rotated 90 degrees left. When the entire editor is rotated 90 degrees right via CSS, the text appears **upright (正立)**.

We recommend using **Zen Old Mincho** (SIL OFL) and processing it with our provided Python script.

---

## 🛠 Usage

### 1. CSS Setup
The editor container must be rotated manually via CSS:
```css
.editor-container {
    width: 100%;
    height: 100%;
}

.editor-wrapper {
    width: 100%;
    height: 100%;
    /* The Rotation Hack */
    transform: rotate(90deg) translateY(-100%);
    transform-origin: top left;
}
```

### 2. Editor Integration
```typescript
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { 
    installPatches, 
    verticalWriting, 
    setupVertical, 
    attachMouseListeners 
} from "@uozum/cm-vertical-writing";

// IMPORTANT: Install global patches once at startup
installPatches();

const wrapper = document.getElementById("editor-wrapper")!;

const state = EditorState.create({
    doc: "吾輩は猫である。名前はまだ無い。",
    extensions: [
        verticalWriting({
            fontFamily: "'STVerticalMincho', 'Noto Serif JP', serif",
            tcy: true,
            ruby: true
        }),
    ],
});

const view = new EditorView({ state, parent: wrapper });

// Bind the active vertical editor to the coordinate patch logic
setupVertical(true, wrapper);
const detachMouse = attachMouseListeners(wrapper);
```

### 3. Cleanup
To prevent memory leaks and restore the global environment when the editor is destroyed:
```typescript
function cleanup() {
    view.destroy();
    detachMouse();
    setupVertical(false, null);
    // Optional: Only if no more vertical editors will be used
    // uninstallPatches();
}
```

---

## ⚙️ How to Generate the Vertical Font
We provide a script to modify an existing TTF font (e.g., Zen Old Mincho) for use with this library.

1. **Prerequisites**: Python 3.6+ and `fonttools`.
2. Install dependencies: `pip install fonttools`
3. Run the script: `python scripts/create_vertical_font.py`
4. The resulting `STVerticalMincho.ttf` will be generated in your output directory.

**License Notice**: Ensure the base font license (like SIL OFL 1.1) allows modifications and renaming before distributing your generated font.

---

## 📄 License
This library is licensed under the MIT License.
The generated fonts are subject to their respective licenses (e.g., Zen Old Mincho is SIL OFL 1.1).
