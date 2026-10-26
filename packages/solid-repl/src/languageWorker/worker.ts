import { createSystem, createVirtualTypeScriptEnvironment } from '@typescript/vfs';
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
import { createTypeAcquisition } from './typeAcquisition';

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

const fsMap = new Map<string, string>();
for (const path in tsLibs) {
  fsMap.set(path.slice(path.lastIndexOf('/')), tsLibs[path]);
}
for (const path in solidTypes) {
  fsMap.set(`file://${path}`, solidTypes[path]);
}

const system = createSystem(fsMap);
const typeAcquisition = createTypeAcquisition(fsMap);

const openDocs = new Map<string, string>();

// Auto-import only suggests exports of modules already in the program, so a synthetic root
// pulls in every package entry point known to the vfs.
const AUTO_IMPORT_ROOT = 'file:///__auto_imports__.d.ts';
const autoImportSpecifiers = () => {
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

const buildEnv = () => {
  fsMap.set(
    AUTO_IMPORT_ROOT,
    autoImportSpecifiers()
      .map((s) => `import '${s}';\n`)
      .join(''),
  );
  return createVirtualTypeScriptEnvironment(system, [AUTO_IMPORT_ROOT], ts, {
    ...compilerOptions,
    jsxImportSource: typeAcquisition.jsxImportSource() ?? compilerOptions.jsxImportSource,
  });
};

let env = buildEnv();

const rebuildEnv = () => {
  env = buildEnv();
  for (const [uri, text] of openDocs) env.createFile(uri, text);
};

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

const offsetToPos = (uri: string, offset: number): Position =>
  env.getSourceFile(uri)?.getLineAndCharacterOfPosition(offset) ?? { line: 0, character: 0 };

const posToOffset = (uri: string, pos: Position) => {
  const file = env.getSourceFile(uri);
  return file ? ts.getPositionOfLineAndCharacter(file, pos.line, pos.character) : 0;
};

const spanToRange = (uri: string, span: ts.TextSpan) => ({
  start: offsetToPos(uri, span.start),
  end: offsetToPos(uri, span.start + span.length),
});

const documentPosition = (params: any) => {
  const uri: string = params.textDocument.uri;
  return { uri, offset: posToOffset(uri, params.position) };
};

const markdown = (text: string) => (text ? { kind: 'markdown', value: text } : undefined);

const autoImportEdits = (uri: string, offset: number, c: ts.CompletionEntry) => {
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
    .flatMap((change) => change.textChanges.map((tc) => ({ range: spanToRange(uri, tc.span), newText: tc.newText })));
};

const ensureFile = (uri: string, text: string) => {
  openDocs.set(uri, text);
  if (env.getSourceFile(uri)) env.updateFile(uri, text);
  else env.createFile(uri, text);
};

const removeFile = (uri: string) => {
  openDocs.delete(uri);
  if (env.getSourceFile(uri)) env.deleteFile(uri);
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
      const { uri, offset } = documentPosition(params);
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
            textEdit: { range: spanToRange(uri, c.replacementSpan), newText: c.insertText ?? c.name },
            filterText: c.isImportStatementCompletion ? c.insertText : undefined,
          }),
          ...(c.sourceDisplay && { detail: displayPartsToString(c.sourceDisplay) }),
          ...(c.hasAction && c.source && { additionalTextEdits: autoImportEdits(uri, offset, c) }),
        })),
      };
    }

    case 'completionItem/resolve': {
      const data = params.data;
      if (!data) return params;
      const details = env.languageService.getCompletionEntryDetails(
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
      const { uri, offset } = documentPosition(params);
      const info = env.languageService.getQuickInfoAtPosition(uri, offset);
      if (!info) return null;
      const signature = displayPartsToString(info.displayParts);
      const docs = displayPartsToString(info.documentation ?? []);
      return {
        contents: markdown('```typescript\n' + signature + '\n```' + (docs ? '\n\n' + docs : '')),
        range: spanToRange(uri, info.textSpan),
      };
    }

    case 'textDocument/signatureHelp': {
      const { uri, offset } = documentPosition(params);
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
      const { uri, offset } = documentPosition(params);
      const defs = env.languageService.getDefinitionAtPosition(uri, offset);
      if (!defs?.length) return null;
      return defs.map((d) => ({ uri: d.fileName, range: spanToRange(d.fileName, d.textSpan) }));
    }

    case 'textDocument/references': {
      const { uri, offset } = documentPosition(params);
      const refs = env.languageService.getReferencesAtPosition(uri, offset);
      if (!refs) return null;
      return refs.map((r) => ({ uri: r.fileName, range: spanToRange(r.fileName, r.textSpan) }));
    }

    case 'textDocument/prepareRename': {
      const { uri, offset } = documentPosition(params);
      const info = env.languageService.getRenameInfo(uri, offset, { allowRenameOfImportPath: false });
      if (!info.canRename) return null;
      return { range: spanToRange(uri, info.triggerSpan), placeholder: info.displayName };
    }

    case 'textDocument/rename': {
      const { uri, offset } = documentPosition(params);
      const locations = env.languageService.findRenameLocations(uri, offset, false, false, {});
      if (!locations) return null;
      const changes: Record<string, { range: ReturnType<typeof spanToRange>; newText: string }[]> = {};
      for (const loc of locations) {
        (changes[loc.fileName] ??= []).push({
          range: spanToRange(loc.fileName, loc.textSpan),
          newText: (loc.prefixText ?? '') + params.newName + (loc.suffixText ?? ''),
        });
      }
      return { changes };
    }

    case 'playground/syncTypes':
      return typeAcquisition.sync(params.importMap ?? {}).then((changed) => {
        if (changed) rebuildEnv();
        return { changed };
      });

    case 'playground/diagnostics':
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
