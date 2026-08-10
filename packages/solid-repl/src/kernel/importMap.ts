export interface ImportMapState {
  imports: Record<string, string>;
  pinned: string[];
}

export const defaultUrl = (specifier: string) => `https://esm.sh/${specifier}`;

const stringEntries = (value: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (value && typeof value === 'object') {
    for (const [key, url] of Object.entries(value)) {
      if (typeof url === 'string') out[key] = url;
    }
  }
  return out;
};

export function parseImportMap(source: string | undefined): ImportMapState {
  try {
    const parsed = JSON.parse(source ?? '{}');
    const legacy = !parsed || typeof parsed.imports !== 'object';
    const imports = stringEntries(legacy ? parsed : parsed.imports);
    const pinned =
      !legacy && Array.isArray(parsed.pinned)
        ? parsed.pinned.filter((name: unknown): name is string => typeof name === 'string' && name in imports)
        : [];
    return { imports, pinned };
  } catch {
    return { imports: {}, pinned: [] };
  }
}

export function serializeImportMap(state: ImportMapState): string {
  return JSON.stringify({ imports: state.imports, pinned: state.pinned }, null, 2);
}

export function syncEntries(state: ImportMapState, specifiers: string[]): ImportMapState {
  const pinned = new Set(state.pinned);
  const imports: Record<string, string> = {};
  for (const [name, url] of Object.entries(state.imports)) {
    if (pinned.has(name) || specifiers.includes(name)) imports[name] = url;
  }
  for (const specifier of specifiers) {
    imports[specifier] ??= defaultUrl(specifier);
  }
  return { imports, pinned: state.pinned };
}
