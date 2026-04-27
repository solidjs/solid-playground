import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { type LanguageSupport, syntaxTree } from '@codemirror/language';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, keymap } from '@codemirror/view';
import { type Extension, StateEffect, StateField } from '@codemirror/state';
import {
  LSPClient,
  type Transport,
  findReferences,
  findReferencesKeymap,
  formatKeymap,
  hoverTooltips,
  jumpToDefinition,
  jumpToDefinitionKeymap,
  renameKeymap,
  serverCompletionSource,
  signatureHelp,
} from '@codemirror/lsp-client';
import { autocompletion } from '@codemirror/autocomplete';

export const typescript = ({ jsx }: { jsx: boolean } = { jsx: false }): LanguageSupport => {
  return javascript({ typescript: true, jsx });
};

const monospace = 'Menlo, Monaco, Consolas, "Andale Mono", "Ubuntu Mono", "Courier New", monospace';

export const typescriptLspTheme: Extension = EditorView.theme({
  '.cm-lsp-hover-tooltip, .cm-lsp-signature-tooltip, .cm-lsp-completion-documentation': {
    'max-width': '700px',
    'max-height': '250px',
    'overflow': 'auto',
    'border': '1px solid #454545',
    'padding': '0',
  },
  '.cm-lsp-completion-documentation': { 'max-width': '500px' },
  '.cm-lsp-hover-tooltip pre, .cm-lsp-completion-documentation pre': {
    'white-space': 'pre-wrap',
    'font-family': monospace,
    'margin': '0',
    'padding': '8px',
    'border-bottom': '1px solid #454545',
  },
  '.cm-lsp-hover-tooltip > p, .cm-lsp-completion-documentation > p, .cm-lsp-signature-tooltip > p': {
    padding: '0 8px',
  },
  '.cm-lsp-signature-tooltip': { padding: '0' },
  '.cm-lsp-signature': { 'padding': '8px', 'font-family': monospace },
  '.cm-lsp-signature-tooltip .cm-lsp-documentation': { padding: '8px' },
  '.cm-lsp-signature-documentation': { 'border-top': '1px solid #454545' },
  '.cm-lsp-documentation p:first-child': { 'margin-top': '0' },
  '.cm-lsp-documentation p:last-child': { 'margin-bottom': '0' },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': { 'font-family': monospace },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    background: '#04395e',
    color: 'unset',
  },
  '.cm-completionMatchedText': { 'text-decoration': 'none', 'color': '#2aaaff' },
  '.cm-completionDetail': {
    'text-overflow': 'ellipsis',
    'overflow': 'hidden',
    'max-width': '350px',
    'display': 'inline-block',
    'float': 'right',
  },
  '.cm-tooltip-hover': { 'z-index': '150' },
  'a': { 'color': '#3794ff', 'text-decoration': 'inherit' },
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
    onMouseMove: (e: MouseEvent) => void;
    onKeyDown: (e: KeyboardEvent) => void;
    onKeyUp: (e: KeyboardEvent) => void;
    onBlur: () => void;
    onMouseLeave: () => void;

    constructor(public view: EditorView) {
      const set = (range: { from: number; to: number } | null) => {
        if (
          (range == null && this.last == null) ||
          (range != null && this.last != null && range.from === this.last.from && range.to === this.last.to)
        )
          return;
        this.last = range;
        view.dispatch({ effects: setCmdHoverRange.of(range) });
      };

      this.onMouseMove = (e) => {
        this.active = e.metaKey || e.ctrlKey;
        if (!this.active) return set(null);
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos == null || !view.coordsForChar(pos)) return set(null);
        const node = syntaxTree(view.state).resolveInner(pos, 1);
        if (!allowedNode.has(node.name)) return set(null);
        set({ from: node.from, to: node.to });
      };
      this.onKeyUp = (e) => {
        if (e.key === 'Meta' || e.key === 'Control') {
          this.active = false;
          set(null);
        }
      };
      this.onKeyDown = (e) => {
        if (e.key === 'Meta' || e.key === 'Control') this.active = true;
      };
      this.onBlur = () => {
        this.active = false;
        set(null);
      };
      this.onMouseLeave = () => set(null);

      const dom = view.dom;
      dom.addEventListener('mousemove', this.onMouseMove);
      dom.addEventListener('mouseleave', this.onMouseLeave);
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      window.addEventListener('blur', this.onBlur);
    }

    destroy() {
      const dom = this.view.dom;
      dom.removeEventListener('mousemove', this.onMouseMove);
      dom.removeEventListener('mouseleave', this.onMouseLeave);
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('blur', this.onBlur);
    }
  },
);

const cmdHoverTheme = EditorView.theme({
  '.cm-cmdHoverLink': {
    'text-decoration': 'underline',
    'cursor': 'pointer',
  },
});

const cmdHover: Extension = [cmdHoverField, cmdHoverListeners, cmdHoverTheme];

export function createTypescriptLSPClient(transport: Transport): LSPClient {
  const client = new LSPClient({
    extensions: [
      autocompletion({ override: [serverCompletionSource] }),
      hoverTooltips(),
      signatureHelp(),
      cmdHover,
      keymap.of([
        ...formatKeymap,
        ...renameKeymap,
        ...jumpToDefinitionKeymap,
        ...findReferencesKeymap,
        { key: 'Mod-b', run: jumpToDefinition, preventDefault: true },
        { key: 'Mod-Shift-b', run: findReferences, preventDefault: true },
      ]),
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
    ],
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
