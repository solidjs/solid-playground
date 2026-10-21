import { defineConfig } from 'tsdown';
import { cpSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { linterAliases, linterDefine } from './linterBuild.ts';

export default defineConfig({
  entry: ['./repl/compiler.ts', './repl/formatter.ts', './repl/linter.ts', './repl/main.css'],
  outDir: './dist',
  format: 'esm',
  platform: 'browser',
  minify: true,
  dts: false,
  alias: {
    ...linterAliases,
    // Optional peer of @solidjs/babel-plugin, only needed for .tsrx sources.
    '@tsrx/core': resolve(import.meta.dirname, 'linter/nodeStub.cjs'),
  },
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
      cpSync('../../styled-system', './dist/styled-system', {
        recursive: true,
        filter: (src) => !src.includes('/types'),
      });
    },
  },
});
