import { build } from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { copyFileSync } from 'fs-extra';
import { nodeModulesPolyfillPlugin } from 'esbuild-plugins-node-modules-polyfill';

build({
  entryPoints: ['./repl/compiler.ts', './repl/formatter.ts', './repl/linter.ts', './repl/main.css'],
  outdir: './dist',
  minify: true,
  bundle: true,
  external: ['/Gordita-Medium.woff', '/Gordita-Regular.woff', '/Gordita-Bold.woff'],
  define: {
    'process.env.BABEL_TYPES_8_BREAKING': 'true',
    'process.env.NODE_DEBUG': 'false',
    'process.version': '"20"',
    'process.versions': '{}',
    'preventAssignment': 'true',
  },
  plugins: [nodeModulesPolyfillPlugin()],
}).then(() => {
  const unoCSS_build = readFileSync('./uno.css');
  const generated_bundle = readFileSync('./dist/main.css');

  const output_bundle = Buffer.concat([generated_bundle, unoCSS_build]);

  writeFileSync('./dist/bundle.css', output_bundle);

  unlinkSync('./uno.css');
  unlinkSync('./dist/main.css');

  copyFileSync('./src/types.d.ts', './dist/types.d.ts');
});
