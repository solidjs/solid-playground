import { EditorView } from './basicSetup';
import { HighlightStyle, tags } from '@codemirror/highlight';

export function getTheme({ styles }) {
  const isDark = false;
  const { backgroundColor = isDark ? '#181a1b' : '#F8FAFC' } = styles;

  return [
    EditorView.theme({
      $: {
        backgroundColor, // bg-blueGray-50
        color: isDark ? '#e8e6e3' : '#0F172A', // bg-blueGray-900
        position: 'relative !important',
        boxSizing: 'border-box',
        '&$focused': {
          // FIXME it would be great if we could directly use the browser's
          // default focus outline, but it appears we can't, so this tries to
          // approximate that
          outline_fallback: isDark ? '1px dotted #DEDEDE' : '1px dotted #212121',
          outline: '5px auto -webkit-focus-ring-color',
        },
        display: 'flex !important',
        flexDirection: 'column',
      },

      '$$light $gutters': {
        backgroundColor: 'transparent',
        borderRightWidth: 0,
      },

      $scroller: {
        display: 'flex !important',
        alignItems: 'flex-start !important',
        lineHeight: 1.4,
        height: '100%',
        overflowX: 'auto',
        position: 'relative',
        zIndex: 0,
        fontFamily: "'Fira Code', monospace",
        fontSize: 'inherit',
      },

      $content: {
        margin: 0,
        flexGrow: 2,
        minHeight: '100%',
        display: 'block',
        whiteSpace: 'pre',
        boxSizing: 'border-box',

        padding: '4px 0',
        outline: 'none',
        caretColor: isDark ? 'white' : 'black',
      },

      $line: {
        display: 'block',
        padding: '0 2px 0 4px',
      },

      $selectionLayer: {
        zIndex: -1,
        contain: 'size style',
      },

      $selectionBackground: {
        position: 'absolute',
        background: isDark ? '#222' : '#d9d9d9',
      },
      '$$focused $selectionBackground': {
        background: isDark ? '#233' : '#d7d4f0',
      },

      $cursorLayer: {
        zIndex: 100,
        contain: 'size style',
        pointerEvents: 'none',
      },
      '$$focused $cursorLayer': {
        animation: 'steps(1) cm-blink 1.2s infinite',
      },

      // Two animations defined so that we can switch between them to
      // restart the animation without forcing another style
      // recomputation.
      '@keyframes cm-blink': {
        '0%': {},
        '50%': { visibility: 'hidden' },
        '100%': {},
      },
      '@keyframes cm-blink2': {
        '0%': {},
        '50%': { visibility: 'hidden' },
        '100%': {},
      },

      $cursor: {
        position: 'absolute',
        borderLeft: '1.2px solid black',
        marginLeft: '-0.6px',
        pointerEvents: 'none',
        display: 'none',
        borderLeftColor: isDark ? '#444' : 'currentColor',
      },

      '$$focused $cursor': {
        display: 'block',
      },

      $placeholder: {
        color: '#888',
        display: 'inline-block',
      },

      $button: {
        verticalAlign: 'middle',
        color: 'inherit',
        fontSize: '70%',
        padding: '.2em 1em',
        borderRadius: '3px',
        backgroundImage: isDark
          ? 'linear-gradient(#555, #111)'
          : 'linear-gradient(#eff1f5, #d9d9df)',
        border: '1px solid #888',
        '&:active': {
          backgroundImage: isDark
            ? 'linear-gradient(#111, #333)'
            : 'linear-gradient(#b4b4b4, #d0d3d6)',
        },
      },

      $textfield: {
        verticalAlign: 'middle',
        color: 'inherit',
        fontSize: '70%',
        padding: '.2em .5em',

        border: isDark ? '1px solid #555' : '1px solid silver',
        backgroundColor: isDark ? 'inherit' : 'white',
      },
    }),

    HighlightStyle.define(
      { tag: tags.link, textDecoration: 'underline' },
      { tag: tags.heading, textDecoration: 'underline', fontWeight: 'bold' },
      { tag: tags.emphasis, fontStyle: 'italic' },
      { tag: tags.strong, fontWeight: 'bold' },
      { tag: tags.keyword, color: isDark ? '#f97583' : '#d73a49' },
      {
        tag: [tags.atom, tags.bool, tags.url, tags.labelName],
        color: '#219',
      },
      { tag: [tags.literal, tags.inserted], color: '#164' },
      { tag: [tags.string, tags.deleted], color: '#032f62' },
      {
        tag: [tags.regexp, tags.escape, tags.special(tags.string)],
        color: '#e40',
      },
      { tag: tags.variableName, color: '#24292e' },
      {
        tag: [tags.definition(tags.variableName), tags.function(tags.variableName)],
        color: isDark ? 'rgb(237, 109, 255)' : '#6f42c1',
      },
      // { tag: tags.local(tags.variableName), color: "#30a" },
      { tag: [tags.typeName, tags.namespace], color: '#085' },
      { tag: tags.className, color: isDark ? 'rgb(237, 109, 255)' : '#167' },
      {
        tag: [tags.special(tags.variableName), tags.macroName, tags.local(tags.variableName)],
        color: '#256',
      },
      { tag: tags.definition(tags.propertyName), color: isDark ? '#79b8ff' : '#00c' },
      { tag: tags.comment, color: isDark ? '#6a737d' : '#6a737d', fontStyle: 'italic' },
      { tag: tags.meta, color: '#7a757a' },
      { tag: tags.invalid, color: '#f00' },
    ),
  ];
}
