import { defineConfig } from 'vite';

// The TypeScript worker inlines TypeScript's lib .d.ts files and Solid's types through
// `import.meta.glob`, which tsdown cannot resolve, so it is bundled with Vite into a
// self-contained `dist/tsWorker.mjs`. npm consumers then need neither `typescript` installed nor
// any optimizeDeps configuration (the playground still builds it from source).
export default defineConfig({
  define: {
    'process.env.NODE_DEBUG': 'false',
    'process.env': '{}',
    'process.platform': '""',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'esnext',
    minify: true,
    reportCompressedSize: false,
    lib: {
      entry: 'src/components/editor/tsWorker.ts',
      formats: ['es'],
      fileName: () => 'tsWorker.mjs',
    },
  },
});
