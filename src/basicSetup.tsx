import {
  keymap,
  highlightSpecialChars,
  indentOnInput,
} from "@codemirror/next/view";
import { Extension, EditorState } from "@codemirror/next/state";
import { history } from "@codemirror/next/history";
import { foldGutter } from "@codemirror/next/fold";
import { lineNumbers } from "@codemirror/next/gutter";
import { defaultKeymap } from "@codemirror/next/commands";
import { bracketMatching } from "@codemirror/next/matchbrackets";
import { closeBrackets } from "@codemirror/next/closebrackets";
import { rectangularSelection } from "@codemirror/next/rectangular-selection";
import {
  highlightActiveLine,
  highlightSelectionMatches,
} from "@codemirror/next/highlight-selection";
import { defaultHighlighter } from "@codemirror/next/highlight";

export const basicSetup: Extension = [
  lineNumbers(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  defaultHighlighter,
  bracketMatching(),
  closeBrackets(),
  rectangularSelection(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap(defaultKeymap),
];

export { EditorView } from "@codemirror/next/view";
export { EditorState } from "@codemirror/next/state";
