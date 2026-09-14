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

// Stable package patch numbers drift from solid-js (1.9.14 vs 1.9.12), so resolve by major.minor.
const specFor = (version: string) => (version.includes('-') ? version : version.split('.').slice(0, 2).join('.'));

// The compiler moved from babel-preset-solid to @solidjs/babel-plugin at 2.0.0-rc.2.
const usesBabelPlugin = (version: string) => {
  const [core, pre] = version.split('-');
  const [major = 0, minor = 0, patch = 0] = core.split('.').map(Number);
  if (major !== 2 || minor !== 0 || patch !== 0) return major >= 2;
  if (!pre) return true;
  const rc = /^rc\.(\d+)$/.exec(pre);
  return !!rc && Number(rc[1]) >= 2;
};

type SolidCompiler = { solid: object; isPlugin: boolean };

const solidCache = new Map<string, Promise<SolidCompiler>>();

function loadSolid(version: string | undefined): Promise<SolidCompiler> {
  if (!version) return Promise.resolve({ solid: babelPresetSolid, isPlugin: false });
  let cached = solidCache.get(version);
  if (!cached) {
    const isPlugin = usesBabelPlugin(version);
    const pkg = isPlugin ? '@solidjs/babel-plugin' : 'babel-preset-solid';
    const spec = specFor(version);
    cached = import(/* @vite-ignore */ `https://esm.sh/${pkg}@${spec}`).then(
      (m) => ({ solid: m.default ?? m, isPlugin }),
      (e) => {
        solidCache.delete(version);
        throw new Error(`Failed to load ${pkg}@${spec}: ${e instanceof Error ? e.message : e}`);
      },
    );
    solidCache.set(version, cached);
  }
  return cached;
}

function uid(str: string) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}

function babelTransform(filename: string, code: string, externals: Set<string>, { solid, isPlugin }: SolidCompiler) {
  const handleImportee = (node: Node | null | undefined) => {
    if (node?.type !== 'StringLiteral') return;
    const importee = node.value;
    if (importee.startsWith('.')) {
      node.value = 'solidrepl:' + importee;
    } else if (!importee.includes('://')) {
      externals.add(importee);
    }
  };

  const solidEntry = [solid, { generate: 'dom', hydratable: false }];
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
      ...(isPlugin ? [solidEntry] : []),
    ],
    presets: [...(isPlugin ? [] : [solidEntry]), ['typescript', { onlyRemoveTypeImports: true }]],
    filename,
  });

  return transformedCode!.replace('render(', 'window.dispose = render(');
}

function transformTab(tab: Tab, externals: Set<string>, compiler: SolidCompiler): string {
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
  return babelTransform(tab.name, tab.source, externals, compiler);
}

async function compile(tabs: Tab[], version: string | undefined) {
  const compiler = await loadSolid(version);
  const externals = new Set<string>();
  const compiled: Record<string, string> = {};
  for (const tab of tabs) {
    const key = `./${tab.name.replace(/\.(tsx|jsx)$/, '')}`;
    compiled[key] = transformTab(tab, externals, compiler);
  }
  return { compiled, externals: [...externals] };
}

async function babel(tab: Tab, compileOpts: SolidCompileOptions, version: string | undefined) {
  const { solid, isPlugin } = await loadSolid(version);
  const solidEntry = [solid, compileOpts];
  const { code } = transform(tab.source, {
    plugins: [babelSyntaxJsx, ...(isPlugin ? [solidEntry] : [])],
    presets: [...(isPlugin ? [] : [solidEntry]), ['typescript', { onlyRemoveTypeImports: true }]],
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
