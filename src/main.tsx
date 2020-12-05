import "./assets/tailwind.css";

import debounce from "lodash/debounce";

import {
  Component,
  Show,
  createEffect,
  Suspense,
  lazy,
  createSignal,
  onCleanup,
  For,
} from "solid-js";
import { render } from "solid-js/web";

import { compressToEncodedURIComponent } from "lz-string";

import { Icon } from "@amoutonbrady/solid-heroicons";
import { x } from "@amoutonbrady/solid-heroicons/outline";

import { compile } from "./utils/worker";
import { eventBus } from "./utils/eventBus";
import TabItem from "./components/tab/item";
import TabList from "./components/tab/list";
import { Preview } from "./components/preview";
import { compileMode, StoreProvider, useStore } from "./store";

// @ts-ignore
import logo from "url:./assets/images/logo.svg";
import pkg from "../package.json";

const Editor = lazy(() => import("./components/editor"));

let swUpdatedBeforeRender = false;
eventBus.on("sw-update", () => (swUpdatedBeforeRender = true));

const App: Component = () => {
  const [newUpdate, setNewUpdate] = createSignal(swUpdatedBeforeRender);
  eventBus.on("sw-update", () => setNewUpdate(true));
  onCleanup(() => eventBus.all.clear());

  const refs = new Map<string, HTMLSpanElement>();

  const [store, actions] = useStore();
  const [edit, setEdit] = createSignal(-1);
  const [showPreview, setShowPreview] = createSignal(true);

  // TODO: Use `useTransition` to show a loading state when it's compiling
  const compileOnChange = debounce(async (tabs, compileOpts) => {
    const [error, compiled] = await compile(tabs, compileOpts);

    if (error) return actions.setState({ error });
    if (!compiled) return;

    actions.setState({ compiled });
  }, 750);

  createEffect(() => {
    if (!showPreview()) actions.setState("mode", "DOM");
  });

  createEffect(() => {
    for (const tab of store.tabs) tab.source;
    compileOnChange(store.tabs, compileMode[store.mode]);
  });

  createEffect(() => {
    location.hash = compressToEncodedURIComponent(JSON.stringify(store.tabs));
  });

  const handleDocChange = (source: string) => {
    actions.setCurrentSource(source);
    actions.setState({ error: "" });
  };

  return (
    <div class="relative grid md:grid-cols-2 h-screen gap-0.5 overflow-hidden bg-gray-400 text-gray-900 wrapper">
      <Show when={store.header} fallback={<div class="md:col-span-2"></div>}>
        <header class="md:col-span-2 p-2 flex justify-between items-center bg-gray-50">
          <h1 class="flex items-center space-x-4 uppercase font-semibold">
            <a href="https://github.com/ryansolid/solid">
              <img src={logo} alt="solid-js logo" class="h-8" />
            </a>
            <span>Solid REPL</span>
          </h1>

          <div class="flex items-center space-x-2">
            <span>v{pkg.dependencies["solid-js"].slice(1)}</span>
          </div>
        </header>
      </Show>

      <TabList class="row-start-2">
        <For each={store.tabs}>
          {(tab, index) => (
            <TabItem active={store.current === tab.id}>
              <button
                type="button"
                onClick={[actions.setCurrentTab, tab.id]}
                onDblClick={() => {
                  if (index() <= 0 || !store.interactive) return;
                  setEdit(index());
                }}
                class="cursor-pointer"
              >
                <span
                  ref={(el) => refs.set(tab.id, el)}
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
                  class="border-0 bg-transparent cursor-pointer"
                  disabled={!store.interactive}
                  onClick={() => {
                    if (!store.interactive) return;
                    actions.removeTab(tab.id);
                  }}
                >
                  <span class="sr-only">Delete this tab</span>
                  <svg
                    style="stroke: currentColor; fill: none;"
                    class="h-4"
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

        <TabItem>
          <button
            type="button"
            onClick={store.interactive && actions.addTab}
            disabled={!store.interactive}
            title="Add a new tab"
          >
            <span class="sr-only">Add a new tab</span>
            <svg
              viewBox="0 0 24 24"
              style="stroke: currentColor; fill: none;"
              class="h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </TabItem>
      </TabList>

      <TabList class="row-start-4 md:row-start-2">
        <TabItem class="flex-1" active={showPreview()}>
          <button type="button" class="w-full" onClick={[setShowPreview, true]}>
            Result
          </button>
        </TabItem>
        <TabItem class="flex-1" active={!showPreview()}>
          <button
            type="button"
            class="w-full"
            onClick={[setShowPreview, false]}
          >
            Output
          </button>
        </TabItem>
      </TabList>

      <Suspense fallback={<p>Loading the REPL</p>}>
        <Editor
          value={actions.currentSource}
          onDocChange={handleDocChange}
          class="h-full max-h-screen overflow-auto flex-1 focus:outline-none p-2 whitespace-pre-line bg-trueGray-100 row-start-3"
          disabled={!store.interactive}
        />

        <Show when={!showPreview()}>
          <section class="h-full max-h-screen overflow-hidden flex flex-col flex-1 focus:outline-none bg-trueGray-100 row-start-5 md:row-start-3 relative divide-y-2 divide-gray-400">
            <Editor
              value={store.compiled}
              class="h-full overflow-auto focus:outline-none flex-1 overflow-auto p-2"
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
                    class="text-primary"
                    onChange={(e) =>
                      actions.setState("mode", e.target.value as any)
                    }
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
                    class="text-primary"
                    onChange={(e) =>
                      actions.setState("mode", e.target.value as any)
                    }
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
                    class="text-primary"
                    onChange={(e) =>
                      actions.setState("mode", e.target.value as any)
                    }
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
            class="h-full max-h-screen overflow-auto flex-1 p-2 w-full bg-gray-50 row-start-5 md:row-start-3"
          />
        </Show>
      </Suspense>

      {/* TODO: Use portal */}
      <Show when={store.error}>
        <pre class="fixed bottom-10 right-10 bg-red-200 text-red-800 border border-red-400 rounded shadow px-6 py-4 z-10 max-w-2xl whitespace-pre-line">
          <button
            title="close"
            type="button"
            onClick={() => actions.setState("error", "")}
            class="absolute top-1 right-1 hover:text-red-900"
          >
            <Icon path={x} class="h-6 " />
          </button>
          <code innerText={store.error}></code>
        </pre>
      </Show>

      {/* TODO: Use portal */}
      <Show when={newUpdate()}>
        <div class="fixed bottom-10 left-10 bg-blue-200 text-primary border border-blue-400 rounded shadow px-6 py-4 z-10 max-w-sm">
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

render(
  () => (
    <StoreProvider>
      <App />
    </StoreProvider>
  ),
  document.getElementById("app")!
);
