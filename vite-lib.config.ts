import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { copyFile } from 'fs/promises';
export default defineConfig({
  plugins: [
    solidPlugin(),
    {
      name: 'copy',
      writeBundle: async () => {
        const copyList = [
          { src: './public/Gordita-Bold.woff', dest: './lib/Gordita-Bold.woff' },
          { src: './public/Gordita-Regular.woff', dest: './lib/Gordita-Regular.woff' },
        ];
        await Promise.all(copyList.map(({ src, dest }) => copyFile(src, dest)));
      },
    },
  ],
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': 'true',
    'process.env.NODE_DEBUG': 'false',
  },
  publicDir: 'types',
  base: './',
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
      external: ['solid-js', 'solid-js/web', 'solid-js/store', 'monaco-editor'],
      input: ['src/index.ts', 'src/workers/formatter.ts', 'src/workers/compiler.ts'],
      output: {
        dir: 'lib',
        format: 'es',
        entryFileNames: undefined,
      },
    },
  },
});
