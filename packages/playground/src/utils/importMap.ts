import type { ImportMapState } from 'solid-repl/src/kernel/importMap';

// Versioned in lockstep with solid-js — their npm `latest` tags point at stale experimental
// builds. @solidjs/router etc. version independently and must not be in this list.
const SOLID_FAMILY = ['solid-js', '@solidjs/web', '@solidjs/signals'];

export const isSolidV2 = (solidVersion: string | undefined) => !!solidVersion && parseInt(solidVersion, 10) >= 2;

export const solidFamily = (solidVersion: string | undefined) =>
  isSolidV2(solidVersion) ? SOLID_FAMILY : ['solid-js'];

const solidWebAlias = (importee: string, isV2: boolean) => {
  const [from, to] = isV2 ? ['solid-js/web', '@solidjs/web'] : ['@solidjs/web', 'solid-js/web'];
  return importee === from || importee.startsWith(`${from}/`) ? to + importee.slice(from.length) : undefined;
};

export function migrateWebImports(source: string, isV2: boolean): string {
  return source.replace(/(['"])([^'"\n]+)\1/g, (match, quote: string, spec: string) => {
    const target = solidWebAlias(spec, isV2);
    return target ? quote + target + quote : match;
  });
}

export function moduleUrl(importee: string, solidVersion: string | undefined) {
  const family = solidFamily(solidVersion);

  // ?external keeps family imports as bare specifiers so they resolve back through this map;
  // without it the graph ends up with duplicate runtime copies and reactivity silently breaks.
  const external = (self?: string) => {
    const rest = family.filter((pkg) => pkg !== self);
    return rest.length ? `?external=${rest.join(',')}` : '';
  };

  const target = solidWebAlias(importee, isSolidV2(solidVersion)) ?? importee;
  const version = solidVersion ? `@${solidVersion}` : '';

  for (const pkg of family) {
    if (target === pkg || target.startsWith(`${pkg}/`)) {
      return `https://esm.sh/${pkg}${version}${target.slice(pkg.length)}${external(pkg)}`;
    }
  }
  return `https://esm.sh/${importee}${external()}`;
}

// Unpinned entries are rewritten to their canonical URL; pinned entries are never touched.
export function migrateImportMap(state: ImportMapState, solidVersion: string | undefined): ImportMapState | undefined {
  const pinned = new Set(state.pinned);
  const imports: Record<string, string> = {};
  let changed = false;

  for (const [specifier, url] of Object.entries(state.imports)) {
    if (pinned.has(specifier)) {
      imports[specifier] = url;
      continue;
    }
    const canonical = moduleUrl(specifier, solidVersion);
    imports[specifier] = canonical;
    if (canonical !== url) changed = true;
  }

  for (const pkg of solidFamily(solidVersion).concat('solid-js/web')) {
    if (!(pkg in imports)) {
      imports[pkg] = moduleUrl(pkg, solidVersion);
      changed = true;
    }
  }

  return changed ? { imports, pinned: state.pinned } : undefined;
}
