import { editor, languages, Uri } from 'monaco-editor';
import { resolve } from 'resolve.exports';

const UNPKG = 'https://unpkg.com';

interface PackageJSON {
  types?: string;
  typings?: string;
}

const GLOBAL_CACHE = new Set();

function matchURLS(str: string): string[] {
  // Find all "from" expression
  const fromMatches = str.match(/from ((".*")|('.*'))/g) ?? [];
  // Find all "dynamic import" expression
  const importMatches = str.match(/import\(((".*")|('.*'))\)/g) ?? [];

  const matches = [
    ...fromMatches.map((item) => item.replace('from ', '')),
    ...importMatches
      .map((item) => item.replace('import', ''))
      .map((item) => item.substring(1, item.length - 1)),
  ].map((item) => item.substring(1, item.length - 1));

  return matches;
}

function getPackageName(source: string) {
  const pathname = source.split('/');
  if (source.startsWith('@')) {
    return `${pathname[0]}/${pathname[1]}`;
  }
  return pathname[0];
}

function getTypes(packageName: string) {
  // TODO consider namespaced packages
  return `@types/${packageName}`;
}

function resolveTypings(pkg: PackageJSON, entry: string, isSubpackage = false) {
  if ('exports' in pkg) {
    const result = resolve(pkg, entry, {
      unsafe: true,
      conditions: ['types'],
    }) ?? resolve(pkg, entry, {
      unsafe: true,
      conditions: ['typings'],
    });
    if (result) {
      return result;
    }
  }
  if (!isSubpackage) {
    return pkg.types ?? pkg.typings
  }
  return undefined;
}

function addDefinition(
  // Content of the file
  content: string,
  // Path to file
  uri: string,
  // File type
  type: string,
) {
  languages.typescript.typescriptDefaults.addExtraLib(
    content,
    uri,
  );

  editor.createModel(
    content,
    type,
    Uri.parse(uri),
  );
}

const DTS_CACHE = new Set();

class DefLoader {
  static async loadTSFile(source: string) {
    // this.loadDTS(`${source}.ts`);
    this.loadDTS(`${source}.d.ts`);
  }

  static async loadDTS(
    source: string,
  ) {
    if (DTS_CACHE.has(source)) {
      return;
    }
    DTS_CACHE.add(source);
    const targetPath = new URL(source, UNPKG);
    const response = await fetch(targetPath);
    if (response.ok) {
      const dts = await response.text();

      addDefinition(dts, `file:///node_modules/${source}`, 'typescript');

      const imports = matchURLS(dts) ?? [];

      const splitPath = source.split('/');
      const directory = splitPath.slice(0, -1).join('/');

      await Promise.all(imports.map((item) => {
        if (item) {
          if (item.startsWith('./') || item.startsWith('../')) {
            const clean = item.endsWith('.js') ? item.substring(0, item.length - 3) : item;
            const resolved = new URL(`${directory}/${clean}`, 'file://').pathname.substring(1);
            this.loadTSFile(resolved);
            this.loadTSFile(`${resolved}/index`);
          } else {
            this.loadPackage(item);
          }
        }
      }));
    }
  }

  static async loadPackage(
    // The import URL
    source: string,
    // referral URL
    original = source,
  ) {
    if (GLOBAL_CACHE.has(source)) {
      return;
    }
    GLOBAL_CACHE.add(source);
    const packageName = getPackageName(source);
    // Get the package.json
    const targetUnpkg = new URL(packageName, UNPKG);
    const response = await fetch(`${targetUnpkg}/package.json`);
    const pkg = await response.json() as PackageJSON;
    if (packageName !== source) {
      // Attempt to resolve types
      const typeDeclarations = resolveTypings(pkg, source, true);
      if (typeDeclarations) {
        await this.loadDTS(`${packageName}/${typeDeclarations}`);
      } else {
        this.loadPackage(packageName);
      }
    } else {
      // Check for `types` or `typings`
      const typeDeclarations = resolveTypings(pkg, packageName);
      if (typeDeclarations) {
        addDefinition(JSON.stringify(pkg), `file:///node_modules/${original}/package.json`, 'json');
        await this.loadDTS(`${packageName}/${typeDeclarations}`);
        return;
      }
      await this.loadPackage(getTypes(packageName), original);
    }
  }
}

export default async function loadDefinitions(
  source: string,
): Promise<void> {
  const imports = matchURLS(source) ?? [];

  await Promise.all(imports.map((item) => {
    if (item && !item.startsWith('.')) {
      DefLoader.loadPackage(item);
    }
  }));
}
