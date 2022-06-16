import { Show, For, createSignal, createEffect, batch, Match, Switch } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { refresh, terminal } from 'solid-heroicons/outline';
import { unwrap } from 'solid-js/store';
import { Preview } from './preview';
import { TabItem } from './tab/item';
import { TabList } from './tab/list';
import { GridResizer } from './gridResizer';
import { Error } from './error';
import { throttle } from '@solid-primitives/scheduled';
import { createMediaQuery } from '@solid-primitives/media';

import MonacoTabs from './editor/monacoTabs';
import Editor from './editor';

import type { Repl as ReplProps } from '../../types/types';

const compileMode = {
  SSR: { generate: 'ssr', hydratable: true },
  DOM: { generate: 'dom', hydratable: false },
  HYDRATABLE: { generate: 'dom', hydratable: true },
} as const;

const Repl: ReplProps = (props) => {
  const { compiler, formatter } = props;
  let now: number;

  const tabRefs = new Map<string, HTMLSpanElement>();

  const [error, setError] = createSignal('');
  const [compiled, setCompiled] = createSignal('');
  const [mode, setMode] = createSignal<typeof compileMode[keyof typeof compileMode]>(compileMode.SSR);

  function setCurrentTab(current: string) {
    const idx = props.tabs.findIndex((tab) => tab.name === current);
    if (idx < 0) return;
    props.setCurrent(current);
  }
  function setTabName(id1: string, name: string) {
    const idx = props.tabs.findIndex((tab) => tab.name === id1);
    if (idx < 0) return;

    const tabs = props.tabs;
    tabs[idx] = { ...tabs[idx], name };
    batch(() => {
      props.setTabs(tabs);
      if (props.current === id1) {
        props.setCurrent(tabs[idx].name);
      }
    });
  }
  function removeTab(id1: string) {
    const tabs = props.tabs;
    const idx = tabs.findIndex((tab) => tab.name === id1);
    const tab = tabs[idx];

    if (!tab) return;

    const confirmDeletion = confirm(`Are you sure you want to delete ${tab.name}?`);
    if (!confirmDeletion) return;

    batch(() => {
      props.setTabs([...tabs.slice(0, idx), ...tabs.slice(idx + 1)]);
      // We want to redirect to another tab if we are deleting the current one
      if (props.current === id1) {
        props.setCurrent(tabs[idx - 1].name);
      }
    });
  }
  function setCurrentSource(source: string) {
    const idx = props.tabs.findIndex((tab) => tab.name === props.current);
    if (idx < 0) return;

    const tabs = props.tabs;
    tabs[idx].source = source;
  }
  function addTab() {
    const newTab = {
      name: `tab${props.tabs.length}.tsx`,
      source: '',
    };
    batch(() => {
      props.setTabs(props.tabs.concat(newTab));
      props.setCurrent(newTab.name);
    });
  }

  const [edit, setEdit] = createSignal(-1);
  const [outputTab, setOutputTab] = createSignal(0);

  compiler.addEventListener('message', ({ data }) => {
    const { event } = data;

    if (event === 'RESULT') {
      const { compiled, error } = data;

      if (error) return setError(error);

      setCompiled(compiled);

      console.log(`Compilation took: ${performance.now() - now}ms`);
    }
  });

  /**
   * We need to debounce a bit the compilation because
   * it takes ~15ms to compile with the web worker...
   * Also, real time feedback can be stressful
   */
  const applyCompilation = throttle((message: any) => {
    now = performance.now();

    compiler.postMessage(message);
  }, 250);

  /**
   * The heart of the playground. This recompile on
   * every tab source changes.
   */
  createEffect(() => {
    for (const tab of props.tabs) tab.source;
    applyCompilation(
      outputTab() == 0
        ? {
            event: 'ROLLUP',
            tabs: unwrap(props.tabs),
          }
        : {
            event: 'BABEL',
            tab: unwrap(props.tabs.find((tab) => tab.name == props.current)),
            compileOpts: mode(),
          },
    );
  });

  const clampPercentage = (percentage: number, lowerBound: number, upperBound: number) => {
    return Math.min(Math.max(percentage, lowerBound), upperBound);
  };

  let grid: HTMLDivElement;
  let resizer: HTMLElement;
  const [left, setLeft] = createSignal(1.25);

  const isLarge = createMediaQuery('(min-width: 768px)');
  const isHorizontal = () => props.isHorizontal || isLarge();

  const changeLeft = (clientX: number, clientY: number) => {
    let position: number;
    let size: number;
    if (isHorizontal()) {
      position = clientX - grid.offsetLeft - resizer.offsetWidth / 2;
      size = grid.offsetWidth - resizer.offsetWidth;
    } else {
      position = clientY - grid.offsetTop - resizer.offsetHeight / 2;
      size = grid.offsetHeight - resizer.offsetHeight;
    }
    const percentage = position / size;
    const percentageAdjusted = clampPercentage(percentage * 2, 0.5, 1.5);

    setLeft(percentageAdjusted);
  };

  const [reloadSignal, reload] = createSignal(false, { equals: false });
  const [devtoolsOpen, setDevtoolsOpen] = createSignal(true);
  const [displayErrors, setDisplayErrors] = createSignal(true);

  return (
    <div
      ref={(el) => {
        grid = el;
        if (props.ref) {
          (props.ref as (el: HTMLDivElement) => void)(el);
        }
      }}
      class="grid h-full min-h-0 bg-white dark:bg-solid-darkbg dark:text-white text-black font-sans"
      classList={{
        'wrapper--forced': props.isHorizontal,
        'wrapper': !props.isHorizontal,
      }}
      style={{
        '--left': `${left()}fr`,
        '--right': `${2 - left()}fr`,
      }}
    >
      <div class="h-full flex flex-col">
        <TabList>
          <For each={props.tabs}>
            {(tab, index) => (
              <TabItem active={props.current === tab.name} class="mr-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab(tab.name)}
                  onDblClick={() => {
                    setEdit(index());
                    tabRefs.get(tab.name)?.focus();
                  }}
                  class="cursor-pointer -mb-0.5 py-2 px-3"
                >
                  <span
                    ref={(el) => tabRefs.set(tab.name, el)}
                    contentEditable={edit() == index()}
                    onBlur={(e) => {
                      setEdit(-1);
                      setTabName(tab.name, e.currentTarget.textContent!);
                    }}
                    onKeyDown={(e) => {
                      if (e.code === 'Space') e.preventDefault();
                      if (e.code !== 'Enter') return;
                      setEdit(-1);
                      setTabName(tab.name, e.currentTarget.textContent!);
                    }}
                  >
                    {tab.name}
                  </span>
                </button>

                <Show when={index() > 0}>
                  <button
                    type="button"
                    class="border-0 cursor-pointer -mb-0.5"
                    onClick={() => {
                      removeTab(tab.name);
                    }}
                  >
                    <span class="sr-only">Delete this tab</span>
                    <svg style="stroke: currentColor; fill: none;" class="h-4 opacity-60" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Show>
              </TabItem>
            )}
          </For>

          <li class="inline-flex items-center m-0 border-b-2 border-transparent">
            <button type="button" onClick={addTab} title="Add a new tab">
              <span class="sr-only">Add a new tab</span>
              <svg
                viewBox="0 0 24 24"
                style="stroke: currentColor; fill: none;"
                class="h-5 text-brand-default dark:text-slate-50"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </li>
          <TabItem class="ml-auto justify-self-end">
            <label for="display-errors" class="space-x-2 px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                id="display-errors"
                name="display-errors"
                checked={displayErrors()}
                onChange={(event) => setDisplayErrors(event.currentTarget.checked)}
              />
              <span>Display Errors</span>
            </label>
          </TabItem>
        </TabList>

        <MonacoTabs tabs={props.tabs} compiled={compiled()} folder={props.id} />

        <Show when={props.current}>
          {(current) => (
            <Editor
              url={`file:///${props.id}/${current}`}
              onDocChange={setCurrentSource}
              formatter={formatter}
              isDark={props.dark}
              withMinimap={false}
              ref={props.onEditorReady}
              displayErrors={displayErrors()}
            />
          )}
        </Show>

        <Show when={displayErrors() && error()}>
          <Error onDismiss={() => setError('')} message={error()} />
        </Show>
      </div>

      <GridResizer ref={(el) => (resizer = el)} isHorizontal={isHorizontal()} onResize={changeLeft} />

      <div class="h-full flex flex-col">
        <TabList>
          <TabItem>
            <button
              type="button"
              title="Refresh the page"
              class="py-2 px-3 disabled:cursor-not-allowed disabled:opacity-25 active:animate-spin"
              onClick={[reload, true]}
              disabled={outputTab() != 0}
            >
              <span class="sr-only">Refresh the page</span>
              <Icon path={refresh} class="h-5" />
            </button>
          </TabItem>
          <TabItem>
            <button
              type="button"
              title="Open the devtools"
              class="py-2 px-3 disabled:cursor-not-allowed disabled:opacity-25"
              onClick={() => setDevtoolsOpen(!devtoolsOpen())}
              disabled={outputTab() != 0}
            >
              <span class="sr-only">Open the devtools</span>
              <Icon path={terminal} class="h-5" />
            </button>
          </TabItem>
          <TabItem class="flex-1" active={outputTab() == 0}>
            <button type="button" class="w-full -mb-0.5 py-2" onClick={[setOutputTab, 0]}>
              Result
            </button>
          </TabItem>
          <TabItem class="flex-1" active={outputTab() == 1}>
            <button
              type="button"
              class="w-full -mb-0.5 py-2"
              onClick={() => {
                setOutputTab(1);
                setMode(compileMode.DOM);
              }}
            >
              Output
            </button>
          </TabItem>
        </TabList>

        <Switch>
          <Match when={outputTab() == 0}>
            <Preview
              reloadSignal={reloadSignal()}
              devtools={devtoolsOpen()}
              isDark={props.dark}
              code={compiled()}
              class={`h-full w-full bg-white row-start-5 ${props.isHorizontal ? '' : 'md:row-start-2'}`}
            />
          </Match>
          <Match when={outputTab() == 1}>
            <section class="h-full flex flex-col relative divide-y-2 divide-slate-200 dark:divide-neutral-800">
              <Editor
                url={`file:///${props.id}/output_dont_import.tsx`}
                isDark={props.dark}
                disabled
                withMinimap={false}
              />

              <div class="p-5">
                <label class="font-semibold text-sm uppercase">Compile mode</label>

                <div class="mt-1 space-y-1 text-sm">
                  <label class="block mr-auto cursor-pointer space-x-2">
                    <input
                      checked={mode() === compileMode.DOM}
                      value="DOM"
                      class="text-brand-default"
                      onChange={[setMode, compileMode.DOM]}
                      type="radio"
                      name="dom"
                      id="dom"
                    />
                    <span>Client side rendering</span>
                  </label>

                  <label class="block mr-auto cursor-pointer space-x-2">
                    <input
                      checked={mode() === compileMode.SSR}
                      value="SSR"
                      class="text-brand-default"
                      onChange={[setMode, compileMode.SSR]}
                      type="radio"
                      name="dom"
                      id="dom"
                    />
                    <span>Server side rendering</span>
                  </label>

                  <label class="block mr-auto cursor-pointer space-x-2">
                    <input
                      checked={mode() === compileMode.HYDRATABLE}
                      value="HYDRATABLE"
                      class="text-brand-default"
                      onChange={[setMode, compileMode.HYDRATABLE]}
                      type="radio"
                      name="dom"
                      id="dom"
                    />
                    <span>Client side rendering with hydration</span>
                  </label>
                </div>
              </div>
            </section>
          </Match>
        </Switch>
      </div>
    </div>
  );
};

export default Repl;
