import { Component, createEffect, onMount, splitProps, JSX } from "solid-js";
import { basicSetup, EditorState, EditorView } from "./basicSetup";

const Editor: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, [
    "onDocChange",
    "value",
    "disabled",
    "defaultValue",
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
  function createEditorState(
    doc: string,
    disabled: boolean = false
  ): EditorState {
    return EditorState.create({
      doc,
      extensions: [
        basicSetup,
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

  // Initialize CodeMirror
  onMount(() => {
    state = createEditorState(
      internal.defaultValue || internal.value || "",
      internal.disabled
    );
    view = new EditorView({ state, parent });
  });

  createEffect(() => {
    if (!view) return;
    view.setState(createEditorState(internal.value, internal.disabled));
  });

  return <div ref={parent} {...external}></div>;
};

export default Editor;

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  onDocChange?: (code: string) => unknown;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
}
