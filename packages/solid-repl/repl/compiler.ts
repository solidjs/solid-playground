import type { Tab } from 'solid-repl';

import { transform } from '@babel/standalone';
// @ts-ignore
import babelPresetSolid from 'babel-preset-solid';

import dd from 'dedent';

type SolidVersion = 'v1' | 'v2';

const solidPackages = {
  v1: {
    solid: 'solid-js@1.9.12',
    web: 'solid-js@1.9.12/web',
  },
  v2: {
    solid: 'solid-js@2.0.0-beta.10',
    web: '@solidjs/web@2.0.0-beta.10?deps=solid-js@2.0.0-beta.10',
  },
} as const;

const appendSolidPeer = (url: string, version: SolidVersion) => {
  const solid = solidPackages[version].solid;
  return `${url}${url.includes('?') ? '&' : '?'}deps=${solid}`;
};

const resolveExternal = (importee: string, version: SolidVersion) => {
  const packages = solidPackages[version];

  if (importee === 'solid-js') return `https://esm.sh/${packages.solid}`;
  if (importee === 'solid-js/web' || importee === '@solidjs/web') return `https://esm.sh/${packages.web}`;

  if (importee.startsWith('solid-js/')) {
    return `https://esm.sh/${packages.solid}/${importee.slice('solid-js/'.length)}`;
  }

  if (importee.startsWith('@solidjs/web/')) {
    return appendSolidPeer(`https://esm.sh/@solidjs/web@2.0.0-beta.10/${importee.slice('@solidjs/web/'.length)}`, version);
  }

  return appendSolidPeer(`https://esm.sh/${importee}`, version);
};

function uid(str: string) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}

function babelTransform(filename: string, code: string, externals: Record<string, string>, solidVersion: SolidVersion) {
  const handleImportee = (node: { value: string } | null | undefined) => {
    if (!node || typeof node.value !== 'string') return;
    const importee = node.value;
    if (importee.startsWith('.')) {
      node.value = 'solidrepl:' + importee;
    } else if (!importee.includes('://')) {
      if (!(importee in externals)) externals[importee] = resolveExternal(importee, solidVersion);
    }
  };

  let { code: transformedCode } = transform(code, {
    plugins: [
      function importRewriter() {
        return {
          visitor: {
            Import(path: any) {
              handleImportee(path.parent.arguments[0]);
            },
            ImportDeclaration(path: any) {
              handleImportee(path.node.source);
            },
            ExportAllDeclaration(path: any) {
              handleImportee(path.node.source);
            },
            ExportNamedDeclaration(path: any) {
              handleImportee(path.node.source);
            },
          },
        };
      },
    ],
    presets: [
      [babelPresetSolid, { generate: 'dom', hydratable: false }],
      ['typescript', { onlyRemoveTypeImports: true }],
    ],
    filename: filename + '.tsx',
  });

  return transformedCode!.replace('render(', 'window.dispose = render(');
}

function transformTab(tab: Tab, externals: Record<string, string>, solidVersion: SolidVersion): string {
  if (tab.name.endsWith('.css')) {
    const id = uid(tab.name);
    return dd`
      (() => {
        let stylesheet = document.getElementById('${id}');
        if (!stylesheet) {
          stylesheet = document.createElement('style')
          stylesheet.setAttribute('id', '${id}')
          document.head.appendChild(stylesheet)
        }
        const styles = document.createTextNode(\`${tab.source.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\`)
        stylesheet.innerHTML = ''
        stylesheet.appendChild(styles)
      })()
    `;
  }
  return babelTransform(tab.name, tab.source, externals, solidVersion);
}

function compile(tabs: Tab[], event: string, solidVersion: SolidVersion) {
  const externals: Record<string, string> = {};
  const compiled: Record<string, string> = {};
  for (const tab of tabs) {
    const key = `./${tab.name.replace(/\.(tsx|jsx)$/, '')}`;
    compiled[key] = transformTab(tab, externals, solidVersion);
  }
  return { event, compiled, externals };
}

function babel(tab: Tab, compileOpts: any) {
  const { code } = transform(tab.source, {
    presets: [
      [babelPresetSolid, compileOpts],
      ['typescript', { onlyRemoveTypeImports: true }],
    ],
    filename: tab.name,
  });
  return { event: 'BABEL', compiled: code };
}

self.addEventListener('message', ({ data }) => {
  const { event, tabs, tab, compileOpts, solidVersion = 'v1' } = data;

  try {
    if (event === 'BABEL') {
      self.postMessage(babel(tab, compileOpts));
    } else if (event === 'ROLLUP') {
      self.postMessage(compile(tabs, event, solidVersion));
    }
  } catch (e) {
    self.postMessage({ event: 'ERROR', error: e });
  }
});

export {};
