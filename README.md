# CodeMirror 6 縦書き拡張 (90度回転方式)

ブラウザの `writing-mode: vertical-rl` のバグ（カーソルのズレや座標計算の不一致）を完全に回避し、90度回転ハックを使用して高いパフォーマンスと安定した表示を実現する CodeMirror 6 用の縦書き拡張機能です。

## 🚀 主な機能
- **安定したレイアウト**: 標準的な `vertical-rl` モードで見られるカーソルのズレや選択範囲の乱れが発生しません。
- **日本語タイポグラフィのサポート**:
  - **縦中横 (TCY)**: `!!` や `!?`、あるいは 2 桁の数字（10-99）などを読みやすく回転させます。
  - **ルビ・圏点サポート**: 青空文庫/なろう形式のルビ（`|漢字《かんじ》`）や傍点（`《《強調》》`）のプレビューに対応。
- **柔軟なテーマ**: フォント、サイズ、色などをCodeMirror 6同様自由にカスタマイズ可能。
- **CodeMirror 6機能のサポート**: ガーターやコードハイライトなどをそのまま壊れること無く利用できます。

## 🔗 デモ
[https://playground.uo-uo.com/vertical](https://playground.uo-uo.com/vertical)

---

## ⚠️ 重要な設計上の要件と制約

### 1. グローバルな座標パッチ
本ライブラリは CSS Transform を使用してエディタ全体を 90 度回転させるため、CodeMirror 内部の座標計算が正しく機能しません。これを解決するために、グローバルな DOM API (`getBoundingClientRect`, `caretRangeFromPoint` 等) にパッチを適用します。

**アプリケーションの開始時に一度だけ `installPatches()` を呼び出す必要があります。**

```typescript
import { installPatches, uninstallPatches } from "@uozumi/cm-vertical-writing";

// アプリケーションのエントリーポイントで一度だけ実行
installPatches();
```
*※ 必要に応じて元のプロトタイプを復元するための `uninstallPatches()` も提供しています。*

> [!WARNING]
> **単一インスタンスの制約**: グローバルな DOM パッチの性質上、現在同一ページ内での複数エディタの同時表示には対応していません。

### 2. ブラウザの互換性
縦中横 (TCY) の実装をより広範なブラウザで動作するように最適化しました。**Safari などの旧バージョンを含む、主要なモダンブラウザで安定して動作します。**

### 3. 事前回転済みフォント
本ライブラリでは、グリフ自体があらかじめ左に 90 度回転した「事前回転済みフォント」を使用します。エディタ全体を CSS で右に 90 度回転させることで、文字が正立して見える仕組みです。

---

## 🛠 使い方

### インストール
```bash
npm install @uozumi/cm-vertical-writing
```

### 1. HTML と CSS の設定
エディタを配置するコンテナを HTML で用意し、CSS で手動で回転させる必要があります：

```html
<div id="editor-container" class="editor-container">
    <!-- CodeMirror はこの wrapper 内に生成されます -->
    <div id="editor-wrapper" class="editor-wrapper"></div>
</div>
```

```css
.editor-container {
    width: 600px;
    height: 400px;
    position: relative;
    overflow: hidden;
}

.editor-wrapper {
    /* 
     * 重要: 回転後の見た目がコンテナに収まるよう、
     * JavaScript で動的に width/height を入れ替えるのが最も安定します。
     */
    transform: rotate(90deg) translateY(-100%);
    transform-origin: top left;
}
```

### 2. エディタへの組み込みとサイズ同期のコツ

縦書き（回転）状態では、ブラウザのスクロールや CodeMirror の仮想レンダリングを正しく機能させるために、**エディタの物理的な幅と高さを入れ替える**必要があります。

```typescript
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { 
    injectFont,
    installPatches, 
    verticalWriting, 
    setupVertical, 
    attachMouseListeners,
    getOriginalRect 
} from "@uozumi/cm-vertical-writing";

installPatches();
injectFont();

const container = document.getElementById("editor-container")!;
const wrapper = document.getElementById("editor-wrapper")!;

// 1. サイズの同期（コンテナの W/H を入れ替えてエディタに適用）
const rect = getOriginalRect(container);
wrapper.style.width = `${rect.height}px`;
wrapper.style.height = `${rect.width}px`;

const view = new EditorView({
    state: EditorState.create({
        doc: "吾輩は猫である。名前はまだ無い。",
        extensions: [
            verticalWriting({ fontFamily: "'STVerticalMincho', serif" }),
        ],
    }),
    parent: wrapper
});

setupVertical(true, wrapper);
attachMouseListeners(wrapper);
```

> [!TIP]
> **レスポンシブ対応**: `ResizeObserver` を使用して、コンテナのサイズが変わるたびに `wrapper` の `width` と `height` をスワップして更新するように実装すると、ウィンドウのリサイズ時にもレイアウトが崩れず非常に安定します。

---

#### Next.js など SSR 環境での利用

`injectFont()` はサーバーサイドで呼ばれても安全（`document` が存在しない場合は何もしない）ですが、自動的なパス解決は環境（ビルドツールやベースパスの設定）に強く依存するため、ブラウザで確実に読み込むには**フォントファイルを自身のサーバーに配置し、そのパスを引数で明示的に指定することを推奨します**。

Next.js の場合は、フォントファイルを `public/fonts/` に配置し、以下のように設定してください。

```bash
# node_modules からフォントを public にコピー（例: package.json の postinstall スクリプトで自動化）
cp node_modules/@uozumi/cm-vertical-writing/dist/fonts/STVerticalMincho.ttf public/fonts/
```

```typescript
// Next.js の Client Component 内（"use client" 宣言が必要）
"use client";
import { useEffect } from "react";
import { injectFont, installPatches } from "@uozumi/cm-vertical-writing";

useEffect(() => {
    installPatches();
    // public/fonts/ に配置したフォントを明示的に指定（フルURLまたは相対パス）
    injectFont("/fonts/STVerticalMincho.ttf");
}, []);
```

### 3. クリーンアップ
メモリリークを防ぎ、エディタ破棄時にグローバル環境を復元する場合：

```typescript
// エディタのインスタンスやリスナーを保持してクリーンアップする場合：
const view = new EditorView({ state, parent: wrapper });
const detachMouse = attachMouseListeners(wrapper);

function cleanup() {
    view.destroy();
    detachMouse();
    setupVertical(false, null);
    // 以降、縦書きエディタを使用しない場合のみ任意で実行
    // uninstallPatches();
}
```

---

## ⚙️ 縦書き用フォントの生成方法
既存の TTF フォント（例：Zen Old Mincho）を本ライブラリで使用可能な形式（左に90度回転）に変換するスクリプトを提供しています。

1. **前提条件**: Python 3.6+ および `fonttools`
2. 依存関係のインストール: `pip install fonttools`
3. スクリプトの実行:
   ```bash
   python scripts/create_vertical_font.py --input MyFont.ttf --output STVerticalMincho.ttf
   ```
4. 出力された `STVerticalMincho.ttf` をプロジェクトで読み込んで使用してください。

---

## 📄 ライセンス
本ライブラリは MIT ライセンスの下で公開されています。
生成されるフォントについては、それぞれの元フォントのライセンスに従います（例：Zen Old Mincho は SIL OFL 1.1）。
