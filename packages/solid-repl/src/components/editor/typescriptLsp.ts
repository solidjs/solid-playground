import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { type LanguageSupport, syntaxTree } from '@codemirror/language';
import { Decoration, type DecorationSet, EditorView, ViewPlugin } from '@codemirror/view';
import { type Extension, StateEffect, StateField } from '@codemirror/state';
import { LSPClient, type Transport, jumpToDefinition, languageServerExtensions } from '@codemirror/lsp-client';

export const typescript = ({ jsx }: { jsx: boolean } = { jsx: false }): LanguageSupport => {
  return javascript({ typescript: true, jsx });
};

const monospace = 'Menlo, Monaco, Consolas, "Andale Mono", "Ubuntu Mono", "Courier New", monospace';

export const typescriptLspTheme: Extension = EditorView.theme({
  '.cm-lsp-hover-tooltip, .cm-lsp-signature-tooltip, .cm-lsp-completion-documentation': {
    'max-width': '700px',
    'max-height': '250px',
    'overflow': 'auto',
    'padding': '0',
  },
  '.cm-lsp-completion-documentation': { 'max-width': '500px' },
  '.cm-lsp-hover-tooltip pre, .cm-lsp-completion-documentation pre': {
    'white-space': 'pre-wrap',
    'font-family': monospace,
    'margin': '0',
    'padding': '8px',
  },
  '.cm-lsp-hover-tooltip > p, .cm-lsp-completion-documentation > p, .cm-lsp-signature-tooltip > p': {
    padding: '0 8px',
  },
  '.cm-lsp-signature-tooltip': { padding: '0' },
  '.cm-lsp-signature': { 'padding': '8px', 'font-family': monospace },
  '.cm-lsp-signature-tooltip .cm-lsp-documentation': { padding: '8px' },
  '.cm-lsp-documentation p:first-child': { 'margin-top': '0' },
  '.cm-lsp-documentation p:last-child': { 'margin-bottom': '0' },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': { 'font-family': monospace },
  '.cm-completionMatchedText': { 'text-decoration': 'none' },
  '.cm-completionDetail': {
    'text-overflow': 'ellipsis',
    'overflow': 'hidden',
    'max-width': '350px',
    'display': 'inline-block',
    'float': 'right',
  },
  '.cm-tooltip-hover': { 'z-index': '150' },
  'a': { 'text-decoration': 'inherit' },
});

export function createWorkerTransport(worker: Worker): Transport {
  const handlers = new Set<(value: string) => void>();
  worker.addEventListener('message', (e: MessageEvent) => {
    const json = JSON.stringify(e.data);
    for (const h of handlers) h(json);
  });
  return {
    send(message) {
      worker.postMessage(JSON.parse(message));
    },
    subscribe(handler) {
      handlers.add(handler);
    },
    unsubscribe(handler) {
      handlers.delete(handler);
    },
  };
}

const cmdHoverMark = Decoration.mark({ class: 'cm-cmdHoverLink' });
const allowedNode = new Set([
  'VariableName',
  'VariableDefinition',
  'PropertyName',
  'PropertyDefinition',
  'TypeName',
  'TypeDefinition',
  'JSXIdentifier',
  'Label',
]);
const setCmdHoverRange = StateEffect.define<{ from: number; to: number } | null>();

const cmdHoverField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    let next = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setCmdHoverRange)) {
        next = e.value ? Decoration.set([cmdHoverMark.range(e.value.from, e.value.to)]) : Decoration.none;
      }
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const cmdHoverListeners = ViewPlugin.fromClass(
  class {
    active = false;
    last: { from: number; to: number } | null = null;
    onKeyDown: (e: KeyboardEvent) => void;
    onKeyUp: (e: KeyboardEvent) => void;
    onBlur: () => void;

    constructor(public view: EditorView) {
      this.onKeyDown = (e) => {
        if (e.key === 'Meta' || e.key === 'Control') this.active = true;
      };
      this.onKeyUp = (e) => {
        if (e.key === 'Meta' || e.key === 'Control') {
          this.active = false;
          this.set(null);
        }
      };
      this.onBlur = () => {
        this.active = false;
        this.set(null);
      };
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      window.addEventListener('blur', this.onBlur);
    }

    set(range: { from: number; to: number } | null) {
      if (
        (range == null && this.last == null) ||
        (range != null && this.last != null && range.from === this.last.from && range.to === this.last.to)
      )
        return;
      this.last = range;
      this.view.dispatch({ effects: setCmdHoverRange.of(range) });
    }

    destroy() {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('blur', this.onBlur);
    }
  },
  {
    eventHandlers: {
      mousemove(event, view) {
        this.active = event.metaKey || event.ctrlKey;
        if (!this.active) return this.set(null);
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos == null || !view.coordsForChar(pos)) return this.set(null);
        const node = syntaxTree(view.state).resolveInner(pos, 1);
        if (!allowedNode.has(node.name)) return this.set(null);
        this.set({ from: node.from, to: node.to });
      },
      mouseleave() {
        this.set(null);
      },
    },
  },
);

const cmdHoverTheme = EditorView.theme({
  '.cm-cmdHoverLink': {
    'text-decoration': 'underline',
    'cursor': 'pointer',
  },
});

const cmdHover: Extension = [cmdHoverField, cmdHoverListeners, cmdHoverTheme];

export const typescriptLspExtras: Extension = [
  cmdHover,
  EditorView.domEventHandlers({
    mousedown(event, view) {
      if (!event.metaKey && !event.ctrlKey) return false;
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos == null) return false;
      event.preventDefault();
      view.dispatch({ selection: { anchor: pos } });
      jumpToDefinition(view);
      return true;
    },
  }),
];

export function createTypescriptLSPClient(transport: Transport): LSPClient {
  const client = new LSPClient({
    extensions: languageServerExtensions(),
    highlightLanguage: (name) =>
      name === 'typescript' || name === 'javascript' || name === 'ts' || name === 'js' ? javascriptLanguage : null,
  });
  client.connect(transport);
  return client;
}

export interface TsLspDiagnostic {
  start: number;
  length: number;
  severity: number;
  message: string;
}
