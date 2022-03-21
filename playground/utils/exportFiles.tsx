import pkg from '../../package.json';
import type { Tab } from '../../src';
import { compressToBase64 } from '@amoutonbrady/lz-string';
import dedent from 'dedent';

type IFiles = Record<string, { content: string | Record<string, any>; isBinary: boolean }>;
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
      strict: false,
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

const { dependencies: d, devDependencies: dd } = pkg;

const packageJSON = JSON.stringify(
  {
    scripts: {
      start: 'vite',
      build: 'vite build',
    },
    dependencies: {
      'solid-js': d['solid-js'],
    },
    devDependencies: {
      vite: dd['vite'],
      'vite-plugin-solid': dd['vite-plugin-solid'],
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

function getParameters(parameters: { files: IFiles }) {
  return compressToBase64(JSON.stringify(parameters))
    .replace(/\+/g, '-') // Convert '+' to '-'
    .replace(/\//g, '_') // Convert '/' to '_'
    .replace(/=+$/, ''); // Remove ending '='
}

export function exportToCsb(tabs: Tab[]): void {
  const params = tabs.reduce<IFiles>((p, tab) => {
    p[`src/${tab.name}.${tab.type}`] = { content: tab.source, isBinary: false };
    return p;
  }, {});

  const parameters = getParameters({
    files: {
      ...params,
      'vite.config.ts': {
        content: viteConfigFile,
        isBinary: false,
      },
      'tsconfig.json': {
        content: tsConfig,
        isBinary: false,
      },
      'index.html': {
        content: indexHTML(tabs),
        isBinary: false,
      },
      'package.json': {
        content: packageJSON,
        isBinary: false,
      },
    },
  });

  const url = `https://codesandbox.io/api/v1/sandboxes/define?parameters=${parameters}`;

  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener');

  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * This function will convert the tabs of the playground
 * into a JSON formatted playground that can then be reimported later on
 * via the url `https://playground.solidjs.com/?data=my-file.json` or
 * vua the import button
 *
 * @param tabs {Tab[]} - The tabs to export
 */
export async function exportToZip(tabs: Tab[]): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  // basic structure
  zip.file('index.html', indexHTML(tabs));
  zip.file('package.json', packageJSON);
  zip.file('vite.config.ts', viteConfigFile);
  zip.file('tsconfig.json', tsConfig);

  // project src
  const src = zip.folder('src')!;

  for (const tab of tabs) {
    src.file(`${tab.name}.${tab.type}`, tab.source);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);

  const anchor = (<a href={url} target="_blank" rel="noopener" download />) as HTMLElement;
  document.body.prepend(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * This function will convert the tabs of the playground
 * into a JSON formatted playground that can then be reimported later on
 * via the url `https://playground.solidjs.com/?data=my-file.json` or
 * vua the import button
 *
 * @param tabs {Tab[]} - The tabs to export
 */
export function exportToJSON(tabs: Tab[]): void {
  const files = tabs.map<{ name: string; content: string }>((tab) => ({
    name: tab.name,
    type: tab.type,
    content: tab.source,
  }));

  const blob = new Blob([JSON.stringify({ files }, null, 4)], { type: 'application/json' });
  location.href = URL.createObjectURL(blob);
}
