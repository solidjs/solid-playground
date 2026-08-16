import { createEffect, createMemo, onCleanup } from 'solid-js';
import { throttle } from '@solid-primitives/scheduled';
import {
  drawSelection,
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  type KeyBinding,
} from '@codemirror/view';
import { EditorSelection, EditorState, Compartment, StateEffect, type Extension } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { bracketMatching, codeFolding, foldGutter, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { highlightSelectionMatches, search } from '@codemirror/search';
import { forceLinting, lintGutter, linter, type Diagnostic } from '@codemirror/lint';
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap';
import { json } from '@codemirror/lang-json';
import type { EditorPersistedState } from 'solid-repl';

import { typescript, typescriptLspExtras, typescriptLspTheme } from './typescriptLsp';
import { createTypescriptSession, type TypescriptSession } from './setupTypescript';
import { darkTheme, lightTheme, darkHighlightStyle, lightHighlightStyle } from './themes';
import type { WorkerClient } from '../../kernel/workerClient';
import type { FileEntry, Workspace } from '../../kernel/workspace';

export interface CodemirrorTabsOptions {
  workspace: Workspace;
  isDark: () => boolean;
  fontSize: () => number;
  displayErrors: () => boolean;
  eslintEnabled: () => boolean;
  formatter?: WorkerClient;
  linter?: WorkerClient;
  keyBindings?: KeyBinding[];
  onUserEdit?: () => void;
  onDocChange?: (fileId: string, source: string) => void;
  loadEditorState?: (fileId: string) => EditorPersistedState | undefined;
  saveEditorState?: (fileId: string, state: EditorPersistedState | null) => void;
}

interface TabLookup {
  view: EditorView;
  themeCompartment: Compartment;
  fontCompartment: Compartment;
  languageCompartment: Compartment;
  languageUri: string | undefined;
  attach: (parent: HTMLElement, focus?: boolean) => void;
  destroy: () => void;
}

interface OutputEntry {
  view: EditorView;
  themeCompartment: Compartment;
  fontCompartment: Compartment;
}

export interface OutputView {
  view: EditorView;
  attach: (parent: HTMLElement) => void;
  setDoc: (doc: string) => void;
  destroy: () => void;
}

export interface CodemirrorTabs {
  attach(fileId: string, parent: HTMLElement, focus?: boolean): void;
  setSource(fileId: string, source: string): void;
  format(fileId: string): Promise<void>;
  fix(fileId: string): Promise<void>;
  getView(fileId: string): EditorView | undefined;
  ensureOutputView(): OutputView;
  syncTypes(importMap: Record<string, string>): void;
  session: TypescriptSession;
}

const fileExtension = (name: string) => name.split('.').pop() ?? '';

const fontExtension = (size: number) =>
  EditorView.theme({
    '.cm-content, .cm-gutters': { fontSize: `${size}px` },
  });

const themeExtensions = (isDark: boolean): Extension =>
  isDark
    ? [darkTheme, syntaxHighlighting(darkHighlightStyle, { fallback: true })]
    : [lightTheme, syntaxHighlighting(lightHighlightStyle, { fallback: true })];

const baseExtensions = (): Extension => [
  lineNumbers(),
  highlightActiveLineGutter(),
  history(),
  foldGutter(),
  codeFolding(),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  search({ top: true }),
  drawSelection(),
  EditorState.allowMultipleSelections.of(true),
  EditorView.lineWrapping,
  keymap.of(vscodeKeymap),
];

const tsExts = new Set(['tsx', 'jsx', 'ts', 'js', 'mts', 'cts', 'mjs', 'cjs']);

const buildLanguageExtension = (uri: string, session: TypescriptSession): Extension => {
  const ext = fileExtension(uri);
  if (ext === 'tsx' || ext === 'jsx') {
    return [
      typescript({ jsx: true }),
      session.client.plugin(uri, 'typescript'),
      typescriptLspExtras,
      typescriptLspTheme,
    ];
  }
  if (tsExts.has(ext)) {
    return [
      typescript({ jsx: false }),
      session.client.plugin(uri, 'typescript'),
      typescriptLspExtras,
      typescriptLspTheme,
    ];
  }
  if (ext === 'json') {
    return [json(), autocompletion()];
  }
  return [];
};

interface LintResponse {
  markers?: LintMarker[];
  output?: string;
  fixed?: boolean;
}

interface LintMarker {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
  message: string;
  severity: number;
}

const markersToDiagnostics = (view: EditorView, markers: LintMarker[]): Diagnostic[] => {
  const doc = view.state.doc;
  return markers.map((m) => {
    const startLine = doc.line(Math.min(Math.max(m.startLineNumber, 1), doc.lines));
    const endLine = doc.line(Math.min(Math.max(m.endLineNumber, 1), doc.lines));
    const from = startLine.from + Math.max(0, m.startColumn - 1);
    const to = endLine.from + Math.max(0, m.endColumn - 1);
    return {
      from,
      to: Math.max(from, to),
      severity: m.severity === 8 ? 'error' : 'warning',
      message: m.message,
      source: 'eslint',
    };
  });
};

// `forceLinting` only flushes an already-pending lint; the linter treats this effect as a
// reason to re-run when lint inputs change without a document edit (type sync, lint config).
const relintRequested = StateEffect.define<null>();

const buildLintExtension = (
  currentUri: () => string | undefined,
  session: TypescriptSession,
  opts: CodemirrorTabsOptions,
): Extension => [
  linter(
    async (view) => {
      if (!opts.displayErrors()) return [];
      const uri = currentUri();
      if (!uri) return [];
      const isTs = tsExts.has(fileExtension(uri));
      if (!isTs && !opts.linter) return [];

      const diagnostics: Diagnostic[] = [];
      if (isTs) {
        session.client.sync();
        diagnostics.push(...(await session.getDiagnostics(uri, view)));
      }
      if (isTs && opts.eslintEnabled()) {
        const res = await opts.linter?.tryRequest<LintResponse>('LINT', { code: view.state.doc.toString() });
        diagnostics.push(...markersToDiagnostics(view, res?.markers ?? []));
      }
      return diagnostics;
    },
    {
      delay: 250,
      needsRefresh: (update) => update.transactions.some((tr) => tr.effects.some((e) => e.is(relintRequested))),
    },
  ),
  lintGutter(),
];

export const createCodemirrorTabs = (folder: string, opts: CodemirrorTabsOptions): CodemirrorTabs => {
  const session = createTypescriptSession();
  let outputEntry: (OutputEntry & { wrapper: OutputView }) | undefined;

  const replaceDoc = (view: EditorView, next: string) => {
    if (view.state.doc.toString() === next) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
  };

  const formatView = async (view: EditorView) => {
    const res = await opts.formatter?.tryRequest<{ code?: string }>('FORMAT', {
      code: view.state.doc.toString(),
    });
    if (typeof res?.code === 'string') replaceDoc(view, res.code);
  };

  const fixView = async (view: EditorView) => {
    if (!opts.displayErrors() || !opts.eslintEnabled()) return;
    const res = await opts.linter?.tryRequest<LintResponse>('FIX', { code: view.state.doc.toString() });
    if (res?.fixed && typeof res.output === 'string') replaceDoc(view, res.output);
  };

  const workspace = opts.workspace;

  const buildLookup = (fileId: string, initialSource: string): TabLookup => {
    const themeCompartment = new Compartment();
    const fontCompartment = new Compartment();
    const languageCompartment = new Compartment();

    const saved = opts.loadEditorState?.(fileId);
    const docLength = initialSource.length;
    const selection = saved
      ? EditorSelection.single(Math.min(saved.anchor, docLength), Math.min(saved.head, docLength))
      : undefined;

    const initialTopPos = saved?.topPos != null ? Math.min(saved.topPos, docLength) : 0;
    let lastTopPos = initialTopPos;

    const writeState = () => {
      opts.saveEditorState?.(fileId, {
        anchor: view.state.selection.main.anchor,
        head: view.state.selection.main.head,
        topPos: lastTopPos,
      });
    };
    const persist = throttle(writeState, 500);

    const currentUri = () => workspace.uriOf(fileId);

    const view = new EditorView({
      state: EditorState.create({
        doc: initialSource,
        selection,
        extensions: [
          baseExtensions(),
          keymap.of(opts.keyBindings ?? []),
          themeCompartment.of(themeExtensions(opts.isDark())),
          fontCompartment.of(fontExtension(opts.fontSize())),
          buildLintExtension(currentUri, session, opts),
          languageCompartment.of(buildLanguageExtension(currentUri() ?? '', session)),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              opts.onDocChange?.(fileId, u.state.doc.toString());
              const userEdit = u.transactions.some(
                (tr) => tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('move'),
              );
              if (userEdit) opts.onUserEdit?.();
            }
            if (u.viewportChanged && u.view.viewport.from !== lastTopPos) {
              lastTopPos = u.view.viewport.from;
              persist();
            } else if (u.docChanged || u.selectionSet) {
              persist();
            }
          }),
        ],
      }),
      scrollTo: initialTopPos > 0 ? EditorView.scrollIntoView(initialTopPos, { y: 'start' }) : undefined,
    });

    return {
      view,
      themeCompartment,
      fontCompartment,
      languageCompartment,
      languageUri: currentUri(),
      attach(parent, focus = true) {
        parent.appendChild(view.dom);
        if (lastTopPos > 0) {
          view.dispatch({ effects: EditorView.scrollIntoView(lastTopPos, { y: 'start' }) });
        }
        if (focus && !view.state.readOnly) view.focus();
      },
      destroy: () => {
        writeState();
        view.destroy();
      },
    };
  };

  const lookups = new Map<string, TabLookup>();
  const registered = new Map<string, string>();

  const isTsLikeUri = (uri: string) => tsExts.has(fileExtension(uri));

  const sync = createMemo(() => {
    const files = workspace.files();
    const liveIds = new Set(files.map((f) => f.id));
    const liveUris = new Map<string, FileEntry>(files.map((f) => [`file:///${folder}/${f.name}`, f]));

    for (const [id, lookup] of lookups) {
      if (!liveIds.has(id)) {
        lookup.destroy();
        lookups.delete(id);
        opts.saveEditorState?.(id, null);
      }
    }

    for (const uri of [...registered.keys()]) {
      if (!liveUris.has(uri)) {
        session.worker.postMessage({
          method: 'textDocument/didClose',
          params: { textDocument: { uri } },
        });
        registered.delete(uri);
      }
    }

    for (const [uri, file] of liveUris) {
      if (!isTsLikeUri(uri)) continue;
      if (registered.get(uri) === file.source) continue;
      const isOpen = registered.has(uri);
      registered.set(uri, file.source);
      session.worker.postMessage(
        isOpen
          ? {
              method: 'textDocument/didChange',
              params: { textDocument: { uri, version: 0 }, contentChanges: [{ text: file.source }] },
            }
          : {
              method: 'textDocument/didOpen',
              params: { textDocument: { uri, languageId: 'typescript', version: 0, text: file.source } },
            },
      );
    }

    return files;
  });

  const ensureLookup = (fileId: string): TabLookup | undefined => {
    const file = sync().find((f) => f.id === fileId);
    if (!file) return undefined;
    let lookup = lookups.get(fileId);
    if (lookup) return lookup;
    lookup = buildLookup(fileId, file.source);
    lookups.set(fileId, lookup);
    return lookup;
  };

  createEffect(() => {
    for (const file of sync()) {
      const lookup = lookups.get(file.id);
      if (lookup) replaceDoc(lookup.view, file.source);
    }
  });

  createEffect(() => {
    const ext = themeExtensions(opts.isDark());
    for (const lookup of lookups.values()) {
      lookup.view.dispatch({ effects: lookup.themeCompartment.reconfigure(ext) });
    }
    if (outputEntry) {
      outputEntry.view.dispatch({ effects: outputEntry.themeCompartment.reconfigure(ext) });
    }
  });

  createEffect(() => {
    const ext = fontExtension(opts.fontSize());
    for (const lookup of lookups.values()) {
      lookup.view.dispatch({ effects: lookup.fontCompartment.reconfigure(ext) });
    }
    if (outputEntry) {
      outputEntry.view.dispatch({ effects: outputEntry.fontCompartment.reconfigure(ext) });
    }
  });

  createEffect(() => {
    for (const file of workspace.files()) {
      const lookup = lookups.get(file.id);
      if (!lookup) continue;
      const uri = `file:///${folder}/${file.name}`;
      if (lookup.languageUri === uri) continue;
      lookup.languageUri = uri;
      lookup.view.dispatch({
        effects: lookup.languageCompartment.reconfigure(buildLanguageExtension(uri, session)),
      });
      forceLinting(lookup.view);
    }
  });

  createEffect(() => {
    opts.displayErrors();
    opts.eslintEnabled();
    for (const lookup of lookups.values()) {
      lookup.view.dispatch({ effects: relintRequested.of(null) });
    }
  });

  onCleanup(() => {
    for (const lookup of lookups.values()) lookup.destroy();
    lookups.clear();
    outputEntry?.view.destroy();
    outputEntry = undefined;
    session.client.disconnect();
    session.worker.terminate();
  });

  const buildOutput = (): OutputEntry & { wrapper: OutputView } => {
    const themeCompartment = new Compartment();
    const fontCompartment = new Compartment();
    const view = new EditorView({
      doc: '',
      extensions: [
        baseExtensions(),
        themeCompartment.of(themeExtensions(opts.isDark())),
        fontCompartment.of(fontExtension(opts.fontSize())),
        typescript({ jsx: true }),
        EditorState.readOnly.of(true),
      ],
    });
    const wrapper: OutputView = {
      view,
      attach(parent) {
        parent.appendChild(view.dom);
      },
      setDoc(doc) {
        replaceDoc(view, doc);
      },
      destroy() {
        view.destroy();
        outputEntry = undefined;
      },
    };
    return { view, themeCompartment, fontCompartment, wrapper };
  };

  return {
    attach(fileId, parent, focus) {
      ensureLookup(fileId)?.attach(parent, focus);
    },
    setSource(fileId, source) {
      const lookup = lookups.get(fileId);
      if (lookup) replaceDoc(lookup.view, source);
    },
    async format(fileId) {
      const view = lookups.get(fileId)?.view;
      if (view) await formatView(view);
    },
    async fix(fileId) {
      const view = lookups.get(fileId)?.view;
      if (view) await fixView(view);
    },
    getView(fileId) {
      return lookups.get(fileId)?.view;
    },
    ensureOutputView() {
      if (!outputEntry) outputEntry = buildOutput();
      return outputEntry.wrapper;
    },
    syncTypes(importMap) {
      session
        .syncTypes(importMap)
        .then((changed) => {
          if (!changed) return;
          for (const lookup of lookups.values()) {
            lookup.view.dispatch({ effects: relintRequested.of(null) });
          }
        })
        .catch((e) => console.warn('[solid-repl] type acquisition failed', e));
    },
    session,
  };
};
