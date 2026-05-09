import pkg from '../../package.json';
import type { SolidVersion, Tab } from 'solid-repl';
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
const tsConfig = (solidVersion: SolidVersion) =>
  JSON.stringify(
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
        jsxImportSource: solidVersion === 'v2' ? '@solidjs/web' : 'solid-js',
        types: solidVersion === 'v2' ? ['@solidjs/web', 'solid-js'] : ['solid-js', 'solid-js/dom'],
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

    <script type="module" src="./src/${tabs[0].name}"></script>
  </body>
</html>
`;

/**
 * This function will calculate the dependencies of the
 * package.json by using the imports list provided by the bundler,
 * and then generating the package.json itself, for the export
 */
const packageName = (importPath: string) => {
  if (importPath.startsWith('@')) return importPath.split('/').slice(0, 2).join('/');
  return importPath.split('/')[0];
};

function packageJSON(imports: string[], solidVersion: SolidVersion): string {
  const deps = imports.reduce(
    (acc, importPath): Record<string, string> => {
      const name = packageName(importPath);
      if (!acc[name]) acc[name] = '*';
      return acc;
    },
    {} as Record<string, string>,
  );
  deps['solid-js'] = solidVersion === 'v2' ? '2.0.0-beta.10' : deps['solid-js'];
  if (solidVersion === 'v2') {
    deps['@solidjs/web'] = '2.0.0-beta.10';
  }

  return JSON.stringify(
    {
      scripts: {
        start: 'vite',
        build: 'vite build',
      },
      dependencies: deps,
      devDependencies: {
        'vite': pkg.devDependencies['vite'],
        'vite-plugin-solid': solidVersion === 'v2' ? '3.0.0-next.5' : pkg.devDependencies['vite-plugin-solid'],
      },
    },
    null,
    2,
  );
}

/**
 * This function will convert the tabs of the playground
 * into a ZIP formatted playground that can then be reimported later on
 */
export async function exportToZip(tabs: Tab[], solidVersion: SolidVersion = 'v1'): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  // basic structure
  zip.file('index.html', indexHTML(tabs));
  zip.file('vite.config.ts', viteConfigFile);
  zip.file('tsconfig.json', tsConfig(solidVersion));
  zip.folder('src');

  for (const tab of tabs) {
    if (tab.name == 'import_map.json') {
      zip.file('package.json', packageJSON(Object.keys(JSON.parse(tab.source)), solidVersion));
    } else {
      zip.file(`src/${tab.name}`, tab.source);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);

  const anchor = (<a href={url} target="_blank" rel="noopener" download="solid-playground-project" />) as HTMLElement;
  document.body.prepend(anchor);
  anchor.click();
  anchor.remove();
}
