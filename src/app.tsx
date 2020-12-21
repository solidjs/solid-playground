import { Icon } from "@amoutonbrady/solid-heroicons";
import { x } from "@amoutonbrady/solid-heroicons/outline";
import { compressToEncodedURIComponent as encode } from "lz-string";

import {
  For,
  lazy,
  Show,
  Suspense,
  onCleanup,
  Component,
  createEffect,
  createSignal,
  onMount,
  unwrap,
} from "solid-js";

import { eventBus, formatMs } from "./utils";
import { compileMode, Tab, useStore } from "./store";
import { TabItem, TabList, Preview } from "./components";

import logo from "url:./assets/images/logo.svg";
import pkg from "../package.json";
import { debounce } from "./utils/debounce";
import { throttle } from "./utils/throttle";

const Editor = lazy(() => import("./components/editor"));

let swUpdatedBeforeRender = false;
eventBus.on("sw-update", () => (swUpdatedBeforeRender = true));

export const App: Component = () => {
  /**
   * Those next three lines are useful to display a popup
   * if the client code has been updated. This trigger a signal
   * via an EventBus initiated in the service worker and
   * the couple line above.
   */
  const [newUpdate, setNewUpdate] = createSignal(swUpdatedBeforeRender);
  eventBus.on("sw-update", () => setNewUpdate(true));
  onCleanup(() => eventBus.all.clear());

  let now: number;
  const worker = new Worker("./worker.ts");
  const tabRefs = new Map<string, HTMLSpanElement>();

  const [store, actions] = useStore();

  const [edit, setEdit] = createSignal(-1);
  const [showPreview, setShowPreview] = createSignal(true);

  onMount(() => actions.set("currentCode", actions.getCurrentSource()));

  /**
   * If we show the preview of the code, we want it to be DOM
   * to be able to render into the iframe.
   */
  createEffect(() => showPreview() && actions.set("mode", "DOM"));

  worker.addEventListener("message", ({ data }) => {
    const { event, result } = data;

    switch (event) {
      case "RESULT":
        const [error, compiled] = result;

        if (error) return actions.set({ error });
        if (!compiled) return;

        actions.set({ compiled, isCompiling: false });

        console.log("Compilation took:", formatMs(performance.now() - now));
        break;
    }
  });

  /**
   * We need to debounce a bit the compilation because
   * it takes ~15ms to compile with the web worker...
   * Also, real time feedback can be stressful
   */
  const applyCompilation = debounce(
    (tabs: Tab[], compileOpts: Record<string, any>) => {
      actions.set("isCompiling", true);
      now = performance.now();

      worker.postMessage({
        event: "COMPILE",
        tabs,
        compileOpts,
      });
    },
    100
  );

  /**
   * The heart of the playground. This recompile on
   * every tab source changes.
   */
  createEffect(() => {
    for (const tab of store.tabs) tab.source;
    applyCompilation(unwrap(store.tabs), unwrap(compileMode[store.mode]));
  });

  /**
   * This syncs the URL hash with the state of the current tab.
   * This is an optimized encoding for limiting URL size...
   *
   * TODO: Find a way to URL shoten this
   */
  createEffect(() => {
    location.hash = encode(JSON.stringify(store.tabs));
  });

  /**
   * This sync the editor state with the current selected tab.
   *
   * @param source {string} - The source code from the editor
   */
  const handleDocChange = (source: string) => {
    actions.setCurrentSource(source);
    actions.set({ error: "" });
  };

  /**
   * This whole block before the slice of view
   * is an experimental resizer, need to tidy this up
   */
  const [left, setLeft] = createSignal(1);
  const [isDragging, setIsDragging] = createSignal(false);

  const onMouseMove = throttle((e: MouseEvent) => {
    const percentage = e.clientX / (document.body.offsetWidth / 2);
    if (percentage < 0.5 || percentage > 1.5) return;

    setLeft(percentage);
  }, 10);

  const onMouseUp = () => setIsDragging(false);

  createEffect(() => {
    if (isDragging()) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
  });

  return (
    <div
      class="relative grid bg-blueGray-50 h-screen overflow-hidden text-blueGray-900 wrapper transition-all duration-100 font-display"
      style={{ "--left": `${left()}fr`, "--right": `${2 - left()}fr` }}
    >
      <Show when={store.header} fallback={<div class="md:col-span-2"></div>}>
        <header class="md:col-span-3 p-2 flex justify-between items-center bg-brand-default text-white">
          <h1 class="flex items-center space-x-4 uppercase leading-0 tracking-widest">
            <a href="https://github.com/ryansolid/solid">
              <img src={logo} alt="solid-js logo" class="w-8" />
            </a>
            <span class="inline-block -mb-1">Solid Playground</span>
          </h1>

          <div class="flex items-center space-x-2">
            <span class="-mb-1 leading-0 text-white">
              v{pkg.dependencies["solid-js"].slice(1)}
            </span>
          </div>
        </header>
      </Show>

      <TabList class="row-start-2 space-x-2">
        <For each={store.tabs}>
          {(tab, index) => (
            <TabItem active={store.current === tab.id}>
              <button
                type="button"
                onClick={() => actions.setCurrentTab(tab.id)}
                onDblClick={() => {
                  if (index() <= 0 || !store.interactive) return;
                  setEdit(index());
                }}
                class="cursor-pointer focus:outline-none"
              >
                <span
                  ref={(el) => tabRefs.set(tab.id, el)}
                  contentEditable={store.current === tab.id && edit() >= 0}
                  onBlur={(e) => {
                    setEdit(-1);
                    actions.setTabName(tab.id, e.target.textContent!);
                  }}
                  onKeyDown={(e) => {
                    if (e.code === "Space") e.preventDefault();
                    if (e.code !== "Enter") return;
                    setEdit(-1);
                    actions.setTabName(tab.id, e.target.textContent!);
                  }}
                  class="outline-none"
                >
                  {tab.name}
                </span>
                <span>.{tab.type}</span>
              </button>

              <Show when={index() > 0}>
                <button
                  type="button"
                  class="border-0 bg-transparent cursor-pointer focus:outline-none"
                  disabled={!store.interactive}
                  onClick={() => {
                    if (!store.interactive) return;
                    actions.removeTab(tab.id);
                  }}
                >
                  <span class="sr-only">Delete this tab</span>
                  <svg
                    style="stroke: currentColor; fill: none;"
                    class="h-4 opacity-60"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </Show>
            </TabItem>
          )}
        </For>

        <li class="inline-flex items-center m-0 border-b-2 border-transparent">
          <button
            type="button"
            class="focus:outline-none"
            onClick={store.interactive && actions.addTab}
            disabled={!store.interactive}
            title="Add a new tab"
          >
            <span class="sr-only">Add a new tab</span>
            <svg
              viewBox="0 0 24 24"
              style="stroke: currentColor; fill: none;"
              class="h-5 text-brand-default"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </li>
      </TabList>

      <TabList class="row-start-4 md:row-start-2 md:col-start-3">
        <TabItem class="flex-1" active={showPreview()}>
          <button
            type="button"
            class="w-full focus:outline-none"
            onClick={[setShowPreview, true]}
          >
            Result
          </button>
        </TabItem>
        <TabItem class="flex-1" active={!showPreview()}>
          <button
            type="button"
            class="w-full focus:outline-none"
            onClick={[setShowPreview, false]}
          >
            Output
          </button>
        </TabItem>
      </TabList>

      <Suspense fallback={<p>Loading the REPL</p>}>
        <Editor
          value={store.currentCode}
          onDocChange={handleDocChange}
          class="h-full max-h-screen overflow-auto flex-1 focus:outline-none p-2 whitespace-pre-line bg-blueGray-50 row-start-3"
          disabled={!store.interactive}
        />

        <div
          class="h-full w-full row-start-2 row-span-2 col-start-2 hidden md:block"
          style="cursor: col-resize"
          onMouseDown={[setIsDragging, true]}
        >
          <div class="h-full border-blueGray-200 border-l border-r rounded-lg mx-auto w-0"></div>
        </div>

        <Show when={!showPreview()}>
          <section class="h-full max-h-screen bg-blueGray-50 overflow-hidden flex flex-col flex-1 focus:outline-none row-start-5 md:row-start-3 relative divide-y-2 divide-gray-400">
            <Editor
              value={store.compiled.replace("https://cdn.skypack.dev/", "")}
              class="h-full overflow-auto focus:outline-none flex-1 p-2"
              disabled
            />

            <div class="bg-gray-100 p-2">
              <label class="font-semibold text-sm uppercase">
                Compile mode
              </label>

              <div class="flex flex-col mt-1">
                <label class="inline-flex mr-auto cursor-pointer items-center space-x-2">
                  <input
                    checked={store.mode === "DOM"}
                    value="DOM"
                    class="text-brand-default"
                    onChange={(e) => actions.set("mode", e.target.value as any)}
                    type="radio"
                    name="dom"
                    id="dom"
                  />
                  <span>Client side rendering</span>
                </label>
                <label class="inline-flex mr-auto cursor-pointer items-center space-x-2">
                  <input
                    checked={store.mode === "SSR"}
                    value="SSR"
                    class="text-brand-default"
                    onChange={(e) => actions.set("mode", e.target.value as any)}
                    type="radio"
                    name="dom"
                    id="dom"
                  />
                  <span>Server side rendering</span>
                </label>
                <label class="inline-flex mr-auto cursor-pointer items-center space-x-2">
                  <input
                    checked={store.mode === "HYDRATABLE"}
                    value="HYDRATABLE"
                    class="text-brand-default"
                    onChange={(e) => actions.set("mode", e.target.value as any)}
                    type="radio"
                    name="dom"
                    id="dom"
                  />
                  <span>Client side rendering with hydratation</span>
                </label>
              </div>
            </div>
          </section>
        </Show>
        <Show when={showPreview()}>
          <Preview
            code={store.compiled}
            class="h-full max-h-screen overflow-auto flex-1 p-2 w-full bg-white row-start-5 md:row-start-3"
            classList={{ "pointer-events-none": isDragging() }}
          />
        </Show>
      </Suspense>

      {/* TODO: Use portal */}
      <Show when={store.error}>
        <pre class="fixed bottom-10 right-10 bg-red-200 text-red-800 border border-red-400 rounded shadow px-6 py-4 z-10 max-w-2xl whitespace-pre-line">
          <button
            title="close"
            type="button"
            onClick={() => actions.set("error", "")}
            class="absolute top-1 right-1 hover:text-red-900"
          >
            <Icon path={x} class="h-6 " />
          </button>
          <code innerText={store.error}></code>
        </pre>
      </Show>

      {/* TODO: Use portal */}
      <Show when={newUpdate()}>
        <div class="fixed bottom-10 left-10 bg-blue-200 text-brand-default border border-blue-400 rounded shadow px-6 py-4 z-10 max-w-sm">
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
