import { build } from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { copyFileSync } from 'fs-extra';

build({
  entryPoints: ['./repl/compiler.ts', './repl/formatter.ts', './repl/linter.ts', './repl/main.css'],
  outdir: './lib',
  minify: true,
  bundle: true,
  external: ['/Gordita-Medium.woff', '/Gordita-Regular.woff', '/Gordita-Bold.woff'],
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': 'true',
    'process.env.NODE_DEBUG': 'false',
    'preventAssignment': 'true',
  },
}).then(() => {
  const unoCSS_build = readFileSync('./uno.css');
  const generated_bundle = readFileSync('./lib/main.css');

  const output_bundle = Buffer.concat([generated_bundle, unoCSS_build]);

  writeFileSync('./lib/bundle.css', output_bundle);

  unlinkSync('./uno.css');
  unlinkSync('./lib/main.css');

  copyFileSync('./src/types.d.ts', './lib/types.d.ts');
});
