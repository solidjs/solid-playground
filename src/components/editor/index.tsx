import { Component, createEffect, onMount, onCleanup } from 'solid-js';
import { Uri, languages, editor as mEditor } from 'monaco-editor';
import { liftOff } from './setupSolid';
import { AutoTypings, LocalStorageCache } from 'monaco-editor-auto-typings';
import { useZoom } from '../../hooks/useZoom';

const Editor: Component<{
  url: string;
  disabled?: true;
  isDark?: boolean;
  withMinimap?: boolean;
  formatter?: Worker;
  displayErrors?: boolean;
  onDocChange?: (code: string) => unknown;
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
  };
  const autoTyper = async () => {
    const autoTypings = await AutoTypings.create(editor, {
      sourceCache: new LocalStorageCache(),
      fileRootPath: 'file:///',
      monaco: { languages, Uri, editor: mEditor } as any,
    });
    editor.onDidDispose(() => autoTypings.dispose());
  };

  // Initialize Monaco
  onMount(() => setupEditor());
  onCleanup(() => editor?.dispose());
  createEffect(() => {
    editor.setModel(model());
    liftOff();
  });
  onMount(() => autoTyper());
  createEffect(() => {
    mEditor.setTheme(props.isDark ? 'vs-dark-plus' : 'vs-light-plus');
  });
  createEffect(() => {
    editor.updateOptions({ fontSize: zoomState.fontSize });
  });

  createEffect(() => {
    languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: !props.displayErrors,
      noSyntaxValidation: !props.displayErrors,
    });
  });

  return <div class="p-0 h-full min-h-0" ref={parent} />;
};

export default Editor;
