import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': 'true',
    'process.env.NODE_DEBUG': 'false',
    global: 'globalThis',
  },
  publicDir: 'types',
  build: {
    lib: {
      entry: '', // we override this with input below
      formats: ['es'],
    },
    cssCodeSplit: false,
    outDir: 'lib',
    target: 'esnext',
    minify: false,
    rollupOptions: {
      external: ['solid-js', 'solid-js/web', 'monaco-editor'],
      input: ['src/index.ts', 'src/workers/formatter.ts', 'src/workers/compiler.ts'],
      output: {
        dir: 'lib',
        format: 'es',
        manualChunks: {},
        entryFileNames: undefined,
      },
    },
  },
});
