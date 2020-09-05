import "./tailwind.css";
import { render } from "solid-js/dom";
import { register } from "register-service-worker";
import {
  Component,
  createState,
  Show,
  createEffect,
  Suspense,
  lazy,
} from "solid-js";
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

import debounce from "lodash/debounce";
import { Icon } from "@amoutonbrady/solid-heroicons";
import { x } from "@amoutonbrady/solid-heroicons/outline";
// @ts-ignore
import logo from "url:./logo.svg";
import pkg from "../package.json";

const Editor = lazy(() => import("./editor"));

async function compile(input: string, mode: string) {
  try {
    const { transform } = await import("@babel/standalone");
    const solid = await import("babel-preset-solid");

    const options =
      mode === "SSR"
        ? { generate: "ssr", hydratable: true }
        : mode === "HYDRATION"
        ? { generate: "dom", hydratable: true }
        : { generate: "dom", hydratable: false };

    const { code } = transform(input, { presets: [[solid, options]] });

    return [null, code] as const;
  } catch (e) {
    console.error(e);
    return [e.message, null] as const;
  }
}

const App: Component = () => {
  const [compiled, setCompiled] = createState({
    input: location.hash
      ? decompressFromEncodedURIComponent(location.hash.slice(1))
      : "",
    output: "",
    error: "",
    mode: "DOM",
  });

  createEffect(async () => {
    const [error, output] = await compile(compiled.input, compiled.mode);
    if (error) setCompiled({ error });
    else setCompiled({ output });
  });
  createEffect(() => {
    const compressed = compressToEncodedURIComponent(compiled.input);
    history.pushState(null, null, `#${compressed}`);
  });

  const handleDocChange = debounce((input: string) => {
    setCompiled({ input, error: "" });
  }, 1000);

  return (
    <div class="relative grid md:grid-cols-2 h-screen gap-y-1 md:gap-y-0 gap-x-1 overflow-hidden bg-gray-700 text-gray-50 wrapper">
      <header class="md:col-span-2 p-2 flex justify-between items-center text-sm">
        <h1 class="flex items-center space-x-4 uppercase font-semibold">
          <a href="https://https://github.com/ryansolid/solid">
            <img src={logo} alt="solid-js logo" class="h-8" />
          </a>{" "}
          <span>Template Explorer</span>
        </h1>

        <div class="flex items-center space-x-2">
          <select
            value={compiled.mode}
            onChange={(e) => setCompiled("mode", e.target.value)}
            class="bg-transparent border rounded border-gray-400 px-2 py-1 text-sm"
          >
            <option class="bg-gray-700" value="DOM">
              DOM
            </option>
            <option class="bg-gray-700" value="HYDRATION">
              Hydration
            </option>
            <option class="bg-gray-700" value="SSR">
              SSR Server
            </option>
          </select>
          <span>v{pkg.dependencies["solid-js"].slice(1)}</span>
        </div>
      </header>

      <Suspense fallback={<p>Loading the REPL</p>}>
        <Editor
          defaultValue={compiled.input}
          onDocChange={(input) => handleDocChange(input)}
          class="h-full max-h-screen overflow-auto flex-1 bg-twilight focus:outline-none pr-4 pt-2 whitespace-normal"
        />
        <Editor
          value={compiled.output}
          class="h-full max-h-screen overflow-auto flex-1 bg-twilight focus:outline-none pr-4 pt-2 whitespace-normal"
          disabled
        />
      </Suspense>

      <Show when={compiled.error}>
        <pre class="fixed bottom-10 right-10 bg-red-200 text-red-800 border border-red-400 rounded shadow px-6 py-4 z-10">
          <button
            title="close"
            onClick={() => setCompiled("error", "")}
            class="absolute top-1 right-1 hover:text-red-900"
          >
            <Icon path={x} class="h-6 " />
          </button>
          <code innerText={compiled.error}></code>
        </pre>
      </Show>
    </div>
  );
};

render(() => App, document.getElementById("app"));

if (process.env.NODE_ENV === "production") {
  register("/sw.js", {
    registered(registration) {
      console.log(`Service Worker registered!`);
    },
    error(err) {
      console.log(`Service Worker registration failed: ${err}`);
    },
  });
}
