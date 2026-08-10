import { createSystem, createVirtualTypeScriptEnvironment, type VirtualTypeScriptEnvironment } from '@typescript/vfs';
import ts, {
  type CompilerOptions,
  JsxEmit,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  displayPartsToString,
} from 'typescript';
import { createTypeAcquisition } from './typeAcquisition';

const compilerOptions: CompilerOptions = {
  strict: true,
  target: ScriptTarget.ESNext,
  module: ModuleKind.ESNext,
  jsx: JsxEmit.Preserve,
  jsxImportSource: 'solid-js',
  moduleResolution: ModuleResolutionKind.Bundler,
  allowNonTsExtensions: true,
};

const completionPreferences = {
  includeCompletionsForModuleExports: true,
  includeCompletionsForImportStatements: true,
} satisfies ts.UserPreferences;

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
  const last = path.split('/').at(-1)!;
  fsMap.set(`/${last}`, tsLibs[path]);
}
for (const path in solidTypes) {
  fsMap.set(`file://${path}`, solidTypes[path]);
}

const system = createSystem(fsMap);
const typeAcquisition = createTypeAcquisition(fsMap);

const openDocs = new Map<string, string>();

const buildEnv = () =>
  createVirtualTypeScriptEnvironment(system, [], ts, {
    ...compilerOptions,
    jsxImportSource: typeAcquisition.jsxImportSource() ?? compilerOptions.jsxImportSource,
  });

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

type Position = { line: number; character: number };

const positionConverters = (env: VirtualTypeScriptEnvironment, uri: string) => {
  const sourceFile = env.getSourceFile(uri);
  return {
    offsetToPos: (offset: number): Position => {
      if (!sourceFile) return { line: 0, character: 0 };
      const lc = sourceFile.getLineAndCharacterOfPosition(offset);
      return { line: lc.line, character: lc.character };
    },
    posToOffset: (pos: Position): number => {
      if (!sourceFile) return 0;
      return ts.getPositionOfLineAndCharacter(sourceFile, pos.line, pos.character);
    },
  };
};

const completionDetails = (uri: string, offset: number, entry: ts.CompletionEntry) =>
  env.languageService.getCompletionEntryDetails(
    uri,
    offset,
    entry.name,
    {},
    entry.source,
    completionPreferences,
    entry.data,
  );

const completionActionEdits = (uri: string, details: ts.CompletionEntryDetails | undefined) => {
  if (!details?.codeActions) return [];
  const { offsetToPos } = positionConverters(env, uri);
  return details.codeActions.flatMap((action) =>
    action.changes.flatMap((change) =>
      change.fileName === uri
        ? change.textChanges.map(({ span, newText }) => ({
            range: {
              start: offsetToPos(span.start),
              end: offsetToPos(span.start + span.length),
            },
            newText,
          }))
        : [],
    ),
  );
};

const ensureFile = (uri: string, text: string) => {
  openDocs.set(uri, text);
  const existing = env.getSourceFile(uri);
  if (existing) env.updateFile(uri, text);
  else env.createFile(uri, text);
};

const removeFile = (uri: string) => {
  openDocs.delete(uri);
  if (!env.getSourceFile(uri)) return;
  env.deleteFile(uri);
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
      const uri = params.textDocument.uri;
      const { posToOffset } = positionConverters(env, uri);
      const offset = posToOffset(params.position);
      const completions = env.languageService.getCompletionsAtPosition(uri, offset, completionPreferences);
      if (!completions) return null;
      const prefix = openDocs.get(uri)?.slice(0, offset).match(/[\w$]+$/)?.[0].toLowerCase();
      return {
        isIncomplete: !!completions.isIncomplete,
        items: completions.entries.map((c) => {
          const details =
            c.hasAction && prefix && c.name.toLowerCase().startsWith(prefix)
              ? completionDetails(uri, offset, c)
              : undefined;
          const additionalTextEdits = completionActionEdits(uri, details);
          return {
            label: c.name,
            kind: completionItemKind[c.kind] ?? 1,
            sortText: c.sortText,
            insertText: c.insertText,
            additionalTextEdits: additionalTextEdits.length ? additionalTextEdits : undefined,
            data: { uri, offset, name: c.name, source: c.source, entryData: c.data },
          };
        }),
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
        completionPreferences,
        data.entryData,
      );
      if (!details) return params;
      const detail = displayPartsToString(details.displayParts);
      const docs = displayPartsToString(details.documentation);
      return {
        ...params,
        detail,
        documentation: docs ? { kind: 'markdown', value: docs } : undefined,
      };
    }

    case 'textDocument/hover': {
      const uri = params.textDocument.uri;
      const { posToOffset, offsetToPos } = positionConverters(env, uri);
      const offset = posToOffset(params.position);
      const info = env.languageService.getQuickInfoAtPosition(uri, offset);
      if (!info) return null;
      const signature = displayPartsToString(info.displayParts);
      const docs = displayPartsToString(info.documentation ?? []);
      const value = '```typescript\n' + signature + '\n```' + (docs ? '\n\n' + docs : '');
      return {
        contents: { kind: 'markdown', value },
        range: {
          start: offsetToPos(info.textSpan.start),
          end: offsetToPos(info.textSpan.start + info.textSpan.length),
        },
      };
    }

    case 'textDocument/signatureHelp': {
      const uri = params.textDocument.uri;
      const { posToOffset } = positionConverters(env, uri);
      const offset = posToOffset(params.position);
      const help = env.languageService.getSignatureHelpItems(uri, offset, {});
      if (!help) return null;
      return {
        signatures: help.items.map((item) => {
          const prefix = displayPartsToString(item.prefixDisplayParts);
          const separator = displayPartsToString(item.separatorDisplayParts);
          const suffix = displayPartsToString(item.suffixDisplayParts);
          const sigParams = item.parameters.map((p) => ({
            text: displayPartsToString(p.displayParts),
            doc: displayPartsToString(p.documentation),
          }));
          const label = prefix + sigParams.map((p) => p.text).join(separator) + suffix;
          let cursor = prefix.length;
          const lspParams = sigParams.map((p) => {
            const start = cursor;
            const end = start + p.text.length;
            cursor = end + separator.length;
            return {
              label: [start, end] as [number, number],
              documentation: p.doc ? { kind: 'markdown', value: p.doc } : undefined,
            };
          });
          const itemDocs = displayPartsToString(item.documentation);
          return {
            label,
            documentation: itemDocs ? { kind: 'markdown', value: itemDocs } : undefined,
            parameters: lspParams,
          };
        }),
        activeSignature: help.selectedItemIndex,
        activeParameter: help.argumentIndex,
      };
    }

    case 'textDocument/definition': {
      const uri = params.textDocument.uri;
      const { posToOffset } = positionConverters(env, uri);
      const offset = posToOffset(params.position);
      const defs = env.languageService.getDefinitionAtPosition(uri, offset);
      if (!defs?.length) return null;
      return defs.map((d) => {
        const conv = positionConverters(env, d.fileName);
        return {
          uri: d.fileName,
          range: {
            start: conv.offsetToPos(d.textSpan.start),
            end: conv.offsetToPos(d.textSpan.start + d.textSpan.length),
          },
        };
      });
    }

    case 'textDocument/references': {
      const uri = params.textDocument.uri;
      const { posToOffset } = positionConverters(env, uri);
      const offset = posToOffset(params.position);
      const refs = env.languageService.getReferencesAtPosition(uri, offset);
      if (!refs) return null;
      return refs.map((r) => {
        const conv = positionConverters(env, r.fileName);
        return {
          uri: r.fileName,
          range: {
            start: conv.offsetToPos(r.textSpan.start),
            end: conv.offsetToPos(r.textSpan.start + r.textSpan.length),
          },
        };
      });
    }

    case 'textDocument/prepareRename': {
      const uri = params.textDocument.uri;
      const { posToOffset, offsetToPos } = positionConverters(env, uri);
      const offset = posToOffset(params.position);
      const info = env.languageService.getRenameInfo(uri, offset, { allowRenameOfImportPath: false });
      if (!info.canRename) return null;
      return {
        range: {
          start: offsetToPos(info.triggerSpan.start),
          end: offsetToPos(info.triggerSpan.start + info.triggerSpan.length),
        },
        placeholder: info.displayName,
      };
    }

    case 'textDocument/rename': {
      const uri = params.textDocument.uri;
      const { posToOffset } = positionConverters(env, uri);
      const offset = posToOffset(params.position);
      const info = env.languageService.getRenameInfo(uri, offset, { allowRenameOfImportPath: false });
      if (!info.canRename) return null;
      const locations = env.languageService.findRenameLocations(uri, offset, false, false, {});
      if (!locations) return null;
      const newName: string = params.newName;
      const changes: Record<string, { range: { start: Position; end: Position }; newText: string }[]> = {};
      const converters = new Map<string, ReturnType<typeof positionConverters>>();
      for (const loc of locations) {
        let conv = converters.get(loc.fileName);
        if (!conv) {
          conv = positionConverters(env, loc.fileName);
          converters.set(loc.fileName, conv);
        }
        (changes[loc.fileName] ||= []).push({
          range: {
            start: conv.offsetToPos(loc.textSpan.start),
            end: conv.offsetToPos(loc.textSpan.start + loc.textSpan.length),
          },
          newText: (loc.prefixText ?? '') + newName + (loc.suffixText ?? ''),
        });
      }
      return { changes };
    }

    case 'playground/syncTypes':
      return typeAcquisition.sync(params.importMap ?? {}).then((changed) => {
        if (changed) rebuildEnv();
        return { changed };
      });

    case 'playground/diagnostics': {
      const uri = params.uri;
      const tsDiagnostics = [
        ...env.languageService.getSyntacticDiagnostics(uri),
        ...env.languageService.getSemanticDiagnostics(uri),
      ];
      return tsDiagnostics.map((d) => ({
        start: d.start ?? 0,
        length: d.length ?? 0,
        severity: d.category,
        message: typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText,
      }));
    }

    default:
      throw new MethodNotFound(method);
  }
};

const handleNotification = (method: string, params: any) => {
  switch (method) {
    case 'initialized':
      return;
    case 'textDocument/didOpen':
      ensureFile(params.textDocument.uri, params.textDocument.text);
      return;
    case 'textDocument/didChange': {
      const uri = params.textDocument.uri;
      const change = params.contentChanges[params.contentChanges.length - 1];
      if (change && 'text' in change && !('range' in change)) {
        ensureFile(uri, change.text);
      }
      return;
    }
    case 'textDocument/didClose':
      removeFile(params.textDocument.uri);
      return;
    default:
      return;
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
