import type { Tab } from '../src/types';

import { transform } from '@babel/standalone';
import type { PluginAPI, PluginTarget, Visitor } from '@babel/core';
import type { Node } from '@babel/types';
// @ts-ignore
import solidBabelPlugin from '@solidjs/babel-plugin';
import babelSyntaxJsx from '@babel/plugin-syntax-jsx';

import { serveWorker } from '../src/kernel/workerServer';
import { version as bundledVersion } from '@solidjs/babel-plugin/package.json';
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

type BabelOptions = NonNullable<Parameters<typeof transform>[1]>;
type PluginItem = NonNullable<BabelOptions['plugins']>[number];
type PresetItem = NonNullable<BabelOptions['presets']>[number];

const WEB_MODULES = new Set(['@solidjs/web', 'solid-js/web']);

type SolidCompiler = { solid: PluginTarget; isPlugin: boolean };

const solidCache = new Map<string, Promise<SolidCompiler>>();

const bundled: SolidCompiler = { solid: solidBabelPlugin, isPlugin: true };

function loadSolid(version: string | undefined): Promise<SolidCompiler> {
  if (!version || version === bundledVersion) return Promise.resolve(bundled);
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

const babelOptions = (
  { solid, isPlugin }: SolidCompiler,
  options: SolidCompileOptions,
  plugins: PluginItem[] = [],
): { plugins: PluginItem[]; presets: PresetItem[] } => {
  const entry: PluginItem = [solid, options];
  const typescript: PresetItem = ['typescript', { onlyRemoveTypeImports: true }];
  return {
    plugins: [babelSyntaxJsx, ...plugins, ...(isPlugin ? [entry] : [])],
    presets: [...(isPlugin ? [] : [entry as PresetItem]), typescript],
  };
};

function babelTransform(filename: string, code: string, externals: Set<string>, compiler: SolidCompiler) {
  const handleImportee = (node: Node | null | undefined) => {
    if (node?.type !== 'StringLiteral') return;
    const importee = node.value;
    if (importee.startsWith('.')) {
      node.value = 'solidrepl:' + importee;
    } else if (!importee.includes('://')) {
      externals.add(importee);
    }
  };

  const importRewriter = ({ types: t }: PluginAPI): { visitor: Visitor } => ({
    visitor: {
      CallExpression(path) {
        const callee = path.get('callee');
        if (!callee.isIdentifier() || !path.parentPath.isExpressionStatement()) return;
        const binding = path.scope.getBinding(callee.node.name)?.path;
        if (!binding?.isImportSpecifier() || !binding.parentPath.isImportDeclaration()) return;
        const imported = binding.node.imported;
        const name = imported.type === 'Identifier' ? imported.name : imported.value;
        if (name !== 'render' || !WEB_MODULES.has(binding.parentPath.node.source.value)) return;
        path.replaceWith(
          t.assignmentExpression('=', t.memberExpression(t.identifier('window'), t.identifier('dispose')), path.node),
        );
      },
      Import(path) {
        if (path.parent.type === 'CallExpression') handleImportee(path.parent.arguments[0]);
      },
      ImportExpression(path) {
        handleImportee(path.node.source);
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
  });

  return transform(code, {
    ...babelOptions(compiler, { generate: 'dom', hydratable: false }, [importRewriter]),
    filename,
  })!.code!;
}

function transformTab(tab: Tab, externals: Set<string>, compiler: SolidCompiler): string {
  if (tab.name.endsWith('.css')) {
    const id = JSON.stringify(tab.name);
    return `(() => {
  let stylesheet = document.getElementById(${id});
  if (!stylesheet) {
    stylesheet = document.createElement('style');
    stylesheet.id = ${id};
    document.head.appendChild(stylesheet);
  }
  stylesheet.textContent = ${JSON.stringify(tab.source)};
})()`;
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
  const compiler = await loadSolid(version);
  const code = transform(tab.source, { ...babelOptions(compiler, compileOpts), filename: tab.name })?.code;
  return { compiled: code };
}

serveWorker({
  COMPILE: ({ tabs, version }: { tabs: Tab[]; version?: string }) => compile(tabs, version),
  BABEL: ({ tab, compileOpts, version }: { tab: Tab; compileOpts: SolidCompileOptions; version?: string }) =>
    babel(tab, compileOpts, version),
});
