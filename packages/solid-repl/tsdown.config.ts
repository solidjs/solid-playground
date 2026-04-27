import { defineConfig } from 'tsdown';
import { copyFileSync, renameSync } from 'node:fs';

export default defineConfig({
  entry: ['./repl/compiler.ts', './repl/formatter.ts', './repl/linter.ts', './repl/main.css'],
  outDir: './dist',
  format: 'esm',
  minify: true,
  dts: false,
  css: {
    transformer: 'postcss',
  },
  define: {
    'process.env.NODE_DEBUG': 'false',
    'preventAssignment': 'true',
  },
  hooks: {
    'build:done': () => {
      renameSync('./dist/style.css', './dist/bundle.css');
      copyFileSync('./src/types.d.ts', './dist/types.d.ts');
    },
  },
});
