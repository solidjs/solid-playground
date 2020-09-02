import { Component, createEffect, splitProps } from "solid-js";
import { oneDark } from "@codemirror/next/theme-one-dark";
import { javascript } from "@codemirror/next/lang-javascript";
import {
  basicSetup,
  EditorState,
  EditorView,
} from "@codemirror/next/basic-setup";
import { Extension } from "@codemirror/next/state";

export const Editor: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, [
    "onDocChange",
    "value",
    "disabled",
  ]);
  let parent: HTMLDivElement;
  let state: EditorState;
  let view: EditorView;

  const extensions: Extension = [
    oneDark,
    javascript({ jsx: true, typescript: true }),
    basicSetup,
  ];

  requestAnimationFrame(() => {
    state = EditorState.create({
      doc: "",
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
    view = new EditorView({ state, parent });
  });

  createEffect(() => {
    if (!internal.value) return;
    view.setState(
      EditorState.create({
        doc: internal.value,
        extensions: [
          ...extensions,
          ...(internal.disabled ? [EditorView.editable.of(false)] : []),
        ],
      })
    );
  });

  return <div ref={parent} {...external}></div>;
};

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  onDocChange?: (code: string) => unknown;
  value?: string;
  disabled?: boolean;
}
