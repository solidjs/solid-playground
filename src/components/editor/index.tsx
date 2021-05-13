import {
  Component,
  createEffect,
  onMount,
  JSX,
  Show,
  createSignal,
  createMemo,
  onCleanup,
  mergeProps,
} from 'solid-js';
import { Uri, languages, editor as mEditor } from 'monaco-editor';
import { Icon } from '@amoutonbrady/solid-heroicons';
import {
  clipboard,
  code,
  checkCircle,
  clipboardCheck,
} from '@amoutonbrady/solid-heroicons/outline';
import { liftOff } from './setupSolid';

const Editor: Component<Props> = (props) => {
  const finalProps = mergeProps({ showActionBar: true }, props);

  let parent!: HTMLDivElement;
  let editor: mEditor.IStandaloneCodeEditor;
  let model = createMemo(() => mEditor.getModel(Uri.parse(finalProps.url)));

  const [format, setFormat] = createSignal(false);
  function formatCode() {
    if (!format()) {
      editor.getAction('editor.action.formatDocument').run();
      editor.focus();
    }
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

  if (finalProps.formatter) {
    languages.registerDocumentFormattingEditProvider('typescript', {
      provideDocumentFormattingEdits: async (model) => {
        finalProps.formatter.postMessage({
          event: 'FORMAT',
          code: model.getValue(),
          pos: editor.getPosition(),
        });
        return new Promise((resolve, reject) => {
          finalProps.formatter.addEventListener(
            'message',
            ({ data: { event, code } }) => {
              switch (event) {
                case 'RESULT':
                  resolve([
                    {
                      range: model.getFullModelRange(),
                      text: code,
                    },
                  ]);
                  break;
                default:
                  reject();
              }
            },
            { once: true },
          );
        });
      },
    });
  }

  // Initialize CodeMirror
  onMount(() => {
    editor = mEditor.create(parent, {
      model: null,
      automaticLayout: true,
      readOnly: finalProps.disabled,
      language: model().getModeId(),
      fontSize: 15,
      lineDecorationsWidth: 5,
      lineNumbersMinChars: 3,
      padding: { top: 15 },
      minimap: {
        enabled: finalProps.withMinimap,
      },
    });

    liftOff(editor);

    editor.onDidChangeModelContent(() => {
      if (finalProps.onDocChange) props.onDocChange(editor.getValue());
    });
  });
  onCleanup(() => editor.dispose());

  createEffect(() => {
    editor.setModel(model());
  });

  createEffect(() => {
    mEditor.setTheme(finalProps.isDark ? 'vs-dark-plus' : 'vs-light-plus');
  });

  const showActionBar = () => {
    const hasActions = finalProps.canFormat || props.canCopy;
    return finalProps.showActionBar && hasActions;
  };

  return (
    <div
      class={`grid grid-cols-1 ${finalProps.class || ''}`}
      classList={{ ...(finalProps.classList || {}), relative: props.canCopy }}
      style="grid-template-rows: minmax(0, 1fr) auto"
    >
      <div class="p-0 dark:text-white" ref={parent}></div>

      <div class="flex justify-end space-x-2 p-2" classList={{ hidden: !showActionBar() }}>
        <Show when={finalProps.canFormat}>
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

        <Show when={finalProps.canCopy}>
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
  url: string;
  disabled: boolean;
  styles: Record<string, string>;
  canCopy?: boolean;
  canFormat?: boolean;
  isDark?: boolean;
  withMinimap?: boolean;
  formatter?: Worker;
  onDocChange?: (code: string) => unknown;
  showActionBar?: boolean;
}
