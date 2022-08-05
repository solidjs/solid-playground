import type { Tab } from 'solid-repl';

import { transform } from '@babel/standalone';
// @ts-ignore
import babelPresetSolid from 'babel-preset-solid';
// @ts-ignore
import { rollup } from 'rollup/dist/es/rollup.browser.js';
import dd from 'dedent';
import type { Plugin } from 'rollup';

const CDN_URL = (importee: string) => `https://esm.sh/${importee}?dev`;

const tabsLookup = new Map<string, Tab>();

function uid(str: string) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}

/**
 * This is a custom rollup plugin to handle tabs as a
 * virtual file system and replacing every non-URL import with an
 * ESM CDN import.
 */
const replPlugin: Plugin = {
  name: 'repl-plugin',

  async resolveId(importee: string) {
    // This is a tab being imported
    if (importee.startsWith('.') && importee.endsWith('.css')) return importee;
    if (importee.startsWith('.')) return importee;

    // External URL
    if (importee.includes('://')) {
      return {
        id: importee,
        external: true,
      };
    }

    // NPM module via ESM CDN
    return {
      id: CDN_URL(importee),
      external: true,
    };
  },

  async load(id: string) {
    return tabsLookup.get(id)?.source;
  },

  async transform(code: string, filename: string) {
    if (/\.css$/.test(filename)) {
      const id = uid(filename);

      return {
        code: dd`
          (() => {
            let stylesheet = document.getElementById('${id}');
            if (!stylesheet) {
              stylesheet = document.createElement('style')
              stylesheet.setAttribute('id', ${id})
              document.head.appendChild(stylesheet)
            }
            const styles = document.createTextNode(\`${code}\`)
            stylesheet.innerHTML = ''
            stylesheet.appendChild(styles)
          })()
        `,
      };
    }

    // Compile solid code
    else if (filename.startsWith('.')) {
      let transformed = transform(code, {
        presets: [
          [babelPresetSolid, { generate: 'dom', hydratable: false }],
          ['typescript', { onlyRemoveTypeImports: true }],
        ],
        filename: filename + '.tsx',
      });
      return transformed;
    }
  },
};

async function compile(tabs: Tab[]) {
  for (const tab of tabs) {
    tabsLookup.set(`./${tab.name.replace(/.(tsx|jsx)$/, '')}`, tab);
  }

  const compiler = await rollup({
    input: `./${tabs[0].name.replace(/.(tsx|jsx)$/, '')}`,
    plugins: [replPlugin],
  });

  const {
    output: [{ code }],
  } = await compiler.generate({ format: 'esm', inlineDynamicImports: true });

  return { event: 'ROLLUP', compiled: code as string };
}

async function babel(tab: Tab, compileOpts: any) {
  const { code } = await transform(tab.source, {
    presets: [
      [babelPresetSolid, compileOpts],
      ['typescript', { onlyRemoveTypeImports: true }],
    ],
    filename: tab.name,
  });
  return { event: 'BABEL', compiled: code };
}

self.addEventListener('message', async ({ data }) => {
  const { event, tabs, tab, compileOpts } = data;

  try {
    switch (event) {
      case 'ROLLUP':
        self.postMessage(await compile(tabs));
        break;
      case 'BABEL':
        self.postMessage(await babel(tab, compileOpts));
        break;
    }
  } catch (e) {
    self.postMessage({ event: 'ERROR', error: (e as Error).message });
  }
});

export {};
