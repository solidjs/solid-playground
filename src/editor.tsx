import { Extension } from "@codemirror/next/state";
import { oneDark } from "@codemirror/next/theme-one-dark";
import { javascript } from "@codemirror/next/lang-javascript";
import { Component, createEffect, splitProps } from "solid-js";

import { basicSetup, EditorState, EditorView } from "./basicSetup";

const Editor: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, [
    "onDocChange",
    "value",
    "disabled",
    "defaultValue",
  ]);
  let parent: HTMLDivElement;
  let state: EditorState;
  let view: EditorView;

  const extensions: Extension[] = [
    basicSetup,
    javascript({ jsx: true, typescript: true }),
    oneDark,
  ];

  function createState(doc: string) {
    return EditorState.create({
      doc,
      extensions: [
        ...extensions,
        EditorView.updateListener.of(
          (update) =>
            update.docChanged &&
            internal.onDocChange &&
            internal.onDocChange(update.state.doc.toString())
        ),
        ...(internal.disabled ? [EditorView.editable.of(false)] : []),
      ],
    });
  }

  requestAnimationFrame(() => {
    state = createState(internal.defaultValue || "");
    view = new EditorView({ state, parent });
  });

  createEffect(() => {
    if (!internal.value || !view) return;
    view.setState(createState(internal.value));
  });

  return <div ref={parent!} {...external}></div>;
};

export default Editor;

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  onDocChange?: (code: string) => unknown;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
}
