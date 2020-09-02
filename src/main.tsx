import { render } from "solid-js/dom";
import { Component, createState, Show } from "solid-js";
import { transform } from "@babel/standalone";
import jsxTransform from "babel-plugin-jsx-dom-expressions";
import jsx from "@babel/plugin-syntax-jsx";
import "./tailwind.css";
import { Editor } from "./editor";

const App: Component = () => {
  const [compiled, setCompiled] = createState({
    input: "",
    output: "",
    error: "",
  });

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

  return (
    <>
      <Show when={compiled.error}>
        <pre class="fixed bottom-10 right-10 bg-red-200 text-red-800 border border-red-400 rounded shadow px-6 py-4 z-10">
          <code innerText={compiled.error}></code>
        </pre>
      </Show>
      <Editor
        onDocChange={(input) => setCompiled("input", input)}
        class="h-full max-h-screen overflow-auto flex-1"
      />
      <Editor
        value={compiled.output}
        class="h-full max-h-screen overflow-auto flex-1"
      />
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
