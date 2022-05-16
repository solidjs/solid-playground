import type { Tab } from '../';

import { transform } from '@babel/standalone';
// @ts-ignore
import babelPresetSolid from 'babel-preset-solid';
// @ts-ignore
import { rollup } from 'rollup/dist/es/rollup.browser.js';
import dd from 'dedent';

const CDN_URL = 'https://cdn.skypack.dev';

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
 *
 * Note: Passing in the Solid Version for later use
 */
function virtual({ solidOptions = {} }: { solidOptions: unknown }) {
  return {
    name: 'repl-plugin',

    async resolveId(importee: string) {
      // This is a tab being imported
      if (importee.startsWith('.') && importee.endsWith('.css')) return importee;
      if (importee.startsWith('.')) return importee.replace('.tsx', '') + '.tsx';

      // External URL
      if (importee.includes('://')) {
        return {
          id: importee,
          external: true
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
        return transform(code, {
          presets: [
            [babelPresetSolid, solidOptions],
            ['typescript', { onlyRemoveTypeImports: true }],
          ],
          filename,
        });
      }
    },
  };
}

async function compile(
  tabs: Tab[],
  solidOptions = {},
): Promise<{ compiled: string } | { error: string }> {
  try {
    for (const tab of tabs) {
      tabsLookup.set(`./${tab.name}.${tab.type}`, tab);
    }

    const compiler = await rollup({
      input: `./${tabs[0].name}`,
      plugins: [virtual({ solidOptions })],
    });

    const {
      output: [{ code }],
    } = await compiler.generate({ format: 'esm', inlineDynamicImports: true });

    return { compiled: code as string };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

self.addEventListener('message', async ({ data }) => {
  const { event, tabs, compileOpts } = data;

  switch (event) {
    case 'COMPILE':
      // @ts-ignore
      self.postMessage({
        event: 'RESULT',
        ...(await compile(tabs, compileOpts)),
      });
      break;
  }
});

export {};
