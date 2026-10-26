import { defineConfig } from 'tsdown';
import { cpSync, readFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { linterAliases, linterDefine } from './linterBuild.ts';

export default defineConfig([
  {
    entry: ['./repl/compiler.ts', './repl/formatter.ts', './repl/main.css'],
    outDir: './dist',
    format: 'esm',
    platform: 'browser',
    minify: true,
    dts: false,
    deps: { onlyBundle: false },
    alias: {
      ...linterAliases,
      // Optional peer of @solidjs/babel-plugin, only needed for .tsrx sources.
      '@tsrx/core': resolve(import.meta.dirname, 'linter/nodeStub.cjs'),
    },
    css: {
      transformer: 'postcss',
    },
    define: linterDefine,
    hooks: {
      'build:done': () => {
        renameSync('./dist/style.css', './dist/bundle.css');
        cpSync('../../styled-system', './dist/styled-system', {
          recursive: true,
          // Panda's generated JSX factory targets Solid 1.
          filter: (src) => !src.includes('/types') && !src.includes('/styled-system/jsx'),
        });
      },
    },
  },
  {
    entry: { worker: './src/languageWorker/worker.ts' },
    outDir: './dist/languageWorker',
    format: 'esm',
    platform: 'browser',
    minify: true,
    dts: false,
    deps: { alwaysBundle: [/.*/], onlyBundle: false },
    alias: linterAliases,
    define: linterDefine,
    plugins: [
      {
        name: 'raw',
        load: (id) =>
          id.endsWith('?raw') ? `export default ${JSON.stringify(readFileSync(id.slice(0, -4), 'utf8'))}` : undefined,
      },
    ],
  },
]);
