import { render } from "solid-js/dom";
import { Component, createState, Show } from "solid-js";
import { transform } from "@babel/standalone";
import jsxTransform from "babel-plugin-jsx-dom-expressions";
import jsx from "@babel/plugin-syntax-jsx";
import Prism from "prismjs";
import "./tailwind.css";
import "prismjs/themes/prism-twilight.css";

function replaceCaret(el: HTMLElement) {
  // Place the caret at the end of the element
  const target = document.createTextNode("");
  el.appendChild(target);
  // do not move caret if element was not focused
  const isTargetFocused = document.activeElement === el;
  if (target !== null && target.nodeValue !== null && isTargetFocused) {
    var sel = window.getSelection();
    if (sel !== null) {
      var range = document.createRange();
      range.setStart(target, target.nodeValue.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    if (el instanceof HTMLElement) el.focus();
  }
}

const App: Component = () => {
  const [compiled, setCompiled] = createState({
    input: "",
    output: "",
    error: "",
  });

  let code: HTMLDivElement;

  requestAnimationFrame(() => code.focus());

  function compile() {
    try {
      const { code } = transform(compiled.input, {
        code: true,
        plugins: [
          jsx,
          [
            jsxTransform,
            {
              moduleName: "solid-js/dom",
              builtIns: [
                "For",
                "Show",
                "Switch",
                "Match",
                "Suspense",
                "SuspenseList",
                "Portal",
                "Index",
                "Dynamic",
                "ErrorBoundary",
              ],
              delegateEvents: true,
              contextToCustomElements: true,
              wrapConditionals: true,
              generate: "dom",
            },
          ],
        ],
      });

      setCompiled("output", code);
    } catch (e) {
      setCompiled("error", e.message);
    }
  }

  const update: JSX.EventHandlerUnion<HTMLDivElement, InputEvent> = (e) => {
    const value = e.target.textContent;
    setCompiled({ input: value, error: "" });
    code.innerHTML = Prism.highlight(
      compiled.input,
      Prism.languages.tsx,
      "tsx"
    );
    replaceCaret(code);
  };

  return (
    <>
      <Show when={compiled.error}>
        <pre class="fixed bottom-10 right-10 bg-red-200 text-red-800 border border-red-400 rounded shadow px-6 py-4 z-10">
          <code innerText={compiled.error}></code>
        </pre>
      </Show>
      <pre class="h-full max-h-screen flex-1 overflow-auto flex bg-gray-900">
        <code
          ref={code}
          class="flex-1 p-6 whitespace-pre-wrap"
          onInput={update}
          contentEditable
        ></code>
      </pre>
      <pre class="h-full max-h-screen flex-1 overflow-auto flex bg-gray-900">
        <code
          class="p-6 flex-1 whitespace-pre-wrap"
          innerHTML={Prism.highlight(
            compiled.output,
            Prism.languages.javascript,
            "javascript"
          )}
        ></code>
      </pre>
      <button
        onClick={compile}
        class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded shadow py-1 px-2 uppercase text-blue-800 bg-blue-200 border text-sm leading-tight border-blue-400 hover:bg-blue-300"
      >
        Compile!
      </button>
    </>
  );
};

render(() => App, document.getElementById("app"));
