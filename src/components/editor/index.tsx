import { Component, createEffect, onMount, onCleanup } from 'solid-js';
import { Uri, languages, editor as mEditor } from 'monaco-editor';
import { liftOff } from './setupSolid';
import { useZoom } from '../../hooks/useZoom';
import type { Repl } from 'solid-repl/lib/repl';

const Editor: Component<{
  url: string;
  disabled?: true;
  isDark?: boolean;
  withMinimap?: boolean;
  formatter?: Worker;
  displayErrors?: boolean;
  onDocChange?: (code: string) => void;
  onEditorReady?: Parameters<Repl>[0]['onEditorReady'];
}> = (props) => {
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

        return new Promise((resolve) => {
          props.formatter!.addEventListener(
            'message',
            ({ data: { code } }) => {
              resolve([
                {
                  range: model.getFullModelRange(),
                  text: code,
                },
              ]);
            },
            { once: true },
          );
        });
      },
    });
  }

  // Initialize Monaco
  onMount(() => {
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
  });
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

  createEffect(() => {
    languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: !props.displayErrors,
      noSyntaxValidation: !props.displayErrors,
    });
  });

  onMount(() => {
    props.onEditorReady?.(editor, { Uri, editor: mEditor });
  });

  return <div class="p-0 h-full min-h-0" ref={parent} />;
};

export default Editor;
