import { findReferences, jumpToDefinition, renameSymbol } from '@codemirror/lsp-client';
import type { EditorView } from '@codemirror/view';
import type { Accessor } from 'solid-js';
import {
  arrowTopRightOnSquare,
  bell,
  bellSlash,
  bookmark,
  clipboard,
  codeBracket,
  documentDuplicate,
  pencil,
  scissors,
} from 'solid-heroicons/outline';
import type { Command } from '../kernel/commands';

export interface EditorCommandContext {
  activeView(): EditorView | undefined;
  activeFileId(): string | undefined;
  format(fileId: string): Promise<void>;
  fix(fileId: string): Promise<void>;
  displayErrors: Accessor<boolean>;
  setDisplayErrors(value: boolean): void;
}

export function createEditorCommands(ctx: EditorCommandContext): Command[] {
  const hasEditor = () => ctx.activeFileId() !== undefined;

  const run = (command: (view: EditorView) => unknown) => () => {
    const view = ctx.activeView();
    if (!view) return;
    view.focus();
    command(view);
  };

  const withView = (fn: (view: EditorView) => unknown) => () => {
    const view = ctx.activeView();
    if (view) fn(view);
  };

  const selectedText = (view: EditorView) => {
    const selection = view.state.selection.main;
    return selection.empty
      ? view.state.doc.lineAt(selection.head).text
      : view.state.sliceDoc(selection.from, selection.to);
  };

  return [
    {
      id: 'editor.goToDefinition',
      title: 'Go to definition',
      icon: arrowTopRightOnSquare,
      group: 'Code actions',
      key: 'F12',
      menus: ['editor/context'],
      when: hasEditor,
      run: run(jumpToDefinition),
    },
    {
      id: 'editor.findReferences',
      title: 'Show references',
      icon: bookmark,
      group: 'Code actions',
      key: 'Shift-F12',
      menus: ['editor/context'],
      when: hasEditor,
      run: run(findReferences),
    },
    {
      id: 'editor.renameSymbol',
      title: 'Rename symbol',
      icon: pencil,
      group: 'Code actions',
      key: 'F2',
      menus: ['editor/context'],
      when: hasEditor,
      run: run(renameSymbol),
    },
    {
      id: 'editor.format',
      title: 'Format document',
      icon: codeBracket,
      group: 'Code actions',
      key: 'Mod-s',
      menus: ['editor/context', 'editor/toolbar'],
      when: hasEditor,
      run: () => {
        const id = ctx.activeFileId();
        if (!id) return;
        void ctx.format(id).then(() => ctx.fix(id));
      },
    },
    {
      id: 'editor.toggleErrors',
      get title() {
        return ctx.displayErrors() ? 'Disable error reporting' : 'Enable error reporting';
      },
      get icon() {
        return ctx.displayErrors() ? bell : bellSlash;
      },
      group: 'Editor',
      menus: ['editor/toolbar'],
      run: () => ctx.setDisplayErrors(!ctx.displayErrors()),
    },
    {
      id: 'editor.copy',
      title: 'Copy',
      icon: documentDuplicate,
      group: 'Clipboard',
      shortcut: 'Mod-c',
      menus: ['editor/context'],
      when: hasEditor,
      run: withView(async (view) => {
        await navigator.clipboard.writeText(selectedText(view));
      }),
    },
    {
      id: 'editor.cut',
      title: 'Cut',
      icon: scissors,
      group: 'Clipboard',
      shortcut: 'Mod-x',
      menus: ['editor/context'],
      when: hasEditor,
      run: withView(async (view) => {
        await navigator.clipboard.writeText(selectedText(view));
        view.focus();
        view.dispatch(view.state.replaceSelection(''));
      }),
    },
    {
      id: 'editor.paste',
      title: 'Paste',
      icon: clipboard,
      group: 'Clipboard',
      shortcut: 'Mod-v',
      menus: ['editor/context'],
      when: hasEditor,
      run: withView(async (view) => {
        const text = await navigator.clipboard.readText();
        view.focus();
        view.dispatch(view.state.replaceSelection(text));
      }),
    },
  ];
}
