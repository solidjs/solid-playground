import { keymap, highlightSpecialChars, drawSelection, EditorView } from '@codemirror/view';
import { Extension, EditorState } from '@codemirror/state';
import { history, historyKeymap } from '@codemirror/history';
import { foldGutter } from '@codemirror/fold';
import { indentOnInput } from '@codemirror/language';
import { lineNumbers } from '@codemirror/gutter';
import { defaultKeymap, indentLess, indentMore } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/matchbrackets';
import { closeBrackets } from '@codemirror/closebrackets';
import { autocompletion } from '@codemirror/autocomplete';
import { rectangularSelection } from '@codemirror/rectangular-selection';
import { highlightSelectionMatches } from '@codemirror/search';
import { defaultHighlightStyle } from '@codemirror/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { getTheme } from './theme';

export const basicSetup: (opts: Record<string, any>) => Extension = (opts) => [
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
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    {
      key: 'Tab',
      preventDefault: true,
      run: indentMore,
    },
    {
      key: 'Shift-Tab',
      preventDefault: true,
      run: indentLess,
    },
  ]),
  javascript({ jsx: true, typescript: true }),
  getTheme(opts as any),
];

export { EditorView };
export { EditorState };
