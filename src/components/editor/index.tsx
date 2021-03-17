import {
  Component,
  createEffect,
  onMount,
  JSX,
  Show,
  createSignal,
  createMemo,
  onCleanup,
} from 'solid-js';
import { Uri, editor as mEditor } from 'monaco-editor';
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
  let parent!: HTMLDivElement;
  let editor: mEditor.IStandaloneCodeEditor;
  let model = createMemo(() =>
    mEditor.getModel(Uri.parse(`file:///${props.value.name}.${props.value.type}`)),
  );

  const [format, setFormat] = createSignal(false);
  function formatCode() {
    props.onFormat(editor.getValue());
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
    editor = mEditor.create(parent, {
      model: null,
      automaticLayout: true,
      readOnly: props.disabled,
    });

    editor.onDidChangeModelContent(() => {
      if (props.onDocChange) props.onDocChange(editor.getValue());
    });
  });
  onCleanup(() => editor.dispose());

  createEffect(() => {
    editor.setModel(model());
  });
  createEffect(() => {
    model().setValue(props.value.source || '');
  });
  createEffect(() => {
    mEditor.setTheme(props.isDark ? 'vs-dark' : 'vs');
  });

  return (
    <div
      class={`grid ${props.class || ''}`}
      classList={{ ...(props.classList || {}), relative: props.canCopy }}
      style="grid-template-rows: 1fr auto"
    >
      <div class="p-0 text-0.5sm md:text-sm overflow-hidden" ref={parent}></div>

      <div
        class="flex justify-end space-x-2 p-2"
        classList={{ hidden: !props.canFormat && !props.canCopy }}
      >
        <Show when={props.canFormat}>
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

        <Show when={props.canCopy}>
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
