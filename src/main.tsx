import "./tailwind.css";

import { render } from "solid-js/web";
import { register } from "register-service-worker";
import {
  Component,
  createState,
  Show,
  createEffect,
  Suspense,
  lazy,
  createSignal,
  onCleanup,
} from "solid-js";
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import mitt from "mitt";

import debounce from "lodash/debounce";
import { Icon } from "@amoutonbrady/solid-heroicons";
import { x } from "@amoutonbrady/solid-heroicons/outline";
// @ts-ignore
import logo from "url:./logo.svg";
import pkg from "../package.json";
import { Preview } from "./preview";

const Editor = lazy(() => import("./editor"));

const emitter = mitt();
let swUpdatedBeforeRender = false;
emitter.on("sw-update", () => (swUpdatedBeforeRender = true));

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
  const [newUpdate, setNewUpdate] = createSignal(swUpdatedBeforeRender);
  emitter.on("sw-update", () => setNewUpdate(true));
  onCleanup(() => emitter.all.clear());

  const [compiled, setCompiled] = createState({
    input: location.hash
      ? decompressFromEncodedURIComponent(location.hash.slice(1))!
      : "const h1 = <h1>Hello world</h1>",
    output: "",
    error: "",
    mode: "DOM",
    preview: false,
  });

  createEffect(async () => {
    const [error, output] = await compile(compiled.input, compiled.mode);
    if (error) setCompiled({ error });
    else setCompiled({ output });
  });
  createEffect(() => {
    const compressed = compressToEncodedURIComponent(compiled.input);
    history.pushState(null, "", `#${compressed}`);
  });

  const handleDocChange = debounce((input: string) => {
    setCompiled({ input, error: "" });
  }, 1000);

  return (
    <div class="relative grid md:grid-cols-2 h-screen gap-y-1 md:gap-y-0 gap-x-1 overflow-hidden bg-gray-700 text-gray-50 wrapper">
      <header class="md:col-span-2 p-2 flex justify-between items-center text-sm">
        <h1 class="flex items-center space-x-4 uppercase font-semibold">
          <a href="https://github.com/ryansolid/solid">
            <img src={logo} alt="solid-js logo" class="h-8" />
          </a>{" "}
          <span>Template Explorer</span>
        </h1>

        <div class="flex items-center space-x-2">
          <div class="flex items-center space-x-2">
            <input
              id="preview"
              type="checkbox"
              checked={compiled.preview}
              onChange={(e) => setCompiled("preview", e.target.checked)}
            />
            <label for="preview" class="cursor-pointer leading-none">
              Experimental preview
            </label>
          </div>
          <select
            value={compiled.mode}
            onChange={(e) => setCompiled("mode", e.target.value)}
            class="bg-transparent border rounded border-gray-400 px-2 py-1 text-sm"
          >
            <option class="bg-gray-700">DOM</option>
            <option class="bg-gray-700">HYDRATION</option>
            <option class="bg-gray-700">SSR</option>
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
        <Preview
          code={compiled.preview ? compiled.output : ""}
          class="h-full max-h-screen overflow-auto flex-1 pr-4 pt-2 w-full bg-gray-100"
          classList={{ hidden: !compiled.preview }}
        />
        <Editor
          value={compiled.output}
          class="h-full max-h-screen overflow-auto flex-1 bg-twilight focus:outline-none pr-4 pt-2 whitespace-normal"
          classList={{ hidden: compiled.preview }}
          disabled
        />
      </Suspense>

      {/* TODO: Use portal */}
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

      {/* TODO: Use portal */}
      <Show when={newUpdate()}>
        <div class="fixed bottom-10 left-10 bg-blue-200 text-blue-800 border border-blue-400 rounded shadow px-6 py-4 z-10 max-w-sm">
          <button
            title="close"
            onClick={() => setNewUpdate(false)}
            class="absolute top-1 right-1 hover:text-blue-900"
          >
            <Icon path={x} class="h-6 " />
          </button>
          <p class="font-semibold">There's a new update available.</p>
          <p class="mt-2">
            Refresh your browser or click the button below to get the latest
            update of the REPL.
          </p>
          <button
            onClick={() => location.reload()}
            class="bg-blue-800 text-blue-200 px-3 py-1 rounded mt-4 text-sm uppercase tracking-wide hover:bg-blue-900"
          >
            Refresh
          </button>
        </div>
      </Show>
    </div>
  );
};

render(() => <App />, document.getElementById("app")!);

if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    register("/sw.js", {
      ready(registration) {
        console.log("Service worker is active.", { registration });
      },
      registered(registration) {
        console.log("✔ Application is now available offline", { registration });
      },
      cached(registration) {
        console.log("Content has been cached for offline use.", {
          registration,
        });
      },
      updatefound(registration) {
        console.log("New content is downloading.", { registration });
      },
      updated(registration) {
        emitter.emit("sw-update", registration);
        console.log("New content is available; please refresh.", {
          registration,
        });
      },
      offline() {
        console.log(
          "No internet connection found. App is running in offline mode."
        );
      },
      error(error) {
        console.error("❌ Application couldn't be registered offline:", error);
      },
    });
  });
}
