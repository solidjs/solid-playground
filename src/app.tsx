import { compressToURL as encode } from '@amoutonbrady/lz-string';

import {
  For,
  lazy,
  Show,
  Suspense,
  onCleanup,
  Component,
  createEffect,
  createSignal,
  unwrap,
} from 'solid-js';
import { eventBus, formatMs } from './utils';
import { compileMode, Tab, useStore } from './store';
import { TabItem, TabList, Preview, Header, Error, Update } from './components';

import { debounce } from './utils/debounce';
import { throttle } from './utils/throttle';
import CompilerWorker from './workers/compiler?worker';
import FormatterWorker from './workers/formatter?worker';
const Editor = lazy(() => import('./components/editor'));

let swUpdatedBeforeRender = false;
eventBus.on('sw-update', () => (swUpdatedBeforeRender = true));

export const App: Component = () => {
  /**
   * Those next three lines are useful to display a popup
   * if the client code has been updated. This trigger a signal
   * via an EventBus initiated in the service worker and
   * the couple line above.
   */
  const [newUpdate, setNewUpdate] = createSignal(swUpdatedBeforeRender);
  eventBus.on('sw-update', () => setNewUpdate(true));
  onCleanup(() => eventBus.all.clear());

  let now: number;

  const compiler = new CompilerWorker();
  const formatter = new FormatterWorker();
  const tabRefs = new Map<string, HTMLSpanElement>();

  const [store, actions] = useStore();

  const [edit, setEdit] = createSignal(-1);
  const [showPreview, setShowPreview] = createSignal(true);

  /**
   * If we show the preview of the code, we want it to be DOM
   * to be able to render into the iframe.
   */
  createEffect(() => showPreview() && actions.set('mode', 'DOM'));

  compiler.addEventListener('message', ({ data }) => {
    const { event, result } = data;

    switch (event) {
      case 'RESULT':
        const [error, compiled] = result;

        if (error) return actions.set({ error });
        if (!compiled) return;

        actions.setCompiled(compiled);

        console.log('Compilation took:', formatMs(performance.now() - now));
        break;
    }
  });

  /**
   * We need to debounce a bit the compilation because
   * it takes ~15ms to compile with the web worker...
   * Also, real time feedback can be stressful
   */
  const applyCompilation = debounce((tabs: Tab[], compileOpts: Record<string, any>) => {
    actions.set('isCompiling', true);
    now = performance.now();

    compiler.postMessage({
      event: 'COMPILE',
      tabs,
      compileOpts,
    });
  }, 250);

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
   * TODO: Find a way to URL shorten this
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
    actions.set({ error: '' });
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

  const dark = localStorage.getItem('dark');
  actions.set('dark', dark === 'true');

  createEffect(() => {
    const action = store.dark ? 'add' : 'remove';
    document.body.classList[action]('dark');
    localStorage.setItem('dark', String(store.dark));
  });

  return (
    <div
      class="relative grid bg-blueGray-50 h-screen overflow-hidden text-blueGray-900 dark:text-blueGray-50 font-display"
      classList={{
        'wrapper--forced': store.isHorizontal,
        wrapper: !store.isHorizontal,
      }}
      style={{ '--left': `${left()}fr`, '--right': `${2 - left()}fr` }}
    >
      <Show
        when={store.header}
        children={<Header />}
        fallback={<div classList={{ 'md:col-span-2': !store.isHorizontal }}></div>}
      />

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
                  tabRefs.get(tab.id).focus();
                }}
                class="cursor-pointer focus:outline-none -mb-0.5"
              >
                <span
                  ref={(el) => tabRefs.set(tab.id, el)}
                  contentEditable={store.current === tab.id && edit() >= 0}
                  // onBlur={(e) => {
                  //   setEdit(-1);
                  //   actions.setTabName(tab.id, e.currentTarget.textContent!);
                  // }}
                  onKeyDown={(e) => {
                    if (e.code === 'Space') e.preventDefault();
                    if (e.code !== 'Enter') return;
                    setEdit(-1);
                    actions.setTabName(tab.id, e.currentTarget.textContent!);
                  }}
                  class="outline-none"
                >
                  {tab.name}
                </span>
                <Show
                  when={store.current === tab.id && edit() >= 0}
                  fallback={<span>.{tab.type}</span>}
                >
                  <select
                    class="bg-none p-0"
                    value={tab.type}
                    onChange={(e) => {
                      setEdit(-1);
                      actions.setTabType(tab.id, e.currentTarget.value);
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

        <Show when={!store.noEditableTabs}>
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
        class={`row-start-4 border-t-2 border-blueGray-200 ${
          store.isHorizontal ? '' : 'md:row-start-2 md:col-start-3 md:border-t-0'
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
          <div class="row-start-3 col-span-3 flex items-center justify-center">
            <p class="animate-pulse text-xl font-display">Loading the playground...</p>
          </div>
        }
      >
        <Editor
          url={`file:///${store.currentTab.name}.${store.currentTab.type}`}
          onDocChange={handleDocChange}
          class="h-full focus:outline-none bg-blueGray-50 dark:bg-blueGray-800 row-start-3"
          styles={{ backgroundColor: '#F8FAFC' }}
          disabled={!store.interactive}
          canCopy
          canFormat
          formatter={formatter}
          isDark={store.dark}
          withMinimap={false}
          showActionBar={store.noActionBar}
        />

        <div
          class="column-resizer h-full w-full row-start-2 row-end-4 col-start-2 hidden"
          style="cursor: col-resize"
          classList={{ 'md:block': !store.isHorizontal }}
          onMouseDown={[setIsDragging, true]}
        >
          <div class="h-full border-blueGray-200 dark:border-blueGray-700 border-l border-r rounded-lg mx-auto w-0"></div>
        </div>

        <Show when={!showPreview()}>
          <section
            class="h-full max-h-screen bg-white dark:bg-blueGray-800 grid focus:outline-none row-start-5 relative divide-y-2 divide-blueGray-200 dark:divide-blueGray-500"
            classList={{ 'md:row-start-3': !store.isHorizontal }}
            style="grid-template-rows: minmax(0, 1fr) auto"
          >
            <Editor
              url="file:///output_dont_import.tsx"
              class="h-full focus:outline-none"
              styles={{ backgroundColor: '#fff' }}
              isDark={store.dark}
              disabled
              canCopy
              withMinimap={false}
              showActionBar={store.noActionBar}
            />

            <div class="bg-white dark:bg-blueGray-800 p-5 hidden md:block">
              <label class="font-semibold text-sm uppercase">Compile mode</label>

              <div class="mt-1 space-y-1 text-sm">
                <label class="block mr-auto cursor-pointer space-x-2">
                  <input
                    checked={store.mode === 'DOM'}
                    value="DOM"
                    class="text-brand-default"
                    onChange={(e) => actions.set('mode', e.currentTarget.value as any)}
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
                    onChange={(e) => actions.set('mode', e.currentTarget.value as any)}
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
                    onChange={(e) => actions.set('mode', e.currentTarget.value as any)}
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
            class={`h-full w-full bg-white row-start-5 ${
              store.isHorizontal ? '' : 'md:row-start-3'
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

      <Show when={newUpdate()} children={<Update onDismiss={() => setNewUpdate(false)} />} />
    </div>
  );
};
