import { Component, createEffect, onMount, onCleanup } from 'solid-js';
import { Uri, languages, editor as mEditor, KeyMod, KeyCode } from 'monaco-editor';
import { liftOff } from './setupSolid';
import { useZoom } from '../../hooks/useZoom';
import { throttle } from '@solid-primitives/scheduled';

const Editor: Component<{
  url: string;
  disabled?: true;
  isDark?: boolean;
  withMinimap?: boolean;
  formatter?: Worker;
  linter?: Worker;
  displayErrors?: boolean;
  onDocChange?: (code: string) => void;
  onEditorReady?: (
    editor: mEditor.IStandaloneCodeEditor,
    monaco: {
      Uri: typeof Uri;
      editor: typeof mEditor;
    },
  ) => void;
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
  if (props.linter) {
    const listener = ({ data }: any) => {
      if (props.displayErrors) {
        const { event } = data;
        if (event === 'LINT') {
          const m = model();
          m && mEditor.setModelMarkers(m, 'eslint', data.markers);
        } else if (event === 'FIX') {
          const m = model();
          m && mEditor.setModelMarkers(m, 'eslint', data.markers);
          data.fixed && model()?.setValue(data.output);
        }
      }
    };
    props.linter.addEventListener('message', listener);
    onCleanup(() => props.linter?.removeEventListener('message', listener));
  }

  const runLinter = throttle((code: string) => {
    if (props.linter && props.displayErrors) {
      props.linter.postMessage({
        event: 'LINT',
        code,
      });
    }
  }, 250);

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

    createEffect(() => {
      const disabled = props.disabled == true ? true : false;
      editor.updateOptions({ readOnly: disabled });
    });
    if (props.linter) {
      editor.addAction({
        id: 'eslint.executeAutofix',
        label: 'Fix all auto-fixable problems',
        contextMenuGroupId: '1_modification',
        contextMenuOrder: 3.5,
        run: (ed) => {
          const code = ed.getValue();
          if (code) {
            props.linter?.postMessage({
              event: 'FIX',
              code,
            });
          }
        },
      });
    }

    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => {
      if (editor) {
        // auto-format
        editor.getAction('editor.action.formatDocument')?.run();
        // auto-fix problems
        props.displayErrors && editor.getAction('eslint.executeAutofix')?.run();
        editor.focus();
      }
    });

    editor.onDidChangeModelContent(() => {
      const code = editor.getValue();
      props.onDocChange?.(code);
      runLinter(code);
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

  createEffect(() => {
    if (props.displayErrors) {
      // run on mount and when displayLintMessages is turned on
      runLinter(editor.getValue());
    } else {
      // reset eslint markers when displayLintMessages is turned off
      const m = model();
      m && mEditor.setModelMarkers(m, 'eslint', []);
    }
  });

  onMount(() => {
    props.onEditorReady?.(editor, { Uri, editor: mEditor });
  });

  return <div class="min-h-0 min-w-0 flex-1 p-0" ref={parent} />;
};

export default Editor;
