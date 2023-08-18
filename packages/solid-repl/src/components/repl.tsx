import { Show, For, createSignal, createEffect, batch, Match, Switch, onCleanup } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { arrowPath, commandLine, trash, inboxStack, bell, bellSlash } from 'solid-heroicons/outline';
import { unwrap } from 'solid-js/store';
import { Preview } from './preview';
import { TabItem, TabList } from './tabs';
import { GridResizer } from './gridResizer';
import { Error } from './error';
import { throttle } from '@solid-primitives/scheduled';
import { createMediaQuery } from '@solid-primitives/media';
import { editor, Uri } from 'monaco-editor';

import MonacoTabs from './editor/monacoTabs';
import Editor from './editor';
import type { Repl as ReplProps } from 'solid-repl/lib/repl';

const compileMode = {
  SSR: { generate: 'ssr', hydratable: true },
  DOM: { generate: 'dom', hydratable: false },
  HYDRATABLE: { generate: 'dom', hydratable: true },
} as const;

const possibleExtensions = ['.tsx', '.jsx'] as const;
type TPossibleExtensions = (typeof possibleExtensions)[number];
const findExtension = (str: string): TPossibleExtensions => {
  for (const ext of possibleExtensions) {
    if (str.endsWith(ext)) return ext;
  }
  return '.jsx';
};
export const Repl: ReplProps = (props) => {
  const { compiler, formatter, linter } = props;
  let now: number;

  const tabRefs = new Map<number, HTMLSpanElement>();

  const [error, setError] = createSignal('');
  const [output, setOutput] = createSignal('');
  const [mode, setMode] = createSignal<(typeof compileMode)[keyof typeof compileMode]>(compileMode.DOM);

  const userTabs = () => props.tabs.filter((tab) => tab.name != 'import_map.json');
  const tabExtension = findExtension(props.tabs[0].name);

  function setCurrentTab(current: string) {
    const idx = props.tabs.findIndex((tab) => tab.name === current);
    if (idx < 0) return;
    props.setCurrent(current);
  }
  function setCurrentName(newName: string) {
    const tabs = props.tabs;
    tabs.find((tab) => tab.name === props.current).name = newName;
    batch(() => {
      props.setTabs([...tabs]);
      props.setCurrent(newName);
    });
  }
  function removeTab(name: string) {
    const tabs = props.tabs;
    const idx = tabs.findIndex((tab) => tab.name === name);
    const tab = tabs[idx];

    if (!tab) return;

    const confirmDeletion = confirm(`Are you sure you want to delete ${tab.name}?`);
    if (!confirmDeletion) return;

    batch(() => {
      props.setTabs([...tabs.slice(0, idx), ...tabs.slice(idx + 1)]);
      // We want to redirect to another tab if we are deleting the current one
      if (props.current === name) {
        props.setCurrent(tabs[idx - 1].name);
      }
    });
  }
  function addTab() {
    const newTab = {
      name: `tab${userTabs().length}${tabExtension}`,
      source: '',
    };
    batch(() => {
      props.setTabs(props.tabs.concat(newTab));
      props.setCurrent(newTab.name);
    });
  }
  function resetTabs() {
    const confirmReset = confirm('Are you sure you want to reset the editor?');
    if (!confirmReset) return;
    props.reset();
  }

  const [edit, setEdit] = createSignal(-1);
  const [outputTab, setOutputTab] = createSignal(0);

  let importMapChanging = false;
  let import_map = {};
  {
    let import_map_raw = props.tabs.find((tab) => tab.name === 'import_map.json');
    try {
      if (import_map_raw >= 0) {
        import_map = JSON.parse(import_map_raw.source);
      }
    } catch (e) {}
  }
  const [importMap, setImportMap] = createSignal<Record<string, string>>(import_map, {
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });

  let outputModel: editor.ITextModel;
  createEffect(() => {
    const outputUri = Uri.parse(`file:///${props.id}/output_dont_import.ts`);
    outputModel = editor.createModel('', 'typescript', outputUri);
    onCleanup(() => outputModel.dispose());
  });

  const onCompilerMessage = ({ data }: any) => {
    const { event, compiled, error } = data;
    if (event === 'ERROR') {
      console.error(error);
      return setError(error.message);
    } else setError('');

    if (event === 'BABEL') {
      outputModel.setValue(compiled);
      setOutput('');
    }

    if (event === 'ROLLUP') {
      let tab = props.tabs.find((tab) => tab.name === 'import_map.json');
      let currentMap = JSON.parse(tab?.source || '{}');
      for (const file in currentMap) {
        if (!(file in compiled) && currentMap[file] === `https://jspm.dev/${file}`) {
          delete currentMap[file];
        }
      }
      for (const file in compiled) {
        if (!(file in currentMap) && !file.startsWith('./')) {
          currentMap[file] = compiled[file];
        }
      }
      console.log(`Compilation took: ${performance.now() - now}ms`);

      importMapChanging = true;
      batch(() => {
        if (!tab) {
          tab = {
            name: 'import_map.json',
            source: JSON.stringify(currentMap, null, 2),
          };
          props.setTabs(props.tabs.concat(tab));
        } else {
          tab.source = JSON.stringify(currentMap, null, 2);
        }

        setOutput(compiled['./main']);
        setImportMap(currentMap);
      });
      importMapChanging = false;

      const importModel = Uri.parse(`file:///${props.id}/import_map.json`);
      editor.getModel(importModel)!.setValue(tab.source);
    }
  };
  compiler.addEventListener('message', onCompilerMessage);
  onCleanup(() => compiler.removeEventListener('message', onCompilerMessage));

  /**
   * We need to debounce a bit the compilation because
   * it takes ~15ms to compile with the web worker...
   * Also, real time feedback can be stressful
   */
  const applyCompilation = throttle((message: any) => {
    now = performance.now();

    compiler.postMessage(message);
  }, 250);

  const compile = () => {
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
  };

  /**
   * The heart of the playground. This recompile on
   * every tab source changes.
   */
  createEffect(() => {
    if (!props.tabs.length) return;

    if (importMapChanging) return;

    compile();
  });

  let grid!: HTMLDivElement;
  let resizer!: HTMLDivElement;
  const [left, setLeft] = createSignal(0.625);

  const isLarge = createMediaQuery('(min-width: 768px)');
  const isHorizontal = () => props.isHorizontal || !isLarge();

  const changeLeft = (clientX: number, clientY: number) => {
    let position: number;
    let size: number;

    const rect = grid.getBoundingClientRect();

    if (isHorizontal()) {
      position = clientY - rect.top - resizer.offsetHeight / 2;
      size = grid.offsetHeight - resizer.offsetHeight;
    } else {
      position = clientX - rect.left - resizer.offsetWidth / 2;
      size = grid.offsetWidth - resizer.offsetWidth;
    }
    const percentage = position / size;
    const percentageAdjusted = Math.min(Math.max(percentage, 0.25), 0.75);

    setLeft(percentageAdjusted);
  };

  const [reloadSignal, reload] = createSignal(false, { equals: false });
  const [devtoolsOpen, setDevtoolsOpen] = createSignal(!props.hideDevtools);
  const [displayErrors, setDisplayErrors] = createSignal(true);

  return (
    <div
      ref={grid}
      class="dark:bg-solid-darkbg flex min-h-0 flex-1 flex-col bg-white font-sans text-black dark:text-white"
      classList={{
        'md:flex-row': !props.isHorizontal,
        'dark': props.dark,
      }}
    >
      <div class="flex min-h-0 min-w-0 flex-col" style={`flex: ${left()}`}>
        <TabList>
          <For each={userTabs()}>
            {(tab, index) => (
              <TabItem active={props.current === tab.name} class="mr-2">
                <div
                  ref={(el) => tabRefs.set(index(), el)}
                  class="cursor-pointer select-none rounded border border-solid border-transparent px-3 py-2 transition"
                  classList={{
                    'border-transparent': edit() !== index(),
                    'border-blue-600 outline-none': edit() === index(),
                  }}
                  contentEditable={edit() == index()}
                  onBlur={(e) => {
                    if (edit() !== index()) return;
                    setEdit(-1);
                    setCurrentName(e.currentTarget.textContent!);
                  }}
                  onKeyDown={(e) => {
                    if (e.code === 'Space') e.preventDefault();
                    if (e.code !== 'Enter') return;
                    if (edit() === index()) {
                      setEdit(-1);
                      setCurrentName(e.currentTarget.textContent!);
                      e.currentTarget.blur();
                    } else {
                      setCurrentTab(tab.name);
                    }
                  }}
                  onClick={() => setCurrentTab(tab.name)}
                  onDblClick={(e) => {
                    e.preventDefault();
                    setEdit(index());
                    tabRefs.get(index())?.focus();
                  }}
                  title={tab.name}
                  role="button"
                  tabindex="0"
                >
                  {tab.name}
                </div>

                <Show when={index() > 0}>
                  <button
                    type="button"
                    class="cursor-pointer"
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

          <TabItem class="select-none" active={props.current === 'import_map.json'}>
            <label
              class="cursor-pointer space-x-2 px-3 py-2"
              onclick={() => props.setCurrent('import_map.json')}
              onKeyDown={(e) => {
                if (e.code === 'Enter') props.setCurrent('import_map.json');
              }}
              title="Import Map"
              role="button"
              tabindex="0"
            >
              <Icon path={inboxStack} class="h-5" />
              <span class="sr-only">Import Map</span>
            </label>
          </TabItem>
          <li class="m-0 inline-flex items-center border-b-2 border-transparent">
            <button type="button" onClick={addTab} title="Add a new tab">
              <span class="sr-only">Add a new tab</span>
              <svg
                viewBox="0 0 24 24"
                style="stroke: currentColor; fill: none;"
                class="text-brand-default h-5 dark:text-slate-50"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </li>
          <TabItem class="ml-auto justify-self-end">
            <button class="cursor-pointer space-x-2 px-2 py-2" onclick={resetTabs} title="Reset Editor">
              <Icon path={trash} class="h-5" />
              <span class="sr-only">Reset Editor</span>
            </button>
          </TabItem>
          <TabItem class="select-none justify-self-end">
            <label class="cursor-pointer px-3 py-2" title="Display Errors">
              <input
                type="checkbox"
                hidden
                checked={displayErrors()}
                onChange={(event) => setDisplayErrors(event.currentTarget.checked)}
              />
              <Icon path={displayErrors() ? bell : bellSlash} class="h-5" />
              <span class="sr-only">Display Errors</span>
            </label>
          </TabItem>
        </TabList>

        <MonacoTabs tabs={props.tabs} folder={props.id} />

        <Show when={props.current}>
          <Editor
            url={`file:///${props.id}/${props.current}`}
            onDocChange={(code: string) => {
              if (props.current == 'import_map.json') {
                const newImportMap = JSON.parse(code);
                setImportMap(newImportMap);
              } else {
                compile();
              }
            }}
            formatter={formatter}
            linter={linter}
            isDark={props.dark}
            withMinimap={false}
            onEditorReady={props.onEditorReady}
            displayErrors={displayErrors()}
          />
        </Show>

        <Show when={displayErrors() && error()}>
          <Error onDismiss={() => setError('')} message={error()} />
        </Show>
      </div>

      <GridResizer ref={resizer} isHorizontal={isHorizontal()} onResize={changeLeft} />

      <div class="flex min-h-0 min-w-0 flex-col" style={`flex: ${1 - left()}`}>
        <TabList>
          <TabItem>
            <button
              type="button"
              title="Refresh the page"
              class="px-3 py-2 active:animate-spin disabled:animate-none disabled:cursor-not-allowed disabled:opacity-25"
              onClick={[reload, true]}
              disabled={outputTab() != 0}
            >
              <span class="sr-only">Refresh the page</span>
              <Icon path={arrowPath} class="h-5" />
            </button>
          </TabItem>
          <TabItem>
            <button
              type="button"
              title={`${devtoolsOpen() ? 'Close' : 'Open'} the devtools`}
              class="px-3 py-2 disabled:cursor-not-allowed disabled:opacity-25"
              onClick={() => setDevtoolsOpen(!devtoolsOpen())}
              disabled={outputTab() != 0}
            >
              <span class="sr-only">{devtoolsOpen() ? 'Close' : 'Open'} the devtools</span>
              <Icon path={commandLine} class="h-5" />
            </button>
          </TabItem>
          <TabItem class="flex-1" active={outputTab() == 0}>
            <button type="button" class="-mb-0.5 w-full py-2" onClick={[setOutputTab, 0]}>
              Result
            </button>
          </TabItem>
          <TabItem class="flex-1" active={outputTab() == 1}>
            <button
              type="button"
              class="-mb-0.5 w-full py-2"
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
              importMap={importMap()}
              code={output()}
              reloadSignal={reloadSignal()}
              devtools={devtoolsOpen()}
              isDark={props.dark}
            />
          </Match>
          <Match when={outputTab() == 1}>
            <section class="relative flex min-h-0 min-w-0 flex-1 flex-col divide-y-2 divide-slate-200 dark:divide-neutral-800">
              <Editor
                url={`file:///${props.id}/output_dont_import.ts`}
                isDark={props.dark}
                disabled
                withMinimap={false}
              />

              <div class="p-5">
                <label class="text-sm font-semibold uppercase">Compile mode</label>

                <div class="mt-1 space-y-1 text-sm">
                  <label class="mr-auto block cursor-pointer space-x-2">
                    <input
                      checked={mode() === compileMode.DOM}
                      value="DOM"
                      class="text-brand-default"
                      onChange={[setMode, compileMode.DOM]}
                      type="radio"
                      name="dom"
                    />
                    <span>Client side rendering</span>
                  </label>

                  <label class="mr-auto block cursor-pointer space-x-2">
                    <input
                      checked={mode() === compileMode.SSR}
                      value="SSR"
                      class="text-brand-default"
                      onChange={[setMode, compileMode.SSR]}
                      type="radio"
                      name="dom"
                    />
                    <span>Server side rendering</span>
                  </label>

                  <label class="mr-auto block cursor-pointer space-x-2">
                    <input
                      checked={mode() === compileMode.HYDRATABLE}
                      value="HYDRATABLE"
                      class="text-brand-default"
                      onChange={[setMode, compileMode.HYDRATABLE]}
                      type="radio"
                      name="dom"
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
