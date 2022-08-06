import pkg from '../../package.json';
import type { Tab } from 'solid-repl';
import dedent from 'dedent';
import { CDN_URL } from '../../src/workers/compiler';

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

    <script type="module" src="./src/${tabs[0].name}.tsx"></script>
  </body>
</html>
`;

/**
 * This function extracts the name and version of an imported
 * package, returning an array [name, version], in case the
 * import si written as name@version, or otherwhise as [name, '']
 */
 function extractNameAndVersionFromImportPath(importPath: string): string[] {
    const withoutCDN = importPath.startsWith(CDN_URL)
      ? importPath.split(`${CDN_URL}/`)[1]
      : importPath
    const withoutCDNSplitted = withoutCDN.split('/')

    const rawName = withoutCDN.startsWith('@')
      ? `${withoutCDNSplitted[0]}/${withoutCDNSplitted[1]}`
      : withoutCDNSplitted[0]
    const rawNameSplitted = rawName.split('@')

    const name = rawName.startsWith('@')
      ? `@${rawNameSplitted[1]}`
      : rawNameSplitted[0]

    const version = name.startsWith('@')
      ? (rawNameSplitted[2] ?? '')
      : (rawNameSplitted[1] ?? '')

    return [name, version]
  }

/**
 * This function sends a request to skypack in order to get
 * the latest version of a pkg, which will be included in
 * the initial comment in skypack's response
 */
  function getLatestVersion(pkgName: string): Promise<string[]> {
    return fetch(`${CDN_URL}/${pkgName}`)
      .then(res => res.text())
      .then(data => {
        const pkgFound = '/*\n * Skypack CDN - ' + pkgName + '@'
        const withPkgError = '/*\n * [Package Error] "' + pkgName + '@v'

        if (data.startsWith(pkgFound)) return [pkgName, data.split(pkgFound)[1].split('\n')[0]]
        // sometmes skypack cannot compile certains packages, but will still give us the vesion
        if (data.startsWith(withPkgError)) return [pkgName, data.split(withPkgError)[1].split('"')[0]]

        return [pkgName, 'latest']
      })
      .catch(() => [pkgName, 'latest'])
  }
/**
 * This function will calculate the dependencies of the
 * package.json by using the imports list provided by rollup,
 * and then generating the package.json itself, for the exoport
 */
  async function packageJSON(imports: string[]): Promise<string> {
    const versionRequests: Promise<string[]>[] = []

    const depsFirstDraft = ([...new Set(imports)] as string[]).reduce((acc, importPath): Record<string, string> => {
      const [name, version]: string[] = extractNameAndVersionFromImportPath(importPath)

      if (acc[name]) return acc

      if (!version) versionRequests.push(getLatestVersion(name))

      acc[name] = version
      return acc
    }, {} as Record<string, string>)

    const deps = await Promise.all(versionRequests).then(values =>
      values.reduce((acc, value) => {
        const [name, version] = value
        acc[name] = version
        return acc
      }, depsFirstDraft)
    )

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
export async function exportToZip(tabs: Tab[], imports: string[]): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  // basic structure
  zip.file('index.html', indexHTML(tabs));
  zip.file('package.json', await packageJSON(imports));
  zip.file('vite.config.ts', viteConfigFile);
  zip.file('tsconfig.json', tsConfig);
  for (const tab of tabs) {
    zip.file(tab.name, tab.source);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);

  const anchor = (<a href={url} target="_blank" rel="noopener" download="solid-playground-poject" />) as HTMLElement;
  document.body.prepend(anchor);
  anchor.click();
  anchor.remove();
}
