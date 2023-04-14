import type { ImportMap, Tab } from 'solid-repl';

import { transform } from '@babel/standalone';
// @ts-ignore
import babelPresetSolid from 'babel-preset-solid';

import { bundle } from './bundler';

export const CDN_URL = (importee: string) => `https://jspm.dev/${importee}`;

const tabsLookup = new Map<string, Tab>();

function uid(str: string) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}
let importMap: ImportMap = {};

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
