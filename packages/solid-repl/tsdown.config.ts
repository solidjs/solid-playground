import { defineConfig } from 'tsdown';
import { copyFileSync, cpSync, renameSync } from 'node:fs';
import { linterAliases, linterDefine } from './linterBuild.ts';

export default defineConfig({
  entry: ['./repl/compiler.ts', './repl/formatter.ts', './repl/linter.ts', './repl/main.css'],
  outDir: './dist',
  format: 'esm',
  platform: 'browser',
  minify: true,
  dts: false,
  alias: linterAliases,
  css: {
    transformer: 'postcss',
  },
  define: {
    'process.env.NODE_DEBUG': 'false',
    ...linterDefine,
    'preventAssignment': 'true',
  },
  hooks: {
    'build:done': () => {
      renameSync('./dist/style.css', './dist/bundle.css');
      copyFileSync('./src/types.d.ts', './dist/types.d.ts');
      cpSync('../../styled-system', './dist/styled-system', {
        recursive: true,
        filter: (src) => !src.includes('/types'),
      });
    },
  },
});
