import { defineConfig } from 'vite';
import { resolve } from 'path';

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
  }
});
