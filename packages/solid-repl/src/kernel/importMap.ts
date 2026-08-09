// Pinned in lockstep with solid-js — their npm `latest` tags point at stale experimental
// builds. @solidjs/router etc. version independently and must not be pinned.
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

export function isGeneratedUrl(file: string, url: string): boolean {
  if (url === `https://jspm.dev/${file}`) return true;

  const parsed = URL.parse(url);
  if (parsed?.origin !== 'https://esm.sh') return false;
  // `deps` is the legacy scheme.
  if (parsed.search && ![...parsed.searchParams.keys()].every((key) => key === 'deps' || key === 'external')) {
    return false;
  }

  const path = parsed.pathname.slice(1);
  const alias = solidWebAlias(file, true) ?? solidWebAlias(file, false);
  const targets = alias ? [file, alias] : [file];

  return targets.some((target) => {
    const pkg = target.split('/', target.startsWith('@') ? 2 : 1).join('/');
    const subpath = target.slice(pkg.length);
    if (!path.endsWith(subpath)) return false;
    const head = path.slice(0, path.length - subpath.length);
    return head === pkg || (head.startsWith(`${pkg}@`) && !head.slice(pkg.length).includes('/'));
  });
}

// Generated entries are re-pointed or dropped; user-edited entries survive untouched.
export function mergeImportMap(
  current: Record<string, string>,
  externals: Record<string, string>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [file, url] of Object.entries(current)) {
    if (!isGeneratedUrl(file, url)) map[file] = url;
    else if (file in externals) map[file] = externals[file];
  }
  for (const [file, url] of Object.entries(externals)) {
    if (!(file in map)) map[file] = url;
  }
  return map;
}
