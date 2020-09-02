import { Component, createEffect, splitProps } from "solid-js";
import {
  keymap,
  highlightSpecialChars,
  multipleSelections,
  indentOnInput,
} from "@codemirror/next/view";
import { Extension, Text } from "@codemirror/next/state";
import { history, historyKeymap } from "@codemirror/next/history";
import { foldGutter, foldKeymap } from "@codemirror/next/fold";
import { lineNumbers } from "@codemirror/next/gutter";
import { defaultKeymap } from "@codemirror/next/commands";
import { bracketMatching } from "@codemirror/next/matchbrackets";
import {
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/next/closebrackets";
import { searchKeymap } from "@codemirror/next/search";
import { commentKeymap } from "@codemirror/next/comment";
import { rectangularSelection } from "@codemirror/next/rectangular-selection";
import { gotoLineKeymap } from "@codemirror/next/goto-line";
import {
  highlightActiveLine,
  highlightSelectionMatches,
} from "@codemirror/next/highlight-selection";
import { defaultHighlighter } from "@codemirror/next/highlight";
import { lintKeymap } from "@codemirror/next/lint";
import { EditorView } from "@codemirror/next/view";
import { EditorState } from "@codemirror/next/state";
import { oneDark } from "@codemirror/next/theme-one-dark";
import { javascript } from "@codemirror/next/lang-javascript";

export const extensions: Extension = [
  oneDark,
  javascript({ jsx: true }),
  lineNumbers(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  multipleSelections(),
  indentOnInput(),
  defaultHighlighter,
  bracketMatching(),
  closeBrackets(),
  rectangularSelection(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...commentKeymap,
    ...gotoLineKeymap,
    ...lintKeymap,
  ]),
];

export const Editor: Component<Props> = (props) => {
  const [internal, external] = splitProps(props, ["onDocChange", "value"]);
  let parent: HTMLDivElement;
  let state: EditorState;
  let view: EditorView;

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
      ],
    });
    view = new EditorView({ state, parent });
  });

  createEffect(() => {
    if (!internal.value) return;
    view.dispatch({ changes: { from: 0, insert: internal.value } });
  });

  return <div ref={parent} {...external}></div>;
};

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  onDocChange?: (code: string) => unknown;
  value?: string;
}
