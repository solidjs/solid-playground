import { defineConfig } from 'tsdown';
import { cpSync, readFileSync, renameSync } from 'node:fs';
import { linterAliases, linterDefine } from './linterBuild.ts';

export default defineConfig([
  {
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
        cpSync('../../styled-system', './dist/styled-system', {
          recursive: true,
          filter: (src) => !src.includes('/types'),
        });
      },
    },
  },
  {
    entry: { tsWorker: './src/components/editor/tsWorker.ts' },
    outDir: './dist/components/editor',
    format: 'esm',
    platform: 'browser',
    minify: true,
    dts: false,
    deps: { alwaysBundle: [/.*/], onlyBundle: false },
    define: {
      'process.env.NODE_DEBUG': 'false',
    },
    plugins: [
      {
        name: 'raw',
        load: (id) =>
          id.endsWith('?raw') ? `export default ${JSON.stringify(readFileSync(id.slice(0, -4), 'utf8'))}` : undefined,
      },
    ],
  },
]);
