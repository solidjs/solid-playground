import { createSystem, createVirtualLanguageServiceHost } from '@typescript/vfs';
import ts, {
  type CompilerOptions,
  JsxEmit,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  displayPartsToString,
  flattenDiagnosticMessageText,
} from 'typescript';
import type { Diagnostic } from '@codemirror/lint';
import { serveWorker } from '../kernel/workerServer';
import { fix, lint } from './eslint';
import { type TypeAcquisition, createTypeAcquisition } from './typeAcquisition';

const userPreferences: ts.UserPreferences = {
  includeCompletionsForImportStatements: true,
  includeCompletionsForModuleExports: true,
  includeCompletionsWithInsertText: true,
  autoImportSpecifierExcludeRegexes: ['\\.[cm]?[jt]sx?$'],
};

const compilerOptions: CompilerOptions = {
  strict: true,
  target: ScriptTarget.ESNext,
  module: ModuleKind.ESNext,
  jsx: JsxEmit.Preserve,
  jsxImportSource: 'solid-js',
  moduleResolution: ModuleResolutionKind.Bundler,
  allowNonTsExtensions: true,
  esModuleInterop: true,
  skipLibCheck: true,
};

const tsLibs = import.meta.glob<string>(
  [
    '/node_modules/typescript/lib/lib.*.d.ts',
    '!/node_modules/typescript/lib/lib.webworker*.d.ts',
    '!/node_modules/typescript/lib/lib.scripthost*.d.ts',
  ],
  { eager: true, query: '?raw', import: 'default' },
);

const solidTypes = import.meta.glob<string>('/node_modules/{solid-js,csstype}/**/*.{d.ts,json}', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const baseFiles = new Map<string, string>();
for (const path in tsLibs) {
  baseFiles.set(path.slice(path.lastIndexOf('/')), tsLibs[path]);
}
for (const path in solidTypes) {
  baseFiles.set(`file://${path}`, solidTypes[path]);
}

// Projects can hold different files at the same path (two solid-js versions), which one registry
// would conflate, so only TypeScript's own lib files are shared between them.
const libRegistry = ts.createDocumentRegistry();
const createRegistry = (): ts.DocumentRegistry =>
  new Proxy(ts.createDocumentRegistry(), {
    get:
      (own, key) =>
      (first: unknown, ...rest: unknown[]) => {
        const registry = typeof first === 'string' && first.startsWith('/lib.') ? libRegistry : own;
        return Reflect.apply(registry[key as keyof ts.DocumentRegistry], registry, [first, ...rest]);
      },
  });

interface Env {
  languageService: ts.LanguageService;
  getSourceFile(uri: string): ts.SourceFile | undefined;
  setFile(uri: string, text: string): void;
  deleteFile(uri: string): void;
}

interface Project {
  fsMap: Map<string, string>;
  typeAcquisition: TypeAcquisition;
  docs: Map<string, string>;
  env: Env;
}

// Auto-import only suggests exports of modules already in the program, so a synthetic root
// pulls in every package entry point known to the vfs.
const AUTO_IMPORT_ROOT = 'file:///__auto_imports__.d.ts';
const autoImportSpecifiers = ({ fsMap, typeAcquisition }: Omit<Project, 'env'>) => {
  const specs = new Set<string>();
  for (const pkg of typeAcquisition.packageNames()) {
    const name = pkg.startsWith('@types/') ? pkg.slice('@types/'.length).replace(/^([^_]+)__/, '@$1/') : pkg;
    specs.add(name);
    try {
      const manifest = JSON.parse(fsMap.get(`file:///node_modules/${pkg}/package.json`) ?? '{}');
      for (const key of Object.keys(manifest.exports ?? {})) {
        if (key.startsWith('./') && !key.includes('*') && !key.endsWith('.json')) specs.add(name + key.slice(1));
      }
    } catch {}
  }
  return [...specs];
};

const buildEnv = (project: Omit<Project, 'env'>): Env => {
  project.fsMap.set(
    AUTO_IMPORT_ROOT,
    autoImportSpecifiers(project)
      .map((s) => `import '${s}';\n`)
      .join(''),
  );
  const options = {
    ...compilerOptions,
    jsxImportSource: project.typeAcquisition.jsxImportSource() ?? compilerOptions.jsxImportSource,
  };
  const host = createVirtualLanguageServiceHost(createSystem(project.fsMap), [AUTO_IMPORT_ROOT], options, ts);
  const languageService = ts.createLanguageService(host.languageServiceHost, createRegistry());
  const env: Env = {
    languageService,
    getSourceFile: (uri) => languageService.getProgram()?.getSourceFile(uri),
    setFile: (uri, text) => host.updateFile(ts.createSourceFile(uri, text, ScriptTarget.ESNext, false)),
    deleteFile(uri) {
      const file = env.getSourceFile(uri);
      if (file) host.deleteFile(file);
    },
  };
  for (const [uri, text] of project.docs) env.setFile(uri, text);
  return env;
};

const rebuildEnv = (project: Project) => {
  const previous = project.env;
  project.env = buildEnv(project);
  previous.languageService.dispose();
};

const projects = new Map<string, Project>();

const folderOf = (uri: string) => uri.slice('file:///'.length).split('/')[0];

const projectFor = (folder: string) => {
  let project = projects.get(folder);
  if (!project) {
    const fsMap = new Map(baseFiles);
    const parts = { fsMap, typeAcquisition: createTypeAcquisition(fsMap), docs: new Map<string, string>() };
    project = { ...parts, env: buildEnv(parts) };
    projects.set(folder, project);
  }
  return project;
};

const envFor = (uri: string) => projectFor(folderOf(uri)).env;

const completionItemKind: Record<string, number> = {
  'class': 7,
  'interface': 8,
  'method': 2,
  'module': 9,
  'property': 10,
  'string': 1,
  'type': 22,
  'var': 6,
  'local var': 6,
  'const': 21,
  'let': 21,
  'function': 3,
  'local function': 3,
  'keyword': 14,
  'enum': 13,
  'enum member': 20,
  'parameter': 6,
  'alias': 18,
  'primitive': 22,
};

const diagnosticSeverity: Record<ts.DiagnosticCategory, Diagnostic['severity']> = {
  [ts.DiagnosticCategory.Warning]: 'warning',
  [ts.DiagnosticCategory.Error]: 'error',
  [ts.DiagnosticCategory.Suggestion]: 'hint',
  [ts.DiagnosticCategory.Message]: 'info',
};

type Position = { line: number; character: number };

const offsetToPos = (env: Env, uri: string, offset: number): Position =>
  env.getSourceFile(uri)?.getLineAndCharacterOfPosition(offset) ?? { line: 0, character: 0 };

const posToOffset = (env: Env, uri: string, pos: Position) => {
  const file = env.getSourceFile(uri);
  return file ? ts.getPositionOfLineAndCharacter(file, pos.line, pos.character) : 0;
};

const spanToRange = (env: Env, uri: string, span: ts.TextSpan) => ({
  start: offsetToPos(env, uri, span.start),
  end: offsetToPos(env, uri, span.start + span.length),
});

const documentPosition = (params: any) => {
  const uri: string = params.textDocument.uri;
  const env = envFor(uri);
  return { env, uri, offset: posToOffset(env, uri, params.position) };
};

const markdown = (text: string) => (text ? { kind: 'markdown', value: text } : undefined);

const autoImportEdits = (env: Env, uri: string, offset: number, c: ts.CompletionEntry) => {
  const details = env.languageService.getCompletionEntryDetails(
    uri,
    offset,
    c.name,
    {},
    c.source,
    userPreferences,
    c.data,
  );
  return details?.codeActions
    ?.flatMap((action) => action.changes)
    .filter((change) => change.fileName === uri)
    .flatMap((change) =>
      change.textChanges.map((tc) => ({ range: spanToRange(env, uri, tc.span), newText: tc.newText })),
    );
};

const ensureFile = (uri: string, text: string) => {
  const project = projectFor(folderOf(uri));
  project.docs.set(uri, text);
  project.env.setFile(uri, text);
};

const removeFile = (uri: string) => {
  const project = projects.get(folderOf(uri));
  if (!project) return;
  project.docs.delete(uri);
  project.env.deleteFile(uri);
};

class MethodNotFound extends Error {
  constructor(method: string) {
    super(`Method not found: ${method}`);
  }
}

const handleRequest = (method: string, params: any) => {
  switch (method) {
    case 'initialize':
      return {
        capabilities: {
          textDocumentSync: 1,
          hoverProvider: true,
          completionProvider: { resolveProvider: true, triggerCharacters: ['.'] },
          signatureHelpProvider: { triggerCharacters: ['(', ','], retriggerCharacters: [')'] },
          definitionProvider: true,
          referencesProvider: true,
          renameProvider: { prepareProvider: true },
        },
      };

    case 'shutdown':
      return null;

    case 'textDocument/completion': {
      const { env, uri, offset } = documentPosition(params);
      const completions = env.languageService.getCompletionsAtPosition(uri, offset, userPreferences);
      if (!completions) return null;
      return {
        isIncomplete: !!completions.isIncomplete,
        items: completions.entries.map((c) => ({
          label: c.name,
          kind: completionItemKind[c.kind] ?? 1,
          sortText: c.sortText,
          insertText: c.insertText,
          data: { uri, offset, name: c.name, source: c.source, data: c.data },
          ...(c.replacementSpan && {
            textEdit: { range: spanToRange(env, uri, c.replacementSpan), newText: c.insertText ?? c.name },
            filterText: c.isImportStatementCompletion ? c.insertText : undefined,
          }),
          ...(c.sourceDisplay && { detail: displayPartsToString(c.sourceDisplay) }),
          ...(c.hasAction && c.source && { additionalTextEdits: autoImportEdits(env, uri, offset, c) }),
        })),
      };
    }

    case 'completionItem/resolve': {
      const data = params.data;
      if (!data) return params;
      const details = envFor(data.uri).languageService.getCompletionEntryDetails(
        data.uri,
        data.offset,
        data.name,
        {},
        data.source,
        userPreferences,
        data.data,
      );
      if (!details) return params;
      return {
        ...params,
        detail: displayPartsToString(details.displayParts),
        documentation: markdown(displayPartsToString(details.documentation)),
      };
    }

    case 'textDocument/hover': {
      const { env, uri, offset } = documentPosition(params);
      const info = env.languageService.getQuickInfoAtPosition(uri, offset);
      if (!info) return null;
      const signature = displayPartsToString(info.displayParts);
      const docs = displayPartsToString(info.documentation ?? []);
      return {
        contents: markdown('```typescript\n' + signature + '\n```' + (docs ? '\n\n' + docs : '')),
        range: spanToRange(env, uri, info.textSpan),
      };
    }

    case 'textDocument/signatureHelp': {
      const { env, uri, offset } = documentPosition(params);
      const help = env.languageService.getSignatureHelpItems(uri, offset, {});
      if (!help) return null;
      return {
        signatures: help.items.map((item) => {
          const separator = displayPartsToString(item.separatorDisplayParts);
          let label = displayPartsToString(item.prefixDisplayParts);
          const parameters = item.parameters.map((p, i) => {
            if (i) label += separator;
            const start = label.length;
            label += displayPartsToString(p.displayParts);
            return {
              label: [start, label.length] as [number, number],
              documentation: markdown(displayPartsToString(p.documentation)),
            };
          });
          label += displayPartsToString(item.suffixDisplayParts);
          return { label, documentation: markdown(displayPartsToString(item.documentation)), parameters };
        }),
        activeSignature: help.selectedItemIndex,
        activeParameter: help.argumentIndex,
      };
    }

    case 'textDocument/definition': {
      const { env, uri, offset } = documentPosition(params);
      const defs = env.languageService.getDefinitionAtPosition(uri, offset);
      if (!defs?.length) return null;
      return defs.map((d) => ({ uri: d.fileName, range: spanToRange(env, d.fileName, d.textSpan) }));
    }

    case 'textDocument/references': {
      const { env, uri, offset } = documentPosition(params);
      const refs = env.languageService.getReferencesAtPosition(uri, offset);
      if (!refs) return null;
      return refs.map((r) => ({ uri: r.fileName, range: spanToRange(env, r.fileName, r.textSpan) }));
    }

    case 'textDocument/prepareRename': {
      const { env, uri, offset } = documentPosition(params);
      const info = env.languageService.getRenameInfo(uri, offset, { allowRenameOfImportPath: false });
      if (!info.canRename) return null;
      return { range: spanToRange(env, uri, info.triggerSpan), placeholder: info.displayName };
    }

    case 'textDocument/rename': {
      const { env, uri, offset } = documentPosition(params);
      const locations = env.languageService.findRenameLocations(uri, offset, false, false, {});
      if (!locations) return null;
      const changes: Record<string, { range: ReturnType<typeof spanToRange>; newText: string }[]> = {};
      for (const loc of locations) {
        (changes[loc.fileName] ??= []).push({
          range: spanToRange(env, loc.fileName, loc.textSpan),
          newText: (loc.prefixText ?? '') + params.newName + (loc.suffixText ?? ''),
        });
      }
      return { changes };
    }

    case 'playground/syncTypes': {
      const { folder, importMap } = params;
      if (!importMap) {
        projects.get(folder)?.env.languageService.dispose();
        projects.delete(folder);
        return { changed: false };
      }
      const project = projectFor(folder);
      return project.typeAcquisition.sync(importMap).then((changed) => {
        if (changed && projects.get(folder) === project) rebuildEnv(project);
        return { changed };
      });
    }

    case 'playground/diagnostics': {
      const env = envFor(params.uri);
      return [
        ...env.languageService.getSyntacticDiagnostics(params.uri),
        ...env.languageService.getSemanticDiagnostics(params.uri),
      ].map((d): Diagnostic => ({
        from: d.start ?? 0,
        to: (d.start ?? 0) + (d.length ?? 0),
        severity: diagnosticSeverity[d.category],
        message: flattenDiagnosticMessageText(d.messageText, '\n'),
        source: 'typescript',
      }));
    }

    default:
      throw new MethodNotFound(method);
  }
};

const handleNotification = (method: string, params: any) => {
  switch (method) {
    case 'textDocument/didOpen':
      return ensureFile(params.textDocument.uri, params.textDocument.text);
    case 'textDocument/didChange': {
      const change = params.contentChanges.at(-1);
      if (change && !change.range) ensureFile(params.textDocument.uri, change.text);
      return;
    }
    case 'textDocument/didClose':
      return removeFile(params.textDocument.uri);
  }
};

self.addEventListener('message', async (e: MessageEvent) => {
  const msg = e.data;
  if (msg.id !== undefined && msg.method) {
    try {
      const result = await handleRequest(msg.method, msg.params);
      self.postMessage({ jsonrpc: '2.0', id: msg.id, result });
    } catch (err) {
      self.postMessage({
        jsonrpc: '2.0',
        id: msg.id,
        error: {
          code: err instanceof MethodNotFound ? -32601 : -32603,
          message: err instanceof Error ? err.message : 'Internal error',
        },
      });
    }
  } else if (msg.method) {
    handleNotification(msg.method, msg.params);
  }
});

serveWorker({ LINT: lint, FIX: fix });
