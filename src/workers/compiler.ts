import type { Tab } from 'solid-repl';

import { transform } from '@babel/standalone';
// @ts-ignore
import babelPresetSolid from 'babel-preset-solid';

import { bundle } from './bundler';

async function compile(tabs: Tab[], event: string) {
  const tabsRecord: Record<string, string> = {};
  for (const tab of tabs) {
    tabsRecord[`./${tab.name.replace(/.(tsx|jsx)$/, '')}`] = tab.source;
  }
  const bundled = bundle('./main', tabsRecord);
  return { event, compiled: bundled };
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
    } else if (event === 'ROLLUP') {
      self.postMessage(await compile(tabs, event));
    }
  } catch (e) {
    self.postMessage({ event: 'ERROR', error: e });
  }
});

export {};
