import { Component, Show, For, Suspense, createSignal, createEffect, lazy, batch } from 'solid-js';
import { unwrap, createStore } from 'solid-js/store';
import { Preview } from './preview';
import { TabItem } from './tab/item';
import { TabList } from './tab/list';
import { Error } from './error';

import type { Tab } from '../';
import { debounce } from '../utils/debounce';
import { throttle } from '../utils/throttle';
import { formatMs } from '../utils/formatTime';

const MonacoTabs = lazy(() => import('./monacoTabs'));
const Editor = lazy(() => MonacoTabs.preload().then(() => import('./editor')));

const compileMode = {
  SSR: { generate: 'ssr', hydratable: true },
  DOM: { generate: 'dom', hydratable: false },
  HYDRATABLE: { generate: 'dom', hydratable: true },
} as const;

type ValueOf<T> = T[keyof T];

const id = (tab: Tab) => `${tab.name}.${tab.type}`;

export const Repl: Component<{
  compiler: Worker;
  formatter?: Worker;
  isHorizontal: boolean;
  interactive: boolean;
  actionBar: boolean;
  editableTabs: boolean;
  dark: boolean;
  tabs: Tab[];
  version?: string;
  setTabs: (x: Tab[]) => void;
  current: string;
  setCurrent: (x: string) => void;
}> = (props) => {
  const { compiler, formatter } = props; // this is bad style don't do this

  let now: number;

  const tabRefs = new Map<string, HTMLSpanElement>();

  const [store, setStore] = createStore({
    error: '',
    compiled: '',
    mode: 'DOM' as keyof typeof compileMode,
    isCompiling: false,
    get compileMode(): ValueOf<typeof compileMode> {
      return compileMode[this.mode];
    },
  });

  const actions = {
    resetError: () => setStore('error', ''),
    setCurrentTab: (current: string) => {
      const idx = props.tabs.findIndex((tab) => id(tab) === current);
      if (idx < 0) return;
      props.setCurrent(current);
    },
    setCompiled(compiled: string) {
      setStore({ compiled, isCompiling: false });
    },
    setTabName(id1: string, name: string) {
      const idx = props.tabs.findIndex((tab) => id(tab) === id1);
      if (idx < 0) return;

      const tabs = props.tabs;
      tabs[idx] = { ...tabs[idx], name };
      batch(() => {
        props.setTabs(tabs);
        if (props.current === id1) {
          props.setCurrent(id(tabs[idx]));
        }
      });
    },
    setTabType(id1: string, type: string) {
      const idx = props.tabs.findIndex((tab) => id(tab) === id1);
      if (idx < 0) return;

      const tabs = props.tabs;
      tabs[idx] = { ...tabs[idx], type };
      batch(() => {
        props.setTabs(tabs);
        if (props.current === id1) {
          props.setCurrent(id(tabs[idx]));
        }
      });
    },
    removeTab(id1: string) {
      const tabs = props.tabs;
      const idx = tabs.findIndex((tab) => id(tab) === id1);
      const tab = tabs[idx];

      if (!tab) return;

      const confirmDeletion = confirm(`Are you sure you want to delete ${tab.name}.${tab.type}?`);
      if (!confirmDeletion) return;

      batch(() => {
        props.setTabs([...tabs.slice(0, idx), ...tabs.slice(idx + 1)]);
        // We want to redirect to another tab if we are deleting the current one
        if (props.current === id1) {
          props.setCurrent(id(tabs[idx - 1]));
        }
      });
    },
    getCurrentSource() {
      const idx = props.tabs.findIndex((tab) => id(tab) === props.current);
      if (idx < 0) return;

      return props.tabs[idx].source;
    },
    setCurrentSource(source: string) {
      const idx = props.tabs.findIndex((tab) => id(tab) === props.current);
      if (idx < 0) return;

      const tabs = props.tabs;
      tabs[idx].source = source;
    },
    addTab() {
      const newTab = {
        name: `tab${props.tabs.length}`,
        type: 'tsx',
        source: '',
      };
      batch(() => {
        props.setTabs(props.tabs.concat(newTab));
        props.setCurrent(id(newTab));
      });
    },
  };

  const [edit, setEdit] = createSignal(-1);
  const [showPreview, setShowPreview] = createSignal(true);

  /**
   * If we show the preview of the code, we want it to be DOM
   * to be able to render into the iframe.
   */
  createEffect(() => showPreview() && setStore('mode', 'DOM'));

  compiler.addEventListener('message', ({ data }) => {
    const { event, result } = data;

    if (event === 'RESULT') {
      const [error, compiled] = result;

      if (error) return setStore({ error });
      if (!compiled) return;

      actions.setCompiled(compiled);

      console.log('Compilation took:', formatMs(performance.now() - now));
    }
  });

  /**
   * We need to debounce a bit the compilation because
   * it takes ~15ms to compile with the web worker...
   * Also, real time feedback can be stressful
   */
  const applyCompilation = debounce(
    (tabs: Tab[], compileOpts: Record<string, any>, solidVersion?: string) => {
      setStore('isCompiling', true);
      now = performance.now();

      compiler.postMessage({
        event: 'COMPILE',
        tabs,
        compileOpts,
        solidVersion,
      });
    },
    250,
  );

  /**
   * The heart of the playground. This recompile on
   * every tab source changes.
   */
  createEffect(() => {
    for (const tab of props.tabs) tab.source;
    applyCompilation(unwrap(props.tabs), unwrap(compileMode[store.mode]), props.version);
  });

  /**
   * This sync the editor state with the current selected tab.
   *
   * @param source {string} - The source code from the editor
   */
  const handleDocChange = (source: string) => {
    actions.setCurrentSource(source);
    setStore({ error: '' });
  };

  /**
   * This whole block before the slice of view
   * is an experimental resizer, need to tidy this up
   */
  const [left, setLeft] = createSignal(1.25);
  const [isDragging, setIsDragging] = createSignal(false);

  const onMouseMove = throttle((e: MouseEvent) => {
    const percentage = e.clientX / (document.body.offsetWidth / 2);
    if (percentage < 0.5 || percentage > 1.5) return;

    setLeft(percentage);
  }, 10);

  const onMouseUp = () => setIsDragging(false);

  createEffect(() => {
    if (isDragging()) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
  });

  return (
    <div
      class="relative grid bg-blueGray-50 h-full overflow-hidden text-blueGray-900 dark:text-blueGray-50 font-sans"
      classList={{
        'wrapper--forced': props.isHorizontal,
        wrapper: !props.isHorizontal,
      }}
      style={{ '--left': `${left()}fr`, '--right': `${2 - left()}fr` }}
    >
      <TabList class="row-start-1 space-x-2">
        <For each={props.tabs}>
          {(tab, index) => (
            <TabItem active={props.current === id(tab)}>
              <button
                type="button"
                onClick={() => actions.setCurrentTab(id(tab))}
                onDblClick={() => {
                  if (index() <= 0 || !props.interactive) return;
                  setEdit(index());
                  tabRefs.get(id(tab))?.focus();
                }}
                class="cursor-pointer focus:outline-none -mb-0.5"
              >
                <span
                  ref={(el) => tabRefs.set(id(tab), el)}
                  contentEditable={props.current === id(tab) && edit() >= 0}
                  // onBlur={(e) => {
                  //   setEdit(-1);
                  //   actions.setTabName(tab.id, e.currentTarget.textContent!);
                  // }}
                  onKeyDown={(e) => {
                    if (e.code === 'Space') e.preventDefault();
                    if (e.code !== 'Enter') return;
                    setEdit(-1);
                    actions.setTabName(id(tab), e.currentTarget.textContent!);
                  }}
                  class="outline-none"
                >
                  {tab.name}
                </span>
                <Show
                  when={props.current === id(tab) && edit() >= 0}
                  fallback={<span>.{tab.type}</span>}
                >
                  <select
                    class="bg-none p-0"
                    value={tab.type}
                    onChange={(e) => {
                      setEdit(-1);
                      actions.setTabType(id(tab), e.currentTarget.value);
                    }}
                  >
                    <option value="tsx">.tsx</option>
                    <option value="css">.css</option>
                  </select>
                </Show>
              </button>

              <Show when={index() > 0}>
                <button
                  type="button"
                  class="border-0 bg-transparent cursor-pointer focus:outline-none -mb-0.5"
                  disabled={!props.interactive}
                  onClick={() => {
                    if (!props.interactive) return;
                    actions.removeTab(id(tab));
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

        <Show when={props.editableTabs}>
          <li class="inline-flex items-center m-0 border-b-2 border-transparent">
            <button
              type="button"
              class="focus:outline-none"
              onClick={props.interactive ? actions.addTab : undefined}
              disabled={!props.interactive}
              title="Add a new tab"
            >
              <span class="sr-only">Add a new tab</span>
              <svg
                viewBox="0 0 24 24"
                style="stroke: currentColor; fill: none;"
                class="h-5 text-brand-default dark:text-blueGray-50"
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
        </Show>
      </TabList>

      <TabList
        class={`row-start-3 border-t-2 border-blueGray-200 ${
          props.isHorizontal ? '' : 'md:row-start-1 md:col-start-3 md:border-t-0'
        }`}
      >
        <TabItem class="flex-1" active={showPreview()}>
          <button
            type="button"
            class="w-full focus:outline-none -mb-0.5"
            onClick={[setShowPreview, true]}
          >
            Result
          </button>
        </TabItem>
        <TabItem class="flex-1" active={!showPreview()}>
          <button
            type="button"
            class="w-full focus:outline-none -mb-0.5"
            onClick={[setShowPreview, false]}
          >
            Output
          </button>
        </TabItem>
      </TabList>

      <Suspense
        fallback={
          <div class="row-start-2 col-span-3 flex items-center justify-center h-full">
            <p class="animate-pulse text-xl font-sans">Loading the playground...</p>
          </div>
        }
      >
        <MonacoTabs tabs={props.tabs} compiled={store.compiled} />
        <Editor
          url={`file:///${props.current}`}
          onDocChange={handleDocChange}
          class="h-full focus:outline-none bg-blueGray-50 dark:bg-blueGray-800 row-start-2"
          styles={{ backgroundColor: '#F8FAFC' }}
          disabled={!props.interactive}
          canCopy
          canFormat
          formatter={formatter}
          isDark={props.dark}
          withMinimap={false}
          showActionBar={props.actionBar}
        />

        <div
          class="column-resizer h-full w-full row-start-1 row-end-3 col-start-2 hidden"
          style="cursor: col-resize"
          classList={{ 'md:block': !props.isHorizontal }}
          onMouseDown={[setIsDragging, true]}
        >
          <div class="h-full border-blueGray-200 dark:border-blueGray-700 border-l border-r rounded-lg mx-auto w-0"></div>
        </div>

        <Show when={!showPreview()}>
          <section
            class="h-full max-h-screen bg-white dark:bg-blueGray-800 grid focus:outline-none row-start-4 relative divide-y-2 divide-blueGray-200 dark:divide-blueGray-500"
            classList={{ 'md:row-start-2': !props.isHorizontal }}
            style="grid-template-rows: minmax(0, 1fr) auto"
          >
            <Editor
              url="file:///output_dont_import.tsx"
              class="h-full focus:outline-none"
              styles={{ backgroundColor: '#fff' }}
              isDark={props.dark}
              disabled
              canCopy
              withMinimap={false}
              showActionBar={props.actionBar}
            />

            <div class="bg-white dark:bg-blueGray-800 p-5 hidden md:block">
              <label class="font-semibold text-sm uppercase">Compile mode</label>

              <div class="mt-1 space-y-1 text-sm">
                <label class="block mr-auto cursor-pointer space-x-2">
                  <input
                    checked={store.mode === 'DOM'}
                    value="DOM"
                    class="text-brand-default"
                    onChange={(e) => setStore('mode', e.currentTarget.value as any)}
                    type="radio"
                    name="dom"
                    id="dom"
                  />
                  <span>Client side rendering</span>
                </label>

                <label class="block mr-auto cursor-pointer space-x-2">
                  <input
                    checked={store.mode === 'SSR'}
                    value="SSR"
                    class="text-brand-default"
                    onChange={(e) => setStore('mode', e.currentTarget.value as any)}
                    type="radio"
                    name="dom"
                    id="dom"
                  />
                  <span>Server side rendering</span>
                </label>

                <label class="block mr-auto cursor-pointer space-x-2">
                  <input
                    checked={store.mode === 'HYDRATABLE'}
                    value="HYDRATABLE"
                    class="text-brand-default"
                    onChange={(e) => setStore('mode', e.currentTarget.value as any)}
                    type="radio"
                    name="dom"
                    id="dom"
                  />
                  <span>Client side rendering with hydration</span>
                </label>
              </div>
            </div>
          </section>
        </Show>

        <Show when={showPreview()}>
          <Preview
            code={store.compiled}
            class={`h-full w-full bg-white row-start-4 ${
              props.isHorizontal ? '' : 'md:row-start-2'
            }`}
            classList={{
              'pointer-events-none': isDragging(),
            }}
          />
        </Show>
      </Suspense>

      <Show
        when={store.error}
        children={<Error onDismiss={actions.resetError} message={store.error} />}
      />
    </div>
  );
};
