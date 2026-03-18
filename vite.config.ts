import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { copyFileSync, mkdirSync } from 'fs';

// Custom Vite plugin to copy font files into dist/fonts/
function copyFontsPlugin() {
  return {
    name: 'copy-fonts',
    closeBundle() {
      mkdirSync('dist/fonts', { recursive: true });
      copyFileSync(
        resolve(__dirname, 'STVerticalMincho.ttf'),
        resolve(__dirname, 'dist/fonts/STVerticalMincho.ttf')
      );
    }
  };
}

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      name: 'CMVerticalWriting',
      fileName: 'index'
    },
    rollupOptions: {
      // Ensure external dependencies are not bundled
      external: ['@codemirror/state', '@codemirror/view'],
      output: {
        globals: {
          '@codemirror/state': 'CMState',
          '@codemirror/view': 'CMView'
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['index.ts', 'core.ts', 'tcy.ts', 'ruby.ts', 'theme.ts', 'font.ts'],
      exclude: ['vite.config.ts'],
    }),
    copyFontsPlugin()
  ]
});
