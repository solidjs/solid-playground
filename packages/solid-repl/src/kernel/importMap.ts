import { createMemo, type Accessor } from 'solid-js';
import type { Tab } from 'solid-repl';

export interface ImportMapState {
  imports: Record<string, string>;
  pinned: string[];
}

// `@solidjs/signals` is externalized too: the v2 preset injects imports of it into
// compiled output after externals are collected, so it must always be in the map.
const EXTERNALIZED = ['solid-js', '@solidjs/web', '@solidjs/signals'];

const isSolidV2 = (solidVersion: string | undefined) => !!solidVersion && parseInt(solidVersion, 10) >= 2;

const solidWebAlias = (importee: string, solidVersion?: string) => {
  const isV2 = isSolidV2(solidVersion);
  const from = isV2 ? 'solid-js/web' : '@solidjs/web';
  const to = isV2 ? '@solidjs/web' : 'solid-js/web';
  if (importee !== from && !importee.startsWith(`${from}/`)) return undefined;
  return to + importee.slice(from.length);
};

function moduleUrl(importee: string, solidVersion?: string) {
  const isV2 = isSolidV2(solidVersion);
  const target = solidWebAlias(importee, solidVersion) ?? importee;

  const family = isV2 ? EXTERNALIZED : ['solid-js'];
  const match = family.find((pkg) => target === pkg || target.startsWith(`${pkg}/`));

  let url = 'https://esm.sh/';
  if (match) {
    url += match + (solidVersion ? `@${solidVersion}` : '') + target.slice(match.length);
  } else {
    url += importee;
  }

  const external = (isV2 ? EXTERNALIZED : ['solid-js']).filter((pkg) => pkg !== match);
  if (external.length) url += `?external=${external.join(',')}`;
  return url;
}

export function parseImportMap(source: string | undefined): ImportMapState {
  const imports: Record<string, string> = {};
  const pinned: string[] = [];
  try {
    const parsed = JSON.parse(source ?? '{}');
    const legacy = !parsed || typeof parsed.imports !== 'object';
    const rawImports = legacy ? parsed : parsed.imports;
    if (rawImports && typeof rawImports === 'object') {
      for (const [name, url] of Object.entries(rawImports)) {
        if (typeof url === 'string') imports[name] = url;
      }
    }
    if (!legacy && Array.isArray(parsed.pinned)) {
      for (const name of parsed.pinned) {
        if (typeof name === 'string' && name in imports) pinned.push(name);
      }
    }
  } catch {}
  return { imports, pinned };
}

function serializeImportMap(state: ImportMapState): string {
  return JSON.stringify({ imports: state.imports, pinned: state.pinned }, null, 2);
}

export function clearUnpinnedImports(source: string): string | undefined {
  const { imports, pinned } = parseImportMap(source);
  const kept = Object.fromEntries(Object.entries(imports).filter(([name]) => pinned.includes(name)));
  if (Object.keys(kept).length === Object.keys(imports).length) return undefined;
  return serializeImportMap({ imports: kept, pinned });
}

function syncEntries(state: ImportMapState, specifiers: string[], solidVersion?: string): ImportMapState {
  const pinned = new Set(state.pinned);
  const imports: Record<string, string> = {};
  for (const [name, url] of Object.entries(state.imports)) {
    if (pinned.has(name) || specifiers.includes(name)) imports[name] = url;
  }
  for (const specifier of specifiers.concat(isSolidV2(solidVersion) ? EXTERNALIZED : ['solid-js', 'solid-js/web'])) {
    imports[specifier] ??= moduleUrl(specifier, solidVersion);
  }
  return { imports, pinned: state.pinned };
}

const IMPORT_MAP_TAB = 'import_map.json';

export interface ImportMapController {
  state: Accessor<ImportMapState>;
  setPackageUrl(name: string, url: string): void;
  addPackage(name: string): void;
  removePackage(name: string): void;
  syncExternals(externals: string[]): void;
}

export interface ImportMapOptions {
  tabs: Accessor<Tab[]>;
  setTabs(tabs: Tab[]): void;
  version: Accessor<string | undefined>;
  onEdit?(): void;
}

export function createImportMap(opts: ImportMapOptions): ImportMapController {
  const state = createMemo(
    () => parseImportMap(opts.tabs().find((tab) => tab.name === IMPORT_MAP_TAB)?.source),
    undefined,
    { equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );

  const write = (next: ImportMapState) => {
    const source = serializeImportMap(next);
    const tabs = opts.tabs();
    const tab = tabs.find((tab) => tab.name === IMPORT_MAP_TAB);
    if (!tab) {
      opts.setTabs(tabs.concat({ name: IMPORT_MAP_TAB, source }));
    } else if (tab.source !== source) {
      tab.source = source;
      opts.setTabs(tabs.slice());
    }
  };

  const edit = (fn: (state: ImportMapState) => ImportMapState) => {
    opts.onEdit?.();
    write(fn(state()));
  };

  let syncedExternals: string | undefined;

  return {
    state,
    setPackageUrl: (name, url) =>
      edit(({ imports, pinned }) => ({
        imports: { ...imports, [name]: url },
        pinned: pinned.includes(name) ? pinned : pinned.concat(name),
      })),
    addPackage: (name) =>
      edit(({ imports, pinned }) => ({
        imports: { ...imports, [name]: moduleUrl(name, opts.version()) },
        pinned: pinned.concat(name),
      })),
    removePackage: (name) =>
      edit(({ imports, pinned }) => {
        const { [name]: _, ...rest } = imports;
        return { imports: rest, pinned: pinned.filter((pkg) => pkg !== name) };
      }),
    syncExternals: (externals) => {
      const current = state();
      const key = [...externals].sort().join(',');
      if (key === syncedExternals && externals.every((specifier) => specifier in current.imports)) return;
      syncedExternals = key;
      write(syncEntries(current, externals, opts.version()));
    },
  };
}
