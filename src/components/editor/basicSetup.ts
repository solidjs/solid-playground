import {
  keymap,
  highlightSpecialChars,
  drawSelection,
  EditorView,
} from "@codemirror/next/view";
import { Extension, EditorState } from "@codemirror/next/state";
import { history, historyKeymap } from "@codemirror/next/history";
import { foldGutter } from "@codemirror/next/fold";
import { indentOnInput } from "@codemirror/next/language";
import { lineNumbers } from "@codemirror/next/gutter";
import {
  defaultKeymap,
  indentLess,
  indentMore,
} from "@codemirror/next/commands";
import { bracketMatching } from "@codemirror/next/matchbrackets";
import { closeBrackets } from "@codemirror/next/closebrackets";
import { autocompletion } from "@codemirror/next/autocomplete";
import { rectangularSelection } from "@codemirror/next/rectangular-selection";
import { highlightSelectionMatches } from "@codemirror/next/highlight-selection";
import { defaultHighlightStyle } from "@codemirror/next/highlight";
import { javascript } from "@codemirror/next/lang-javascript";
import { getTheme } from "./theme";

export const basicSetup: Extension = [
  lineNumbers(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  defaultHighlightStyle,
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  highlightSelectionMatches(),
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
  javascript({ jsx: true, typescript: true }),
  getTheme(),
];

export { EditorView };
export { EditorState };
