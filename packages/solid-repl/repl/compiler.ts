import type { Tab } from 'solid-repl';

import { transform } from '@babel/standalone';
// @ts-ignore
import babelPresetSolid from 'babel-preset-solid';

import dd from 'dedent';

function uid(str: string) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}

function babelTransform(filename: string, code: string, externals: Record<string, string>) {
  const handleImportee = (node: { value: string } | null | undefined) => {
    if (!node || typeof node.value !== 'string') return;
    const importee = node.value;
    if (importee.startsWith('.')) {
      node.value = 'solidrepl:' + importee;
    } else if (!importee.includes('://')) {
      if (!(importee in externals)) externals[importee] = `https://esm.sh/${importee}`;
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

function transformTab(tab: Tab, externals: Record<string, string>): string {
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
  return babelTransform(tab.name, tab.source, externals);
}

function compile(tabs: Tab[], event: string) {
  const externals: Record<string, string> = {};
  const compiled: Record<string, string> = {};
  for (const tab of tabs) {
    const key = `./${tab.name.replace(/\.(tsx|jsx)$/, '')}`;
    compiled[key] = transformTab(tab, externals);
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
  const { event, tabs, tab, compileOpts } = data;

  try {
    if (event === 'BABEL') {
      self.postMessage(babel(tab, compileOpts));
    } else if (event === 'ROLLUP') {
      self.postMessage(compile(tabs, event));
    }
  } catch (e) {
    self.postMessage({ event: 'ERROR', error: e });
  }
});

export {};
