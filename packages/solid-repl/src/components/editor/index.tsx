import { Component, onMount } from 'solid-js';
import {
  arrowTopRightOnSquare,
  bell,
  bellSlash,
  bookOpen,
  bookmark,
  clipboard,
  codeBracket,
  documentDuplicate,
  documentText,
  pencil,
  scissors,
} from 'solid-heroicons/outline';
import {
  findReferences,
  formatDocument,
  jumpToDefinition,
  jumpToImplementation,
  jumpToTypeDefinition,
  renameSymbol,
} from '@codemirror/lsp-client';
import type { EditorView } from '@codemirror/view';
import { IconButton } from '../ui/IconButton';
import { useCommandMenu, type CommandItem } from '../ui/CommandPalette';
import { useRepl } from '../replContext';
import { css } from 'styled-system/css';

const editorContainer = css({ flex: 1, p: 0, minH: 0, minW: 0, display: 'flex', overflow: 'hidden' });

const footer = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  h: '30px',
  px: 2,
  borderTopWidth: '1px',
  borderColor: 'neutral.200',
  bg: 'white',
  _dark: { borderColor: 'neutral.700', bg: 'neutral.900' },
});

const tsExts = new Set(['tsx', 'jsx', 'ts', 'js', 'mts', 'cts', 'mjs', 'cjs']);

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';
const shift = isMac ? '⇧' : 'Shift';

export const Editor: Component<{ name: string }> = (props) => {
  const api = useRepl();
  const uri = api.uriFor(props.name);
  let parent!: HTMLDivElement;

  onMount(() => api.editors.attach(uri, parent));

  const ext = () => props.name.split('.').pop() ?? '';
  const isTs = () => tsExts.has(ext());

  const onContextMenu = (e: MouseEvent) => {
    if (!isTs()) return;
    const view = api.editors.getView(uri);
    if (!view) return;
    e.preventDefault();
    const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
    if (pos != null) {
      const sel = view.state.selection.main;
      const lo = Math.min(sel.anchor, sel.head);
      const hi = Math.max(sel.anchor, sel.head);
      if (pos < lo || pos > hi) view.dispatch({ selection: { anchor: pos } });
    }
    openAt(e.clientX, e.clientY);
  };

  const withView = (fn: (view: EditorView) => unknown) => () => {
    const v = api.editors.getView(uri);
    if (!v) return;
    fn(v);
  };
  const run = (cmd: (view: EditorView) => unknown) =>
    withView((v) => {
      v.focus();
      cmd(v);
    });

  const items = (): CommandItem[] => [
    {
      id: 'def',
      label: 'Go to definition',
      icon: arrowTopRightOnSquare,
      shortcut: 'F12',
      group: 'Code actions',
      onSelect: run(jumpToDefinition),
    },
    {
      id: 'typedef',
      label: 'Go to type definition',
      icon: bookOpen,
      group: 'Code actions',
      onSelect: run(jumpToTypeDefinition),
    },
    {
      id: 'impl',
      label: 'Go to implementation',
      icon: codeBracket,
      group: 'Code actions',
      onSelect: run(jumpToImplementation),
    },
    {
      id: 'refs',
      label: 'Show references',
      icon: bookmark,
      shortcut: `${shift}F12`,
      group: 'Code actions',
      onSelect: run(findReferences),
    },
    {
      id: 'rename',
      label: 'Rename symbol',
      icon: pencil,
      shortcut: 'F2',
      group: 'Code actions',
      onSelect: run(renameSymbol),
    },
    {
      id: 'format',
      label: 'Format document',
      icon: documentText,
      shortcut: `${mod}S`,
      group: 'Code actions',
      onSelect: run(formatDocument),
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: documentDuplicate,
      shortcut: `${mod}C`,
      group: 'Clipboard',
      onSelect: withView(async (v) => {
        const sel = v.state.selection.main;
        const text = sel.empty ? v.state.doc.lineAt(sel.head).text : v.state.sliceDoc(sel.from, sel.to);
        await navigator.clipboard.writeText(text);
      }),
    },
    {
      id: 'cut',
      label: 'Cut',
      icon: scissors,
      shortcut: `${mod}X`,
      group: 'Clipboard',
      onSelect: withView(async (v) => {
        const sel = v.state.selection.main;
        const text = sel.empty ? v.state.doc.lineAt(sel.head).text : v.state.sliceDoc(sel.from, sel.to);
        await navigator.clipboard.writeText(text);
        v.focus();
        v.dispatch(v.state.replaceSelection(''));
      }),
    },
    {
      id: 'paste',
      label: 'Paste',
      icon: clipboard,
      shortcut: `${mod}V`,
      group: 'Clipboard',
      onSelect: withView(async (v) => {
        const text = await navigator.clipboard.readText();
        v.focus();
        v.dispatch(v.state.replaceSelection(text));
      }),
    },
  ];

  const { openAt, Content } = useCommandMenu(items);

  return (
    <>
      <div class={editorContainer} ref={parent} onContextMenu={onContextMenu} />
      <div class={footer}>
        <div />
        <div class={css({ display: 'flex', alignItems: 'center', gap: 1 })}>
          <IconButton
            icon={api.displayErrors() ? bell : bellSlash}
            size="sm"
            title={api.displayErrors() ? 'Disable error reporting' : 'Enable error reporting'}
            onClick={() => api.setDisplayErrors(!api.displayErrors())}
          />
          <IconButton icon={codeBracket} size="sm" title="Format Document" onClick={() => api.editors.format(uri)} />
          <span class={css({ px: 2, fontSize: 'sm', color: 'neutral.500', _dark: { color: 'neutral.400' } })}>
            TypeScript
          </span>
        </div>
      </div>
      <Content />
    </>
  );
};

export const OutputEditor: Component = () => {
  const api = useRepl();
  let parent!: HTMLDivElement;
  onMount(() => api.editors.ensureOutputView().attach(parent));
  return <div class={editorContainer} ref={parent} />;
};

export default Editor;
