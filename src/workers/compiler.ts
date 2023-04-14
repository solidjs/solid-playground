import type { ImportMap, Tab } from 'solid-repl';

import { transform } from '@babel/standalone';
// @ts-ignore
import babelPresetSolid from 'babel-preset-solid';
// @ts-ignore
import { rollup, Plugin } from '@rollup/browser';
import dd from 'dedent';
import { bundle } from './bundler';

export const CDN_URL = (importee: string) => `https://jspm.dev/${importee}`;

const tabsLookup = new Map<string, Tab>();

function uid(str: string) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}
let importMap: ImportMap = {};
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
    const cdn_url = CDN_URL(importee);
    importMap[importee] = cdn_url;
    // NPM module via ESM CDN
    return {
      id: importee,
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
      let { code: transformedCode } = transform(code, {
        presets: [
          [babelPresetSolid, { generate: 'dom', hydratable: false }],
          ['typescript', { onlyRemoveTypeImports: true }],
        ],
        filename: filename + '.tsx',
      });
      if (transformedCode) return { code: transformedCode };
    }
  },
};

async function compile(tabs: Tab[], event: string) {
  const tabsRecord: Record<string, string> = {};
  for (const tab of tabs) {
    tabsRecord[`./${tab.name.replace(/.(tsx|jsx)$/, '')}`] = tab.source;
    tabsLookup.set(`./${tab.name.replace(/.(tsx|jsx)$/, '')}`, tab);
  }
  importMap = {};

  const output = bundle('./main', tabsRecord);
  console.log(output);
  const code = output[0] as string;
  importMap = output[1] as ImportMap;
  if (event === 'ROLLUP') {
    return { event, compiled: code.replace('render(', 'window.dispose = render('), import_map: importMap };
  }
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
    if (event === 'BABEL') {
      self.postMessage(await babel(tab, compileOpts));
    } else if (event === 'ROLLUP' || event === 'IMPORTS') {
      self.postMessage(await compile(tabs, event));
    }
  } catch (e) {
    self.postMessage({ event: 'ERROR', error: (e as Error).message });
  }
});

export {};
