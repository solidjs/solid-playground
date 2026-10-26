import pkg from '../../package.json';
import type { Tab } from 'solid-repl/src';
import {
  DEFAULT_SOLID_VERSION,
  IMPORT_MAP_FILE,
  isSolidV2,
  parseImportMap,
  solidVersionFromImportMap,
} from 'solid-repl/src';
import dedent from 'dedent';

const viteConfigFile = (v2: boolean) => dedent`
import { defineConfig } from "vite";
import solidPlugin from "${v2 ? '@solidjs/vite-plugin' : 'vite-plugin-solid'}";

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: "esnext",
  },
});
`;

const tsConfig = (v2: boolean) =>
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
        lib: ['ESNext', 'DOM'],
        rootDir: 'src',
        moduleResolution: 'bundler',
        jsxImportSource: v2 ? '@solidjs/web' : 'solid-js',
      },
    },
    null,
    2,
  );

const entryOf = (tabs: Tab[]) =>
  tabs.find((tab) => tab.name === 'main.tsx') ?? tabs.find((tab) => /\.[tj]sx?$/.test(tab.name)) ?? tabs[0];

const indexHTML = (entry: string) => dedent`
<html>
  <head>
    <title>Vite Sandbox</title>
    <meta charset="UTF-8" />
  </head>

  <body>
    <div id="app"></div>

    <script type="module" src="./src/${entry}"></script>
  </body>
</html>
`;

const packageNameOf = (specifier: string): string | undefined => {
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.includes(':')) return undefined;
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) return parts.length >= 2 && parts[1] ? `${parts[0]}/${parts[1]}` : undefined;
  return parts[0] || undefined;
};

const CDN_PACKAGE_URL =
  /^https:\/\/(?:esm\.sh|cdn\.jsdelivr\.net\/npm|unpkg\.com)\/(@[^/@?]+\/[^/@?]+|[^/@?]+)(?:@([^/?]+))?/;

const versionFromUrl = (url: string, name: string): string | undefined => {
  const match = CDN_PACKAGE_URL.exec(url);
  if (!match || match[1] !== name) return undefined;
  return match[2] ?? 'latest';
};

function manifest(imports: Record<string, string>, solidVersion: string) {
  const v2 = isSolidV2(solidVersion);
  const dependencies: Record<string, string> = {};
  const custom: [string, string][] = [];

  for (const [specifier, url] of Object.entries(imports)) {
    const name = packageNameOf(specifier);
    const version = name && versionFromUrl(url, name);
    if (!name || !version) {
      custom.push([specifier, url]);
      continue;
    }
    dependencies[name] ??= version;
  }

  dependencies['solid-js'] = solidVersion;
  if (v2) dependencies['@solidjs/web'] = solidVersion;
  else delete dependencies['@solidjs/web'];

  const packageJson = JSON.stringify(
    {
      private: true,
      type: 'module',
      scripts: {
        start: 'vite',
        build: 'vite build',
      },
      dependencies,
      devDependencies: {
        vite: pkg.devDependencies['vite'],
        ...(v2
          ? { '@solidjs/vite-plugin': pkg.devDependencies['@solidjs/vite-plugin'] }
          : { 'vite-plugin-solid': '^2.11.14' }),
      },
    },
    null,
    2,
  );
  return { packageJson, custom };
}

const readme = (custom: [string, string][]) => dedent`
# Solid Playground export

\`npm install\`, then \`npm start\` (dev server) or \`npm run build\`.

The import map of this playground also loaded these modules from URLs that are not npm packages on
a known CDN, so they are not in package.json. Install or vendor them yourself:

${custom.map(([specifier, url]) => `- \`${specifier}\`: ${url}`).join('\n')}
`;

export async function exportToZip(tabs: Tab[], previewVersion?: string): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const importMapSource = tabs.find((tab) => tab.name === IMPORT_MAP_FILE)?.source;
  const solidVersion = solidVersionFromImportMap(importMapSource) || previewVersion || DEFAULT_SOLID_VERSION;
  const v2 = isSolidV2(solidVersion);
  const { packageJson, custom } = manifest(parseImportMap(importMapSource).imports, solidVersion);

  zip.file('index.html', indexHTML(entryOf(tabs).name));
  zip.file('vite.config.ts', viteConfigFile(v2));
  zip.file('tsconfig.json', tsConfig(v2));
  zip.file('package.json', packageJson);
  if (custom.length) zip.file('README.md', readme(custom));
  zip.folder('src');
  for (const tab of tabs) {
    if (tab.name !== IMPORT_MAP_FILE) zip.file(`src/${tab.name}`, tab.source);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);

  const anchor = (<a href={url} target="_blank" rel="noopener" download="solid-playground-project" />) as HTMLElement;
  document.body.prepend(anchor);
  anchor.click();
  anchor.remove();
}
