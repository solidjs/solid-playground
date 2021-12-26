import { Component, createEffect, onMount, onCleanup } from 'solid-js';
import { Uri, languages, editor as mEditor } from 'monaco-editor';
import { liftOff } from './setupSolid';
import useZoom from '../../hooks/useZoom';

interface Props {
  classList?: {
    [k: string]: boolean | undefined;
  };
  class?: string;
  url: string;
  disabled: boolean;
  styles: Record<string, string>;
  canFormat?: boolean;
  isDark?: boolean;
  withMinimap?: boolean;
  formatter?: Worker;
  onDocChange?: (code: string) => unknown;
  ref?: (editor: mEditor.IStandaloneCodeEditor) => unknown;
}

const Editor: Component<Props> = (props) => {
  let parent!: HTMLDivElement;
  let editor: mEditor.IStandaloneCodeEditor;

  const { zoomState } = useZoom();

  const model = () => mEditor.getModel(Uri.parse(props.url));

  if (props.formatter) {
    languages.registerDocumentFormattingEditProvider('typescript', {
      async provideDocumentFormattingEdits(model) {
        props.formatter!.postMessage({
          event: 'FORMAT',
          code: model.getValue(),
          pos: editor.getPosition(),
        });

        return new Promise((resolve, reject) => {
          props.formatter!.addEventListener(
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

  const setupEditor = () => {
    editor = mEditor.create(parent, {
      model: null,
      automaticLayout: true,
      readOnly: props.disabled,
      fontSize: zoomState.fontSize,
      lineDecorationsWidth: 5,
      lineNumbersMinChars: 3,
      padding: { top: 15 },
      minimap: {
        enabled: props.withMinimap,
      },
    });

    editor.onDidChangeModelContent(() => {
      props.onDocChange?.(editor.getValue());
    });

    props.ref?.(editor);
  };

  // Initialize Monaco
  onMount(() => setupEditor());
  onCleanup(() => editor?.dispose());

  createEffect(() => {
    editor.setModel(model());
    liftOff();
  });

  createEffect(() => {
    mEditor.setTheme(props.isDark ? 'vs-dark-plus' : 'vs-light-plus');
  });

  createEffect(() => {
    const fontSize = zoomState.fontSize;
    editor.updateOptions({ fontSize });
  });

  return (
    <div
      class={`p-0 dark:text-white ${props.class || ''}`}
      classList={props.classList}
      ref={parent}
    />
  );
};

export default Editor;
