import type { Tab } from 'solid-repl';

import { transform } from '@babel/standalone';
import type { Visitor } from '@babel/core';
import type { Node } from '@babel/types';
// @ts-ignore
import babelPresetSolid from 'babel-preset-solid';
import babelSyntaxJsx from '@babel/plugin-syntax-jsx';

import dd from 'dedent';

import { serveWorker } from '../src/kernel/workerServer';
import type { SolidCompileOptions } from '../src/components/CompileMode';

// Stable preset patch numbers drift from solid-js (1.9.14 vs 1.9.12), so resolve by major.minor.
const presetSpecFor = (version: string) => (version.includes('-') ? version : version.split('.').slice(0, 2).join('.'));

const presetCache = new Map<string, Promise<object>>();

function loadPreset(version: string | undefined): Promise<object> {
  if (!version) return Promise.resolve(babelPresetSolid);
  let cached = presetCache.get(version);
  if (!cached) {
    const spec = presetSpecFor(version);
    cached = import(/* @vite-ignore */ `https://esm.sh/babel-preset-solid@${spec}`).then(
      (m) => m.default ?? m,
      (e) => {
        presetCache.delete(version);
        throw new Error(`Failed to load babel-preset-solid@${spec}: ${e instanceof Error ? e.message : e}`);
      },
    );
    presetCache.set(version, cached);
  }
  return cached;
}

function uid(str: string) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}

function babelTransform(filename: string, code: string, externals: Set<string>, preset: object) {
  const handleImportee = (node: Node | null | undefined) => {
    if (node?.type !== 'StringLiteral') return;
    const importee = node.value;
    if (importee.startsWith('.')) {
      node.value = 'solidrepl:' + importee;
    } else if (!importee.includes('://')) {
      externals.add(importee);
    }
  };

  let { code: transformedCode } = transform(code, {
    plugins: [
      babelSyntaxJsx,
      function importRewriter(): { visitor: Visitor } {
        return {
          visitor: {
            Import(path) {
              if (path.parent.type === 'CallExpression') handleImportee(path.parent.arguments[0]);
            },
            ImportDeclaration(path) {
              handleImportee(path.node.source);
            },
            ExportAllDeclaration(path) {
              handleImportee(path.node.source);
            },
            ExportNamedDeclaration(path) {
              handleImportee(path.node.source);
            },
          },
        };
      },
    ],
    presets: [
      [preset, { generate: 'dom', hydratable: false }],
      ['typescript', { onlyRemoveTypeImports: true }],
    ],
    filename,
  });

  return transformedCode!.replace('render(', 'window.dispose = render(');
}

function transformTab(tab: Tab, externals: Set<string>, preset: object): string {
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
  return babelTransform(tab.name, tab.source, externals, preset);
}

async function compile(tabs: Tab[], version: string | undefined) {
  const preset = await loadPreset(version);
  const externals = new Set<string>();
  const compiled: Record<string, string> = {};
  for (const tab of tabs) {
    const key = `./${tab.name.replace(/\.(tsx|jsx)$/, '')}`;
    compiled[key] = transformTab(tab, externals, preset);
  }
  return { compiled, externals: [...externals] };
}

async function babel(tab: Tab, compileOpts: SolidCompileOptions, version: string | undefined) {
  const preset = await loadPreset(version);
  const { code } = transform(tab.source, {
    plugins: [babelSyntaxJsx],
    presets: [
      [preset, compileOpts],
      ['typescript', { onlyRemoveTypeImports: true }],
    ],
    filename: tab.name,
  });
  return { compiled: code };
}

serveWorker({
  ROLLUP: ({ tabs, version }: { tabs: Tab[]; version?: string }) => compile(tabs, version),
  BABEL: ({ tab, compileOpts, version }: { tab: Tab; compileOpts: SolidCompileOptions; version?: string }) =>
    babel(tab, compileOpts, version),
});

export {};
