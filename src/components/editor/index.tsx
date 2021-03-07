import { Component, createEffect, onMount, splitProps, JSX, Show, createSignal } from 'solid-js';
import * as monaco from 'monaco-editor';
import { Uri } from 'monaco-editor';
import { Icon } from '@amoutonbrady/solid-heroicons';
import {
  clipboard,
  code,
  checkCircle,
  clipboardCheck,
} from '@amoutonbrady/solid-heroicons/outline';
import { Tab } from '../../store';
import './setupSolid';

const Editor: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, [
    'onDocChange',
    'value',
    'disabled',
    'styles',
    'canCopy',
    'classList',
    'canFormat',
    'onFormat',
    'class',
    'isDark',
  ]);
  let parent!: HTMLDivElement;
  let editor: monaco.editor.IStandaloneCodeEditor;

  const [format, setFormat] = createSignal(false);
  function formatCode() {
    internal.onFormat(editor.getValue());
    setFormat(true);
    setTimeout(setFormat, 750, false);
  }

  const [clip, setClip] = createSignal(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(editor.getValue()).then(() => {
      setClip(true);
      setTimeout(setClip, 750, false);
    });
  }

  // Initialize CodeMirror
  onMount(() => {
    let fileUri = Uri.parse(`file:///${internal.value.name}.${internal.value.type}`);
    let model = monaco.editor.getModel(fileUri);
    editor = monaco.editor.create(parent, {
      model,
      automaticLayout: true,
      readOnly: internal.disabled,
    });

    editor.onDidChangeModelContent(() => {
      if (internal.onDocChange) internal.onDocChange(editor.getValue());
    });

    createEffect(() => {
      model.setValue(internal.value.source || '');
    });
    createEffect(() => {
      monaco.editor.setTheme(internal.isDark ? 'vs-dark' : 'vs');
    });
  });

  createEffect(() => {
    if (!editor) return;
    editor.setValue(internal.value?.source);
  });

  return (
    <div
      {...external}
      class={`grid ${internal.class || ''}`}
      classList={{ ...(internal.classList || {}), relative: internal.canCopy }}
      style="grid-template-rows: 1fr auto"
    >
      <div class="p-0 text-0.5sm md:text-sm overflow-auto" ref={parent}></div>

      <div
        class="flex justify-end space-x-2 p-2"
        classList={{ hidden: !internal.canFormat && !internal.canCopy }}
      >
        <Show when={internal.canFormat}>
          <button
            type="button"
            onClick={formatCode}
            class="inline-flex items-center p-1 rounded-lg text-sm uppercase leading-none focus:outline-none focus:ring-1"
            title="Format the source code"
            classList={{
              'text-blueGray-400': !format(),
              'text-green-900': format(),
            }}
          >
            <span class="sr-only">{format() ? 'Code formatted!' : 'Format code'}</span>
            <Icon path={format() ? checkCircle : code} class="h-6" />
          </button>
        </Show>

        <Show when={internal.canCopy}>
          <button
            type="button"
            onClick={copyToClipboard}
            class="inline-flex items-center p-1 rounded-lg text-sm uppercase leading-none focus:outline-none focus:ring-1"
            title="Copy the source code"
            classList={{
              'text-blueGray-400': !clip(),
              'text-green-900': clip(),
            }}
          >
            <span class="sr-only">{clip() ? 'Copied!' : 'Copy'}</span>
            <Icon path={clip() ? clipboardCheck : clipboard} class="h-6" />
          </button>
        </Show>
      </div>
    </div>
  );
};

export default Editor;

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  value: Tab;
  disabled: boolean;
  styles: Record<string, string>;
  canCopy?: boolean;
  canFormat?: boolean;
  isDark?: boolean;
  onFormat?: (code: string) => unknown;
  onDocChange?: (code: string) => unknown;
}
