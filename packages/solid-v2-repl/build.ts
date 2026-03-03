import { build } from 'esbuild';

build({
  entryPoints: ['./repl/compiler.ts', './repl/formatter.ts', './repl/linter.ts'],
  outdir: './dist',
  minify: true,
  bundle: true,
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': 'true',
    'process.env.NODE_DEBUG': 'false',
    'preventAssignment': 'true',
  },
});
