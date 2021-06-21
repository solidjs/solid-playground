import type { Tab } from '../';
import pkg from '../../package.json';

import { transform } from '@babel/standalone';
// @ts-ignore
import babelPresetSolid from 'babel-preset-solid';
// @ts-ignore
import { rollup } from 'rollup/dist/es/rollup.browser.js';
import dd from 'dedent';

type TransformFunction = (code: string, opts: { babel: any; solid: any }) => any;

globalThis.window = globalThis as typeof window;

const CDN_URL = 'https://cdn.skypack.dev';
const SOLID_VERSION = pkg.dependencies['solid-js'];

const tabsLookup = new Map<string, Tab>();
const versionManager = new Map<string, TransformFunction>();

function uid(str: string) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}

async function loadBabel(solidVersion: string) {
  if (versionManager.has(solidVersion)) {
    return versionManager.get(solidVersion)!;
  }

  let solid: any;

  try {
    const preset =
      solidVersion === SOLID_VERSION
        ? await Promise.resolve({ default: babelPresetSolid })
        : await import(/* @vite-ignore */ `https://esm.sh/babel-preset-solid@${solidVersion}`);

    solid = preset.default;
  } catch {
    solid = babelPresetSolid;
  }

  const babel = (code: string, opts: { babel: any; solid: any } = { babel: {}, solid: {} }) =>
    transform(code, {
      presets: [
        [solid, { ...opts.solid }],
        ['typescript', { onlyRemoveTypeImports: true }],
      ],
      ...opts.babel,
    });

  versionManager.set(solidVersion, babel);

  return babel;
}

/**
 * This function helps identify each section of the final compiled
 * output from the rollup concatenation.
 *
 * @param tab {Tab} - A tab
 */
function generateCodeString(tab: Tab) {
  return `/* source: ${tab.name}.${tab.type} */\n${tab.source}`;
}

/**
 * This is a custom rollup plugin to handle tabs as a
 * virtual file system and replacing every imports with a
 * ESM CDN import.
 *
 * Note: Passing in the Solid Version for letter use
 */
function virtual({
  solidVersion,
  solidOptions = {},
}: {
  solidVersion: string;
  solidOptions: unknown;
}) {
  return {
    name: 'repl-plugin',

    async resolveId(importee: string) {
      if (importee.startsWith('.') && importee.endsWith('.css')) return importee;
      // This is a tab being imported
      if (importee.startsWith('.')) return importee.replace('.tsx', '') + '.tsx';

      // This is an external module
      return {
        id: `${CDN_URL}/${importee.replace('solid-js', `solid-js@${solidVersion}`)}`,
        external: true,
      };
    },

    async load(id: string) {
      const tab = tabsLookup.get(id);
      return tab ? generateCodeString(tab) : null;
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
        const babel = await loadBabel(solidVersion);

        // This regex will extract whatever variable is imported from a relative file
        // and output it to a random variable so that it's not treeshaken out by babel
        // eg: import accordion from './accordion' will output `var _qwkdop12 = accordion
        const importSpecifiersRegex =
          /^import(?:\s+)((?:\w|{|}|:|,|\s)+)(?:\s+from\s+)(?:'|")(?:\.\/)\w+(?:'|")/gm;
        const importSpecifiers = Array.from(code.matchAll(importSpecifiersRegex));
        const patchedCode = importSpecifiers.reduce((hackedCode, match) => {
          // If we don't have a specifier, skip that match
          if (!match[1]) return hackedCode;

          // Generate a random string
          const random = '_' + Math.random().toString(36).substring(7);
          return hackedCode + `\nvar ${random} = ${match[1]};\n`;
        }, code);

        return babel(patchedCode, { solid: solidOptions, babel: { filename } });
      }
    },
  };
}

async function compile(
  tabs: Tab[],
  solidOptions = {},
  solidVersion: string,
): Promise<[string, null] | [null, string]> {
  try {
    for (const tab of tabs) {
      tabsLookup.set(`./${tab.name}.${tab.type}`, tab);
    }

    const compiler = await rollup({
      input: `./${tabs[0].name}`,
      plugins: [virtual({ solidVersion: solidVersion, solidOptions })],
    });

    const {
      output: [{ code }],
    } = await compiler.generate({ format: 'esm', inlineDynamicImports: true });

    return [null, code as string];
  } catch (e) {
    return [e.message, null];
  }
}

self.addEventListener('message', async ({ data }) => {
  const { event, tabs, compileOpts, solidVersion = SOLID_VERSION } = data;

  switch (event) {
    case 'COMPILE':
      // @ts-ignore
      self.postMessage({
        event: 'RESULT',
        result: await compile(tabs, compileOpts, solidVersion),
      });
      break;
  }
});

export {};
