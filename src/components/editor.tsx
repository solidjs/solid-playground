import { EditorSelection } from "@codemirror/next/state";
import { oneDark } from "@codemirror/next/theme-one-dark";
import { javascript } from "@codemirror/next/lang-javascript";
import {
  Component,
  createEffect,
  createSignal,
  onMount,
  splitProps,
} from "solid-js";
import {
  basicSetup,
  EditorState,
  EditorView,
} from "@codemirror/next/basic-setup";
import { keymap } from "@codemirror/next/view";
import {
  defaultKeymap,
  indentMore,
  indentLess,
} from "@codemirror/next/commands";

/**
 * This function creates a new EditorSelection that's used to
 * reset the cursor on every new input changes. This is needed
 * because we made the CodeMirror editor "controlled".
 *
 * If we don't do that the cursor will reset to the begining
 * of the editor everytime the input changes.
 *
 * @param pos {number} The position to reset to
 */
function placeCursor(pos: number) {
  return EditorSelection.create([EditorSelection.range(pos, pos)]);
}

const Editor: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, [
    "onDocChange",
    "value",
    "disabled",
    "defaultValue",
  ]);

  const [cursor, setCursor] = createSignal<EditorSelection>(placeCursor(0));

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
    // There are some cases (like deletion) where the cusor isn't at the right
    // place. We need to make sure the range we are about to use from
    // cursor() is now bigger than the document length.
    const selection =
      cursor().ranges[0].to <= doc.length ? cursor() : placeCursor(doc.length);

    return EditorState.create({
      doc,
      selection,
      extensions: [
        basicSetup,
        javascript({ jsx: true, typescript: true }),
        EditorView.updateListener.of((update) => {
          // This trigger the onDocChange event and save the cursor
          // for the next state.
          if (update.docChanged && internal.onDocChange) {
            internal.onDocChange(update.state.doc.toString());
            setCursor(update.state.selection);
          }
        }),
        EditorView.lineWrapping,
        keymap([
          ...defaultKeymap,
          {
            key: "Tab",
            preventDefault: true,
            run: indentMore,
          },
          {
            key: "Shift-Tab",
            preventDefault: true,
            run: indentLess,
          },
        ]),
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
    view.setState(createEditorState(internal.value || "", internal.disabled));
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
