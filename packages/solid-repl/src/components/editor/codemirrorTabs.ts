import { createEffect, createMemo, onCleanup } from 'solid-js';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment, type Extension } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { bracketMatching, codeFolding, foldGutter, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { highlightSelectionMatches, search } from '@codemirror/search';
import { forceLinting, lintGutter, linter, type Diagnostic } from '@codemirror/lint';
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap';
import { json } from '@codemirror/lang-json';
import type { Tab } from 'solid-repl';

import { typescript, typescriptLspTheme } from './typescriptLsp';
import { createTypescriptSession, type TypescriptSession } from './setupTypescript';
import { darkTheme, lightTheme, darkHighlightStyle, lightHighlightStyle } from './themes';

export interface CodemirrorTabsOptions {
  isDark: () => boolean;
  fontSize: () => number;
  displayErrors: () => boolean;
  formatter?: Worker;
  linter?: Worker;
  onUserEdit?: () => void;
  onDocChange?: (uri: string, tab: Tab) => void;
}

interface TabLookup {
  view: EditorView;
  themeCompartment: Compartment;
  fontCompartment: Compartment;
  destroy: () => void;
}

interface OutputEntry {
  view: EditorView;
  themeCompartment: Compartment;
  fontCompartment: Compartment;
}

export interface OutputView {
  view: EditorView;
  setDoc: (doc: string) => void;
  destroy: () => void;
}

export interface CodemirrorTabs {
  get(uri: string): TabLookup | undefined;
  setSource(uri: string, source: string): void;
  format(view: EditorView): void;
  fix(view: EditorView): void;
  session: TypescriptSession;
  createOutputView(initialDoc: string): OutputView;
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
  EditorState.allowMultipleSelections.of(true),
  EditorView.lineWrapping,
  keymap.of(vscodeKeymap),
];

const tsExts = new Set(['tsx', 'jsx', 'ts', 'js', 'mts', 'cts', 'mjs', 'cjs']);

const buildLanguageExtension = (uri: string, session: TypescriptSession): Extension => {
  const ext = fileExtension(uri);
  if (ext === 'tsx' || ext === 'jsx') {
    return [typescript({ jsx: true }), session.client.plugin(uri, 'typescript'), typescriptLspTheme];
  }
  if (tsExts.has(ext)) {
    return [typescript({ jsx: false }), session.client.plugin(uri, 'typescript'), typescriptLspTheme];
  }
  if (ext === 'json') {
    return [json(), autocompletion()];
  }
  return [];
};

let nextRequestId = 0;
const lintWorkerRequest = (
  worker: Worker,
  event: 'LINT' | 'FIX',
  code: string,
): Promise<{ markers: LintMarker[]; output?: string; fixed?: boolean }> => {
  const id = ++nextRequestId;
  return new Promise((resolve) => {
    const onMessage = ({ data }: MessageEvent) => {
      if (data.id !== id) return;
      worker.removeEventListener('message', onMessage);
      resolve({ markers: data.markers ?? [], output: data.output, fixed: data.fixed });
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ event, id, code });
  });
};

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

const buildLintExtension = (
  uri: string,
  session: TypescriptSession,
  opts: CodemirrorTabsOptions,
): Extension => {
  const ext = fileExtension(uri);
  const isTs = tsExts.has(ext);
  if (!isTs && !opts.linter) return [];

  return [
    linter(
      async (view) => {
        if (!opts.displayErrors()) return [];
        const diagnostics: Diagnostic[] = [];
        if (isTs) {
          session.client.sync();
          diagnostics.push(...(await session.getDiagnostics(uri, view)));
        }
        if (isTs && opts.linter) {
          const { markers } = await lintWorkerRequest(opts.linter, 'LINT', view.state.doc.toString());
          diagnostics.push(...markersToDiagnostics(view, markers));
        }
        return diagnostics;
      },
      { delay: 250 },
    ),
    lintGutter(),
  ];
};

const formatRequest = (worker: Worker, code: string): Promise<string | null> =>
  new Promise((resolve) => {
    const onMessage = ({ data }: MessageEvent) => {
      if (data.event !== 'FORMAT') return;
      worker.removeEventListener('message', onMessage);
      resolve(typeof data.code === 'string' ? data.code : null);
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ event: 'FORMAT', code });
  });

export const createCodemirrorTabs = (
  folder: string,
  tabs: () => Tab[],
  opts: CodemirrorTabsOptions,
): CodemirrorTabs => {
  const session = createTypescriptSession();
  const outputViews = new Set<OutputEntry>();

  const replaceDoc = (view: EditorView, next: string) => {
    if (view.state.doc.toString() === next) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
  };

  const formatView = async (view: EditorView) => {
    if (!opts.formatter) return;
    const formatted = await formatRequest(opts.formatter, view.state.doc.toString());
    if (formatted != null) replaceDoc(view, formatted);
  };

  const fixView = async (view: EditorView) => {
    if (!opts.linter || !opts.displayErrors()) return;
    const code = view.state.doc.toString();
    const { output, fixed } = await lintWorkerRequest(opts.linter, 'FIX', code);
    if (fixed && typeof output === 'string') replaceDoc(view, output);
  };

  const saveKeymap = keymap.of([
    {
      key: 'Mod-s',
      preventDefault: true,
      run(view) {
        formatView(view).then(() => fixView(view));
        return true;
      },
    },
  ]);

  const buildLookup = (uri: string, tab: Tab): TabLookup => {
    const themeCompartment = new Compartment();
    const fontCompartment = new Compartment();

    const view = new EditorView({
      doc: tab.source,
      extensions: [
        baseExtensions(),
        saveKeymap,
        themeCompartment.of(themeExtensions(opts.isDark())),
        fontCompartment.of(fontExtension(opts.fontSize())),
        buildLintExtension(uri, session, opts),
        buildLanguageExtension(uri, session),
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return;
          const next = u.state.doc.toString();
          if (tab.source === next) return;
          tab.source = next;
          opts.onDocChange?.(uri, tab);
          const userEdit = u.transactions.some(
            (tr) => tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('move'),
          );
          if (userEdit) opts.onUserEdit?.();
        }),
      ],
    });

    return {
      view,
      themeCompartment,
      fontCompartment,
      destroy: () => {
        view.destroy();
      },
    };
  };

  const lookups = new Map<string, TabLookup>();
  const registered = new Map<string, string>();

  const isTsLikeUri = (uri: string) => tsExts.has(fileExtension(uri));

  const tabsByUri = createMemo<Map<string, Tab>>(() => {
    const next = new Map<string, Tab>();
    for (const tab of tabs()) {
      next.set(`file:///${folder}/${tab.name}`, tab);
    }

    // dispose lookups + close worker files for removed tabs
    for (const [uri, lookup] of lookups) {
      if (!next.has(uri)) {
        lookup.destroy();
        lookups.delete(uri);
      }
    }
    for (const uri of registered.keys()) {
      if (!next.has(uri)) {
        session.worker.postMessage({
          method: 'textDocument/didClose',
          params: { textDocument: { uri } },
        });
        registered.delete(uri);
      }
    }

    // eagerly sync tab contents to the worker so cross-file imports resolve
    // even when no editor is mounted for that file
    for (const [uri, tab] of next) {
      if (!isTsLikeUri(uri)) continue;
      const known = registered.get(uri);
      if (known === tab.source) continue;
      const isOpen = registered.has(uri);
      registered.set(uri, tab.source);
      session.worker.postMessage(
        isOpen
          ? {
              method: 'textDocument/didChange',
              params: { textDocument: { uri, version: 0 }, contentChanges: [{ text: tab.source }] },
            }
          : {
              method: 'textDocument/didOpen',
              params: { textDocument: { uri, languageId: 'typescript', version: 0, text: tab.source } },
            },
      );
    }

    return next;
  });

  const ensureLookup = (uri: string): TabLookup | undefined => {
    let lookup = lookups.get(uri);
    if (lookup) return lookup;
    const tab = tabsByUri().get(uri);
    if (!tab) return undefined;
    lookup = buildLookup(uri, tab);
    lookups.set(uri, lookup);
    return lookup;
  };

  createEffect(() => {
    const ext = themeExtensions(opts.isDark());
    for (const lookup of lookups.values()) {
      lookup.view.dispatch({ effects: lookup.themeCompartment.reconfigure(ext) });
    }
    for (const out of outputViews) {
      out.view.dispatch({ effects: out.themeCompartment.reconfigure(ext) });
    }
  });

  createEffect(() => {
    const ext = fontExtension(opts.fontSize());
    for (const lookup of lookups.values()) {
      lookup.view.dispatch({ effects: lookup.fontCompartment.reconfigure(ext) });
    }
    for (const out of outputViews) {
      out.view.dispatch({ effects: out.fontCompartment.reconfigure(ext) });
    }
  });

  createEffect(() => {
    opts.displayErrors();
    for (const lookup of lookups.values()) {
      forceLinting(lookup.view);
    }
  });

  onCleanup(() => {
    for (const lookup of lookups.values()) lookup.destroy();
    lookups.clear();
    for (const out of outputViews) out.view.destroy();
    outputViews.clear();
    session.client.disconnect();
    session.worker.terminate();
  });

  return {
    get(uri) {
      // make sure the memo runs so registered files stay in sync
      tabsByUri();
      return ensureLookup(uri);
    },
    setSource(uri, source) {
      const lookup = lookups.get(uri);
      if (lookup) replaceDoc(lookup.view, source);
    },
    format: formatView,
    fix: fixView,
    session,
    createOutputView(initialDoc) {
      const themeCompartment = new Compartment();
      const fontCompartment = new Compartment();
      const view = new EditorView({
        doc: initialDoc,
        extensions: [
          baseExtensions(),
          themeCompartment.of(themeExtensions(opts.isDark())),
          fontCompartment.of(fontExtension(opts.fontSize())),
          typescript({ jsx: true }),
          EditorState.readOnly.of(true),
        ],
      });
      const entry: OutputEntry = { view, themeCompartment, fontCompartment };
      outputViews.add(entry);
      return {
        view,
        setDoc(doc) {
          replaceDoc(view, doc);
        },
        destroy() {
          outputViews.delete(entry);
          view.destroy();
        },
      };
    },
  };
};
