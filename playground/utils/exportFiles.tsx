import pkg from '../../package.json';
import type { Tab } from 'solid-repl';
import dedent from 'dedent';

const viteConfigFile = dedent`
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: "esnext",
    polyfillDynamicImport: false,
  },
});
`;
const tsConfig = JSON.stringify(
  {
    compilerOptions: {
      strict: true,
      module: 'ESNext',
      target: 'ESNext',
      jsx: 'preserve',
      esModuleInterop: true,
      sourceMap: true,
      allowJs: true,
      lib: ['es6', 'dom'],
      rootDir: 'src',
      moduleResolution: 'node',
      jsxImportSource: 'solid-js',
      types: ['solid-js', 'solid-js/dom'],
    },
  },
  null,
  2,
);

const packageJSON = JSON.stringify(
  {
    scripts: {
      start: 'vite',
      build: 'vite build',
    },
    dependencies: {
      'solid-js': pkg.dependencies['solid-js'],
    },
    devDependencies: {
      'vite': pkg.devDependencies['vite'],
      'vite-plugin-solid': pkg.devDependencies['vite-plugin-solid'],
    },
  },
  null,
  2,
);

const indexHTML = (tabs: Tab[]) => dedent`
<html>
  <head>
    <title>Vite Sandbox</title>
    <meta charset="UTF-8" />
  </head>

  <body>
    <div id="app"></div>

    <script type="module" src="./src/${tabs[0].name}.tsx"></script>
  </body>
</html>
`;

/**
 * This function will convert the tabs of the playground
 * into a ZIP formatted playground that can then be reimported later on
 */
export async function exportToZip(tabs: Tab[]): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  // basic structure
  zip.file('index.html', indexHTML(tabs));
  zip.file('package.json', packageJSON);
  zip.file('vite.config.ts', viteConfigFile);
  zip.file('tsconfig.json', tsConfig);
  for (const tab of tabs) {
    zip.file(tab.name, tab.source);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);

  const anchor = (<a href={url} target="_blank" rel="noopener" download />) as HTMLElement;
  document.body.prepend(anchor);
  anchor.click();
  anchor.remove();
}
