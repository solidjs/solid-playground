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
function packageJSON(imports: string[]): string {
  const deps = imports.reduce(
    (acc, importPath): Record<string, string> => {
      const name = importPath.split('/')[0];
      if (!acc[name]) acc[name] = '*';
      return acc;
    },
    {} as Record<string, string>,
  );

  return JSON.stringify(
    {
      scripts: {
        start: 'vite',
        build: 'vite build',
      },
      dependencies: deps,
      devDependencies: {
        'vite': pkg.devDependencies['vite'],
        'vite-plugin-solid': pkg.devDependencies['vite-plugin-solid'],
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
export async function exportToZip(tabs: Tab[]): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  // basic structure
  zip.file('index.html', indexHTML(tabs));
  zip.file('vite.config.ts', viteConfigFile);
  zip.file('tsconfig.json', tsConfig);
  zip.folder('src');

  for (const tab of tabs) {
    if (tab.name == 'import_map.json') {
      zip.file('package.json', packageJSON(Object.keys(JSON.parse(tab.source))));
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
