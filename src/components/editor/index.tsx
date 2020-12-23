import { Component, createEffect, onMount, splitProps, JSX, Show, createSignal } from 'solid-js';

import { Icon } from '@amoutonbrady/solid-heroicons';
import {
  clipboard,
  code,
  checkCircle,
  clipboardCheck,
} from '@amoutonbrady/solid-heroicons/outline';

import { basicSetup, EditorState, EditorView } from './basicSetup';

const Editor: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, [
    'onDocChange',
    'value',
    'disabled',
    'defaultValue',
    'styles',
    'canCopy',
    'classList',
    'canFormat',
    'onFormat',
    'class',
  ]);

  let parent!: HTMLDivElement;
  let state: EditorState;
  let view: EditorView;

  /**
   * This creates a new EditorState. This is helpful stay in control of the
   * content from the outside of CodeMirror.
   *
   * @param doc {string} - The new document string
   * @param disabled {boolean} - Whether the editor is readonly or not
   */
  function createEditorState(doc: string, disabled: boolean = false): EditorState {
    return EditorState.create({
      doc,
      extensions: [
        basicSetup(internal.styles),
        EditorView.updateListener.of((update) => {
          // This trigger the onDocChange event and save the cursor
          // for the next state.
          if (update.docChanged && internal.onDocChange) {
            if (internal.value === update.state.doc.toString()) return;

            internal.onDocChange(update.state.doc.toString());
          }
        }),
        ...(disabled ? [EditorView.editable.of(false)] : []),
      ],
    });
  }

  const [format, setFormat] = createSignal(false);
  function formatCode() {
    internal.onFormat(view.state.doc.toString());
    setFormat(true);
    setTimeout(setFormat, 750, false);
  }

  const [clip, setClip] = createSignal(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(view.state.doc.toString()).then(() => {
      setClip(true);
      setTimeout(setClip, 750, false);
    });
  }

  // Initialize CodeMirror
  onMount(() => {
    state = createEditorState(internal.defaultValue || internal.value || '', internal.disabled);
    view = new EditorView({ state, parent });
  });

  createEffect(() => {
    if (!view) return;
    view.setState(createEditorState(internal.value, internal.disabled));
  });

  return (
    <div
      {...external}
      class={`flex flex-col ${internal.class || ''}`}
      classList={{ ...(internal.classList || {}), relative: internal.canCopy }}
    >
      <div class="flex-1 p-2" ref={parent}></div>

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
  onDocChange?: (code: string) => unknown;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  styles?: Record<string, any>;
  canCopy?: boolean;
  canFormat?: boolean;
  onFormat?: (code: string) => unknown;
}
