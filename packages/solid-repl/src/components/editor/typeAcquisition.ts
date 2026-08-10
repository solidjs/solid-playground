interface PackageFiles {
  version: string;
  files: Map<string, string>;
  hasTypes: boolean;
}

interface AliasShim {
  host: string;
  subpath: string;
  target: string;
}

const MOUNT_PREFIX = 'file:///node_modules/';
const CDN_PREFIXES = ['https://esm.sh/', 'https://cdn.jsdelivr.net/npm/', 'https://unpkg.com/'];

const MAX_PACKAGES = 24;
const MAX_FILES_PER_PACKAGE = 400;
const MAX_FILE_SIZE = 1_000_000;
const MAX_DEP_DEPTH = 2;
const FETCH_TIMEOUT = 20_000;

const PACKAGE_PATH = /^(@[^@/]+\/[^@/]+|[^@/]+)(?:@([^/]+))?(\/.*)?$/;
const EXACT_VERSION = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
const DECLARATION_FILE = /\.d\.[cm]?ts$/;

const parsePackagePath = (path: string) => {
  const m = path.match(PACKAGE_PATH);
  return m ? { name: m[1], version: m[2] ?? '', subpath: m[3] ?? '' } : undefined;
};

const typesPackageFor = (name: string) =>
  name.startsWith('@') ? `@types/${name.slice(1).replace('/', '__')}` : `@types/${name}`;

const fetchOk = async (url: string) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
};
const fetchJson = <T>(url: string): Promise<T> => fetchOk(url).then((res) => res.json());
const fetchText = (url: string) => fetchOk(url).then((res) => res.text());

const memo = <T>(cache: Map<string, Promise<T>>, key: string, make: () => Promise<T>): Promise<T> => {
  let entry = cache.get(key);
  if (!entry) {
    entry = make();
    entry.catch(() => cache.delete(key));
    cache.set(key, entry);
  }
  return entry;
};

export interface TypeAcquisition {
  sync(importMap: Record<string, string>): Promise<boolean>;
  jsxImportSource(): string | undefined;
}

export function createTypeAcquisition(fsMap: Map<string, string>): TypeAcquisition {
  const bundled = new Map([...fsMap].filter(([key]) => key.startsWith(MOUNT_PREFIX)));

  const versionCache = new Map<string, Promise<string | undefined>>();
  const packageCache = new Map<string, Promise<PackageFiles>>();

  const resolveVersion = (name: string, range: string) =>
    EXACT_VERSION.test(range)
      ? Promise.resolve(range)
      : memo(versionCache, `${name}@${range}`, async () => {
          const resolved = await fetchJson<{ version: string | null }>(
            `https://data.jsdelivr.com/v1/packages/npm/${name}/resolved${range ? `?specifier=${encodeURIComponent(range)}` : ''}`,
          );
          return resolved.version ?? undefined;
        });

  const fetchPackage = (name: string, version: string) => {
    const spec = `${name}@${version}`;
    return memo(packageCache, spec, async (): Promise<PackageFiles> => {
      const listing = await fetchJson<{ files: { name: string; size: number }[] }>(
        `https://data.jsdelivr.com/v1/package/npm/${spec}/flat`,
      );
      const wanted = listing.files
        .filter((f) => (f.name === '/package.json' || DECLARATION_FILE.test(f.name)) && f.size <= MAX_FILE_SIZE)
        .slice(0, MAX_FILES_PER_PACKAGE);
      const files = new Map(
        await Promise.all(
          wanted.map(async (f) => [f.name, await fetchText(`https://cdn.jsdelivr.net/npm/${spec}${f.name}`)] as const),
        ),
      );
      return { version, files, hasTypes: wanted.some((f) => DECLARATION_FILE.test(f.name)) };
    });
  };

  // Dependency ranges must resolve against the pins — `^2.0.0-beta.29` would otherwise land
  // on the parallel `-experimental` prerelease line.
  const parseImportMap = (importMap: Record<string, string>) => {
    const roots = new Map<string, string>();
    const pins = new Map<string, string>();
    const aliases: AliasShim[] = [];

    for (const [specifier, url] of Object.entries(importMap)) {
      const prefix = CDN_PREFIXES.find((p) => url.startsWith(p));
      if (!prefix) continue;
      const parsed = URL.parse(url);
      if (!parsed) continue;

      const target = parsePackagePath(url.slice(prefix.length, url.length - parsed.search.length));
      if (!target) continue;

      for (const dep of parsed.searchParams.get('deps')?.split(',') ?? []) {
        const at = dep.lastIndexOf('@');
        if (at > 0) pins.set(dep.slice(0, at), dep.slice(at + 1));
      }

      const spec = parsePackagePath(specifier);
      if (
        spec &&
        spec.name !== target.name &&
        !aliases.some((a) => a.host === spec.name && a.subpath === spec.subpath)
      ) {
        aliases.push({ host: spec.name, subpath: spec.subpath, target: target.name });
      }

      if (!target.version && bundled.has(`${MOUNT_PREFIX}${target.name}/package.json`)) continue;
      if (!roots.has(target.name)) roots.set(target.name, target.version);
    }

    for (const [name, version] of pins) {
      if (!roots.has(name)) roots.set(name, version);
    }
    return { roots, pins, aliases };
  };

  const collect = async (roots: Map<string, string>, pins: Map<string, string>) => {
    const acquired = new Map<string, PackageFiles>();
    const scheduled = new Set<string>();

    const acquire = async (name: string, range: string, depth: number): Promise<void> => {
      if (scheduled.has(name) || scheduled.size >= MAX_PACKAGES) return;
      scheduled.add(name);

      let pkg: PackageFiles;
      try {
        const version = pins.get(name) ?? (await resolveVersion(name, range));
        if (!version) return;
        pkg = await fetchPackage(name, version);
      } catch {
        return;
      }
      if (pkg.hasTypes) acquired.set(name, pkg);

      const next: Promise<void>[] = [];
      if (!pkg.hasTypes && !name.startsWith('@types/')) {
        next.push(acquire(typesPackageFor(name), '', depth));
      }
      if (depth < MAX_DEP_DEPTH) {
        try {
          const manifest = JSON.parse(pkg.files.get('/package.json') ?? '{}');
          for (const [dep, depRange] of Object.entries<string>(manifest.dependencies ?? {})) {
            next.push(acquire(dep, depRange, depth + 1));
          }
        } catch {}
      }
      await Promise.all(next);
    };

    await Promise.all([...roots].map(([name, range]) => acquire(name, range, 0)));
    return acquired;
  };

  const apply = (packages: Map<string, PackageFiles>, aliases: AliasShim[]) => {
    for (const key of fsMap.keys()) {
      if (key.startsWith(MOUNT_PREFIX)) fsMap.delete(key);
    }
    for (const [key, content] of bundled) {
      const pkg = parsePackagePath(key.slice(MOUNT_PREFIX.length));
      if (!pkg || !packages.has(pkg.name)) fsMap.set(key, content);
    }
    for (const [name, pkg] of packages) {
      for (const [path, content] of pkg.files) fsMap.set(`${MOUNT_PREFIX}${name}${path}`, content);
    }

    // solid 2.x dropped the ./web entry, so the re-export shim must also be patched into the
    // host's exports map or it never resolves.
    for (const { host, subpath, target } of aliases) {
      fsMap.set(`${MOUNT_PREFIX}${host}${subpath}.d.ts`, `export * from '${target}';\n`);
      const manifestKey = `${MOUNT_PREFIX}${host}/package.json`;
      try {
        const manifest = JSON.parse(fsMap.get(manifestKey) ?? '{}');
        if (manifest.exports && typeof manifest.exports === 'object') {
          manifest.exports[`.${subpath}`] = `.${subpath}.d.ts`;
          fsMap.set(manifestKey, JSON.stringify(manifest));
        }
      } catch {}
    }
  };

  const fingerprint = (packages: Map<string, PackageFiles>, aliases: AliasShim[]) =>
    JSON.stringify([
      [...packages].map(([name, p]) => `${name}@${p.version}`).sort(),
      aliases.map((a) => `${a.host}${a.subpath}=${a.target}`).sort(),
    ]);

  const pickJsxImportSource = (packages: Map<string, PackageFiles>) => {
    for (const name of ['solid-js', '@solidjs/web']) {
      const manifest = packages.get(name)?.files.get('/package.json');
      if (!manifest) continue;
      try {
        if (JSON.parse(manifest).exports?.['./jsx-runtime']) return name;
      } catch {}
    }
    return undefined;
  };

  let applied = fingerprint(new Map(), []);
  let jsxSource: string | undefined;
  let syncToken = 0;

  return {
    async sync(importMap) {
      const token = ++syncToken;
      const { roots, pins, aliases } = parseImportMap(importMap);
      const packages = await collect(roots, pins);
      if (token !== syncToken) return false;

      const liveAliases = aliases.filter((a) => a.subpath && packages.has(a.host));
      const next = fingerprint(packages, liveAliases);
      if (next === applied) return false;
      apply(packages, liveAliases);
      jsxSource = pickJsxImportSource(packages);
      applied = next;
      return true;
    },
    jsxImportSource: () => jsxSource,
  };
}
