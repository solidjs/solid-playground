import type { Tab } from '../';

import { transform } from '@babel/standalone';
// @ts-ignore
import babelPresetSolid from 'babel-preset-solid';
// @ts-ignore
import { rollup } from 'rollup/dist/es/rollup.browser.js';
import dd from 'dedent';
import type { Plugin } from 'rollup';

const CDN_URL = 'https://cdn.skypack.dev';

const tabsLookup = new Map<string, Tab>();
let tabsOutput: { [key: string]: string } = {};

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
    if (importee.startsWith('.')) return importee.replace('.tsx', '') + '.tsx';

    // External URL
    if (importee.includes('://')) {
      return {
        id: importee,
        external: true,
      };
    }

    // NPM module via ESM CDN
    return {
      id: `${CDN_URL}/${importee}`,
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
    if (/\.(j|t)sx$/.test(filename)) {
      let transformed = transform(code, {
        presets: [
          [babelPresetSolid, { generate: 'dom', hydratable: false }],
          ['typescript', { onlyRemoveTypeImports: true }],
        ],
        filename,
      });
      tabsOutput[filename] = transformed.code;
      return transformed;
    }
  },
};

async function compile(tabs: Tab[]) {
  tabsOutput = {};
  tabsLookup.clear();
  for (const tab of tabs) {
    tabsLookup.set(`./${tab.name}`, tab);
  }

  const compiler = await rollup({
    input: `./${tabs[0].name}`,
    plugins: [replPlugin],
  });

  const {
    output: [{ code }],
  } = await compiler.generate({ format: 'esm', inlineDynamicImports: true });

  return { event: 'ROLLUP', compiled: code as string, tabs: tabsOutput };
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
    return { event: 'ERROR', error: (e as Error).message };
  }
});

export {};
