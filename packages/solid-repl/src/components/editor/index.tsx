import { Component, createEffect, onMount, onCleanup, Show } from 'solid-js';
import { Uri, languages, editor as mEditor, KeyMod, KeyCode, typescript } from 'monaco-editor';
import { useZoom } from '../../hooks/useZoom';
import { throttle } from '@solid-primitives/scheduled';
import { bell, bellSlash, codeBracket } from 'solid-heroicons/outline';
import { register } from './setupSolid';
import { IconButton } from '../ui/IconButton';
import { css } from 'styled-system/css';

const editorContainer = css({ flex: 1, p: 0, minH: 0, minW: 0 });

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

const Editor: Component<{
  model: mEditor.ITextModel;
  disabled?: true;
  isDark?: boolean;
  withMinimap?: boolean;
  formatter?: Worker;
  linter?: Worker;
  displayErrors?: boolean;
  setDisplayErrors?: (value: boolean) => void;
  onDocChange?: (code: string) => void;
  onUserEdit?: () => void;
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
          mEditor.setModelMarkers(props.model, 'eslint', data.markers);
        } else if (event === 'FIX') {
          mEditor.setModelMarkers(props.model, 'eslint', data.markers);
          data.fixed && props.model.setValue(data.output);
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

  onMount(() => {
    editor = mEditor.create(parent, {
      model: null,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      automaticLayout: true,
      readOnly: props.disabled,
      fontSize: zoomState.fontSize,
      lineDecorationsWidth: 5,
      lineNumbersMinChars: 3,
      padding: { top: 15 },
      minimap: { enabled: props.withMinimap },
      dropIntoEditor: { enabled: false },
    });

    createEffect(() => {
      editor.updateOptions({ readOnly: !!props.disabled });
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
      editor.getAction('editor.action.formatDocument')?.run();
      props.displayErrors && editor.getAction('eslint.executeAutofix')?.run();
      editor.focus();
    });

    editor.onDidChangeModelContent((e) => {
      const code = editor.getValue();
      props.onDocChange?.(code);
      runLinter(code);
      if (!e.isFlush) props.onUserEdit?.();
    });
  });
  onCleanup(() => editor.dispose());

  createEffect(() => {
    editor.setModel(props.model);
    register();
  });

  createEffect(() => {
    mEditor.setTheme(props.isDark ? 'dark-plus' : 'light-plus');
  });

  createEffect(() => {
    editor.updateOptions({ fontSize: zoomState.fontSize });
  });

  createEffect(() => {
    if (props.disabled) return;
    typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: !props.displayErrors,
      noSyntaxValidation: !props.displayErrors,
    });
  });

  createEffect(() => {
    if (props.displayErrors) {
      runLinter(editor.getValue());
    } else {
      mEditor.setModelMarkers(props.model, 'eslint', []);
    }
  });

  onMount(() => {
    props.onEditorReady?.(editor, { Uri, editor: mEditor });
  });

  return (
    <>
      <div class={editorContainer} ref={parent} />
      <Show when={!props.disabled}>
        <div class={footer}>
          <div />
          <div class={css({ display: 'flex', alignItems: 'center', gap: 1 })}>
            <IconButton
              icon={props.displayErrors ? bell : bellSlash}
              size="sm"
              title={props.displayErrors ? 'Disable error reporting' : 'Enable error reporting'}
              onClick={() => props.setDisplayErrors?.(!props.displayErrors)}
            />
            <IconButton
              icon={codeBracket}
              size="sm"
              title="Format Document"
              onClick={() => editor.getAction('editor.action.formatDocument')?.run()}
            />
            <span class={css({ px: 2, fontSize: 'sm', color: 'neutral.500', _dark: { color: 'neutral.400' } })}>
              TypeScript
            </span>
          </div>
        </div>
      </Show>
    </>
  );
};

export default Editor;
