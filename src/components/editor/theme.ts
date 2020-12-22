import { EditorView } from "./basicSetup";
import { highlightStyle, tags } from "@codemirror/next/highlight";

export function getTheme({ backgroundColor = "#F8FAFC" }) {
  return [
    EditorView.theme({
      $: {
        backgroundColor, // bg-blueGray-50
        color: "#0F172A", // bg-blueGray-900
        position: "relative !important",
        boxSizing: "border-box",
        "&$focused": {
          // FIXME it would be great if we could directly use the browser's
          // default focus outline, but it appears we can't, so this tries to
          // approximate that
          outline_fallback: "1px dotted #212121",
          outline: "5px auto -webkit-focus-ring-color",
        },
        display: "flex !important",
        flexDirection: "column",
      },

      "$$light $gutters": {
        backgroundColor: "transparent",
        borderRightWidth: 0,
      },

      $scroller: {
        display: "flex !important",
        alignItems: "flex-start !important",
        lineHeight: 1.4,
        height: "100%",
        overflowX: "auto",
        position: "relative",
        zIndex: 0,
        fontFamily: "'Fira Code', monospace",
        fontSize: "14px",
      },

      $content: {
        margin: 0,
        flexGrow: 2,
        minHeight: "100%",
        display: "block",
        whiteSpace: "pre",
        boxSizing: "border-box",

        padding: "4px 0",
        outline: "none",
      },

      "$$light $content": { caretColor: "black" },
      "$$dark $content": { caretColor: "white" },

      $line: {
        display: "block",
        padding: "0 2px 0 4px",
      },

      $selectionLayer: {
        zIndex: -1,
        contain: "size style",
      },

      $selectionBackground: {
        position: "absolute",
      },
      "$$light $selectionBackground": {
        background: "#d9d9d9",
      },
      "$$dark $selectionBackground": {
        background: "#222",
      },
      "$$focused$light $selectionBackground": {
        background: "#d7d4f0",
      },
      "$$focused$dark $selectionBackground": {
        background: "#233",
      },

      $cursorLayer: {
        zIndex: 100,
        contain: "size style",
        pointerEvents: "none",
      },
      "$$focused $cursorLayer": {
        animation: "steps(1) cm-blink 1.2s infinite",
      },

      // Two animations defined so that we can switch between them to
      // restart the animation without forcing another style
      // recomputation.
      "@keyframes cm-blink": {
        "0%": {},
        "50%": { visibility: "hidden" },
        "100%": {},
      },
      "@keyframes cm-blink2": {
        "0%": {},
        "50%": { visibility: "hidden" },
        "100%": {},
      },

      $cursor: {
        position: "absolute",
        borderLeft: "1.2px solid black",
        marginLeft: "-0.6px",
        pointerEvents: "none",
        display: "none",
      },
      "$$dark $cursor": {
        borderLeftColor: "#444",
      },

      "$$focused $cursor": {
        display: "block",
      },

      $placeholder: {
        color: "#888",
        display: "inline-block",
      },

      $button: {
        verticalAlign: "middle",
        color: "inherit",
        fontSize: "70%",
        padding: ".2em 1em",
        borderRadius: "3px",
      },

      "$$light $button": {
        backgroundImage: "linear-gradient(#eff1f5, #d9d9df)",
        border: "1px solid #888",
        "&:active": {
          backgroundImage: "linear-gradient(#b4b4b4, #d0d3d6)",
        },
      },

      "$$dark $button": {
        backgroundImage: "linear-gradient(#555, #111)",
        border: "1px solid #888",
        "&:active": {
          backgroundImage: "linear-gradient(#111, #333)",
        },
      },

      $textfield: {
        verticalAlign: "middle",
        color: "inherit",
        fontSize: "70%",
        border: "1px solid silver",
        padding: ".2em .5em",
      },

      "$$light $textfield": {
        backgroundColor: "white",
      },

      "$$dark $textfield": {
        border: "1px solid #555",
        backgroundColor: "inherit",
      },
    }),

    highlightStyle(
      { tag: tags.link, textDecoration: "underline" },
      { tag: tags.heading, textDecoration: "underline", fontWeight: "bold" },
      { tag: tags.emphasis, fontStyle: "italic" },
      { tag: tags.strong, fontWeight: "bold" },
      { tag: tags.keyword, color: "#d73a49" },
      {
        tag: [tags.atom, tags.bool, tags.url, tags.labelName],
        color: "#219",
      },
      { tag: [tags.literal, tags.inserted], color: "#164" },
      { tag: [tags.string, tags.deleted], color: "#032f62" },
      {
        tag: [tags.regexp, tags.escape, tags.special(tags.string)],
        color: "#e40",
      },
      { tag: tags.variableName, color: "#24292e" },
      {
        tag: [
          tags.definition(tags.variableName),
          tags.function(tags.variableName),
        ],
        color: "#6f42c1",
      },
      // { tag: tags.local(tags.variableName), color: "#30a" },
      { tag: [tags.typeName, tags.namespace], color: "#085" },
      { tag: tags.className, color: "#167" },
      {
        tag: [
          tags.special(tags.variableName),
          tags.macroName,
          tags.local(tags.variableName),
        ],
        color: "#256",
      },
      { tag: tags.definition(tags.propertyName), color: "#00c" },
      { tag: tags.comment, color: "#6a737d", fontStyle: "italic" },
      { tag: tags.meta, color: "#7a757a" },
      { tag: tags.invalid, color: "#f00" }
    ),
  ];
}
