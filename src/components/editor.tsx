import { EditorSelection } from "@codemirror/next/state";
import { javascript } from "@codemirror/next/lang-javascript";
import {
  Component,
  createEffect,
  createSignal,
  onMount,
  splitProps,
  JSX,
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
import { historyKeymap } from "@codemirror/next/history";

/**
 * This function creates a new EditorSelection that's used to
 * reset the cursor on every new input changes. This is needed
 * because we made the CodeMirror editor "controlled".
 *
 * If we don't do that the cursor will reset to the begining
 * of the editor everytime the input changes.
 *
 * @param pos {number} The start position to reset to
 * @param pos {number} The end position to reset to
 */
function placeCursor(startPos: number, envPos = startPos) {
  return EditorSelection.create([EditorSelection.range(startPos, envPos)]);
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
    return EditorState.create({
      doc,
      extensions: [
        basicSetup,
        javascript({ jsx: true, typescript: true }),
        EditorView.updateListener.of((update) => {
          // This trigger the onDocChange event and save the cursor
          // for the next state.
          if (update.docChanged && internal.onDocChange) {
            if (internal.value === update.state.doc.toString()) return;

            internal.onDocChange(update.state.doc.toString());
            setCursor(update.state.selection);
          }
        }),
        EditorView.lineWrapping,
        keymap([
          ...defaultKeymap,
          ...historyKeymap,
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

    const docLength = view.state.doc.length;
    const selectionTarget = cursor().ranges[0].to;

    // FIXME: Handle this in a better way perhaps with the eventBus?
    try {
      const updateDocTransation = view.state.update({
        changes: { from: 0, to: docLength, insert: internal.value },
        scrollIntoView: false,
        selection:
          selectionTarget <= docLength ? cursor() : placeCursor(docLength),
      });

      view.dispatch(updateDocTransation);
    } catch {
      const updateDocTransation = view.state.update({
        changes: { from: 0, to: docLength, insert: internal.value },
        scrollIntoView: false,
        selection: placeCursor(0),
      });

      view.dispatch(updateDocTransation);
    }
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
