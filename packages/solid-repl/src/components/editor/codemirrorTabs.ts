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
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import type { EditorPersistedState } from 'solid-repl';

import {
  createTypescriptSession,
  typescriptLspExtras,
  typescriptLspTheme,
  type TypescriptSession,
} from './typescriptLsp';
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
  loadEditorState?: (fileId: string) => EditorPersistedState | undefined;
  saveEditorState?: (fileId: string, state: EditorPersistedState | null) => void;
}

export interface OutputView {
  attach(parent: HTMLElement): void;
  setDoc(doc: string): void;
}

export interface CodemirrorTabs {
  attach(fileId: string, parent: HTMLElement, focus?: boolean): void;
  format(fileId: string): Promise<void>;
  fix(fileId: string): Promise<void>;
  getView(fileId: string): EditorView | undefined;
  ensureOutputView(): OutputView;
  syncTypes(importMap: Record<string, string>): void;
}

interface Styled {
  view: EditorView;
  appearance: Compartment;
}

interface FileEditor extends Styled {
  language: Compartment;
  languageUri: string | undefined;
  attach(parent: HTMLElement, focus?: boolean): void;
  destroy(): void;
}

const tsExts = new Set(['tsx', 'jsx', 'ts', 'js', 'mts', 'cts', 'mjs', 'cjs']);
const fileExtension = (name: string) => name.split('.').pop() ?? '';
export const isTsFile = (name: string) => tsExts.has(fileExtension(name));

const appearanceExtensions = (isDark: boolean, fontSize: number): Extension => [
  isDark
    ? [darkTheme, syntaxHighlighting(darkHighlightStyle, { fallback: true })]
    : [lightTheme, syntaxHighlighting(lightHighlightStyle, { fallback: true })],
  EditorView.theme({ '.cm-content, .cm-gutters': { fontSize: `${fontSize}px` } }),
];

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

const languageExtensions = (uri: string, session: TypescriptSession): Extension => {
  const ext = fileExtension(uri);
  if (tsExts.has(ext)) {
    return [
      javascript({ typescript: true, jsx: ext === 'tsx' || ext === 'jsx' }),
      session.client.plugin(uri, 'typescript'),
      typescriptLspExtras,
      typescriptLspTheme,
    ];
  }
  if (ext === 'json') return [json(), autocompletion()];
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

const lintExtensions = (
  currentUri: () => string | undefined,
  session: TypescriptSession,
  opts: CodemirrorTabsOptions,
): Extension => [
  linter(
    async (view) => {
      if (!opts.displayErrors()) return [];
      const uri = currentUri();
      if (!uri || !isTsFile(uri)) return [];

      session.client.sync();
      const diagnostics = await session.getDiagnostics(uri, view);
      if (opts.eslintEnabled()) {
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
  const { workspace } = opts;
  const session = createTypescriptSession();
  const editors = new Map<string, FileEditor>();
  let output: (Styled & { api: OutputView }) | undefined;

  const styled = (): Styled[] => (output ? [...editors.values(), output] : [...editors.values()]);

  const replaceDoc = (view: EditorView, next: string) => {
    if (view.state.doc.toString() === next) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
  };

  const relint = () => {
    for (const editor of editors.values()) editor.view.dispatch({ effects: relintRequested.of(null) });
  };

  const formatView = async (view: EditorView) => {
    const res = await opts.formatter?.tryRequest<{ code?: string }>('FORMAT', { code: view.state.doc.toString() });
    if (typeof res?.code === 'string') replaceDoc(view, res.code);
  };

  const fixView = async (view: EditorView) => {
    if (!opts.displayErrors() || !opts.eslintEnabled()) return;
    const res = await opts.linter?.tryRequest<LintResponse>('FIX', { code: view.state.doc.toString() });
    if (res?.fixed && typeof res.output === 'string') replaceDoc(view, res.output);
  };

  const buildEditor = (fileId: string, initialSource: string): FileEditor => {
    const appearance = new Compartment();
    const language = new Compartment();

    const saved = opts.loadEditorState?.(fileId);
    const docLength = initialSource.length;
    const selection = saved
      ? EditorSelection.single(Math.min(saved.anchor, docLength), Math.min(saved.head, docLength))
      : undefined;
    let lastTopPos = saved?.topPos != null ? Math.min(saved.topPos, docLength) : 0;

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
          appearance.of(appearanceExtensions(opts.isDark(), opts.fontSize())),
          lintExtensions(currentUri, session, opts),
          language.of(languageExtensions(currentUri() ?? '', session)),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              workspace.setSource(fileId, u.state.doc.toString());
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
      scrollTo: lastTopPos > 0 ? EditorView.scrollIntoView(lastTopPos, { y: 'start' }) : undefined,
    });

    return {
      view,
      appearance,
      language,
      languageUri: currentUri(),
      attach(parent, focus = true) {
        parent.appendChild(view.dom);
        if (lastTopPos > 0) view.dispatch({ effects: EditorView.scrollIntoView(lastTopPos, { y: 'start' }) });
        if (focus) view.focus();
      },
      destroy() {
        writeState();
        view.destroy();
      },
    };
  };

  const registered = new Map<string, string>();

  const sync = createMemo(() => {
    const files = workspace.files();
    const liveIds = new Set(files.map((f) => f.id));
    const liveUris = new Map<string, FileEntry>(files.map((f) => [`file:///${folder}/${f.name}`, f]));

    for (const [id, editor] of editors) {
      if (!liveIds.has(id)) {
        editor.destroy();
        editors.delete(id);
        opts.saveEditorState?.(id, null);
      }
    }

    for (const uri of [...registered.keys()]) {
      if (!liveUris.has(uri)) {
        session.worker.postMessage({ method: 'textDocument/didClose', params: { textDocument: { uri } } });
        registered.delete(uri);
      }
    }

    for (const [uri, file] of liveUris) {
      if (!isTsFile(uri) || registered.get(uri) === file.source) continue;
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

  const ensureEditor = (fileId: string): FileEditor | undefined => {
    const file = sync().find((f) => f.id === fileId);
    if (!file) return undefined;
    let editor = editors.get(fileId);
    if (!editor) {
      editor = buildEditor(fileId, file.source);
      editors.set(fileId, editor);
    }
    return editor;
  };

  createEffect(() => {
    for (const file of sync()) {
      const editor = editors.get(file.id);
      if (editor) replaceDoc(editor.view, file.source);
    }
  });

  createEffect(() => {
    const ext = appearanceExtensions(opts.isDark(), opts.fontSize());
    for (const { view, appearance } of styled()) view.dispatch({ effects: appearance.reconfigure(ext) });
  });

  createEffect(() => {
    for (const file of workspace.files()) {
      const editor = editors.get(file.id);
      const uri = `file:///${folder}/${file.name}`;
      if (!editor || editor.languageUri === uri) continue;
      editor.languageUri = uri;
      editor.view.dispatch({ effects: editor.language.reconfigure(languageExtensions(uri, session)) });
      forceLinting(editor.view);
    }
  });

  createEffect(() => {
    opts.displayErrors();
    opts.eslintEnabled();
    relint();
  });

  onCleanup(() => {
    for (const editor of editors.values()) editor.destroy();
    editors.clear();
    output?.view.destroy();
    output = undefined;
    session.client.disconnect();
    session.worker.terminate();
  });

  const buildOutput = () => {
    const appearance = new Compartment();
    const view = new EditorView({
      doc: '',
      extensions: [
        baseExtensions(),
        appearance.of(appearanceExtensions(opts.isDark(), opts.fontSize())),
        javascript({ typescript: true, jsx: true }),
        EditorState.readOnly.of(true),
      ],
    });
    const api: OutputView = {
      attach: (parent) => parent.appendChild(view.dom),
      setDoc: (doc) => replaceDoc(view, doc),
    };
    return { view, appearance, api };
  };

  return {
    attach: (fileId, parent, focus) => ensureEditor(fileId)?.attach(parent, focus),
    async format(fileId) {
      const view = editors.get(fileId)?.view;
      if (view) await formatView(view);
    },
    async fix(fileId) {
      const view = editors.get(fileId)?.view;
      if (view) await fixView(view);
    },
    getView: (fileId) => editors.get(fileId)?.view,
    ensureOutputView() {
      output ??= buildOutput();
      return output.api;
    },
    syncTypes(importMap) {
      session
        .syncTypes(importMap)
        .then((changed) => changed && relint())
        .catch((e) => console.warn('[solid-repl] type acquisition failed', e));
    },
  };
};
