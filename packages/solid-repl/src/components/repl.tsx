import { createSignal, createEffect, batch, onCleanup, createMemo, onMount, createRoot, Show } from 'solid-js';
import { insert } from 'solid-js/web';
import { arrowPath, commandLine, trash, bell, bellSlash } from 'solid-heroicons/outline';
import { unwrap } from 'solid-js/store';
import { Preview } from './preview';
import { Error } from './error';
import { throttle } from '@solid-primitives/scheduled';
import { editor, Uri } from 'monaco-editor';
import { createMonacoTabs } from './editor/monacoTabs';

import Editor from './editor';
import type { Repl as ReplProps } from 'solid-repl/dist/repl';
import type { Tab } from 'solid-repl';
import { DockviewComponent } from 'dockview-core';
import '../../node_modules/dockview-core/dist/styles/dockview.css';
import { FileTree } from './fileTree';

const compileMode = {
  SSR: { generate: 'ssr', hydratable: true },
  DOM: { generate: 'dom', hydratable: false },
  HYDRATABLE: { generate: 'dom', hydratable: true },
  UNIVERSAL: { generate: 'universal', hydratable: false, moduleName: 'solid-universal-module' as string },
} as const;

const getImportMap = (tabs: Tab[]): Record<string, string> => {
  try {
    const rawImportMap = tabs.find((tab) => tab.name === 'import_map.json');
    return JSON.parse(rawImportMap?.source ?? '{}');
  } catch (e) {
    return {};
  }
};

export const Repl: ReplProps = (props) => {
  const { compiler, formatter, linter } = props;
  let now: number;

  const [error, setError] = createSignal('');
  const [output, setOutput] = createSignal('');
  const [universalModuleName, setUniversalModuleName] = createSignal('solid-universal-module');
  const [mode, setMode] = createSignal<(typeof compileMode)[keyof typeof compileMode]>(compileMode.DOM);

  const userTabs = () => props.tabs.filter((tab) => tab.name != 'import_map.json');

  const [outputVisible, setOutputVisible] = createSignal(false);
  const [previewVisible, setPreviewVisible] = createSignal(false);
  const [importMap, setImportMap] = createSignal(getImportMap(props.tabs), {
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });

  const outputUri = Uri.parse(`file:///${props.id}/output_dont_import.ts`);
  const outputModel = editor.createModel('', 'typescript', outputUri);
  onCleanup(() => outputModel.dispose());

  const onCompilerMessage = ({ data }: any) => {
    const { event, compiled, error } = data;
    if (event === 'ERROR') {
      console.error(error);
      return setError(error.message);
    } else setError('');

    if (event === 'BABEL') {
      outputModel.setValue(compiled);
    }

    if (event === 'ROLLUP') {
      const currentMap = { ...importMap() };
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

      batch(() => {
        let tab = props.tabs.find((tab) => tab.name === 'import_map.json');
        if (!tab) {
          tab = {
            name: 'import_map.json',
            source: JSON.stringify(currentMap, null, 2),
          };
          props.setTabs(props.tabs.concat(tab));
        } else {
          tab.source = JSON.stringify(currentMap, null, 2);
          const { model } = monacoTabs().get(`file:///${props.id}/import_map.json`)!;
          model.setValue(tab.source);
        }

        setOutput(compiled['./main']);
        setImportMap(currentMap);
      });
    }
  };
  compiler.addEventListener('message', onCompilerMessage);
  onCleanup(() => compiler.removeEventListener('message', onCompilerMessage));

  /**
   * We need to debounce a bit the compilation because
   * it takes ~15ms to compile with the web worker...
   * Also, real time feedback can be stressful
   */
  const sendCompile = (message: any) => {
    now = performance.now();

    compiler.postMessage(message);
  };
  const applyRollupCompilation = throttle(sendCompile, 250);
  const applyBabelCompilation = throttle(sendCompile, 250);

  const compile = () => {
    let compileOpts = mode();
    if (compileOpts === compileMode.UNIVERSAL) {
      compileOpts = { generate: 'universal', hydratable: false, moduleName: universalModuleName() };
    }
    if (previewVisible())
      applyRollupCompilation({
        event: 'ROLLUP',
        tabs: unwrap(userTabs()),
      });
    if (outputVisible())
      applyBabelCompilation({
        event: 'BABEL',
        tab: unwrap(props.tabs.find((tab) => tab.name == props.current)),
        compileOpts,
      });
  };

  /**
   * The heart of the playground. This recompile on
   * every tab source changes.
   */
  createEffect(() => {
    if (!props.tabs.length) return;

    compile();
  });

  const monacoTabs = createMonacoTabs(props.id, () => props.tabs);
  const currentModel = createMemo(() => monacoTabs().get(`file:///${props.id}/${props.current}`)!.model);

  let grid!: HTMLDivElement;

  const [reloadSignal, reload] = createSignal(false, { equals: false });
  const [devtoolsOpen, setDevtoolsOpen] = createSignal(!props.hideDevtools);
  const [displayErrors, setDisplayErrors] = createSignal(true);

  onMount(() => {
    const dockview = new DockviewComponent({
      parentElement: grid,
      frameworkComponentFactory: {
        content: {
          createComponent: (id, componentId, component) => {
            const element = (<div class="flex h-full"></div>) as HTMLDivElement;
            let disposer;
            return {
              element,
              init: (params) => {
                createRoot((dispose) => {
                  insert(element, () => component(params.params));
                  disposer = dispose;
                });
              },
              dispose: () => disposer!(),
            };
          },
        },
        tab: {
          createComponent: (id, componentId, component) => {
            const element = (<div class="flex h-full"></div>) as HTMLDivElement;
            let disposer;
            return {
              element,
              init: (params) => {
                if (params.api.isVisible)
                  createRoot((dispose) => {
                    insert(element, () => component(params.params));
                    disposer = dispose;
                  });
              },
              dispose: () => disposer!(),
            };
          },
        },
        watermark: {
          createComponent: (id, componentId, component) => {
            return {
              element: document.createElement('div'),
              init: () => {},
              updateParentGroup: () => {},
            };
          },
        },
      },
      frameworkComponents: {
        editor: (params: { currentModel: editor.ITextModel }) => (
          <Editor
            model={params.currentModel}
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
            displayErrors={displayErrors()}
          />
        ),
        preview: () => {
          setPreviewVisible(true);
          onCleanup(() => {
            setPreviewVisible(false);
          });
          return (
            <Preview
              importMap={importMap()}
              code={output()}
              reloadSignal={reloadSignal()}
              devtools={devtoolsOpen()}
              isDark={props.dark}
            />
          );
        },
        output: () => {
          setOutputVisible(true);
          onCleanup(() => {
            setOutputVisible(false);
          });
          return (
            <section class="divide-y-1 relative flex min-h-0 min-w-0 flex-1 flex-col divide-slate-200 dark:divide-neutral-800">
              <Editor model={outputModel} isDark={props.dark} disabled withMinimap={false} />

              <div class="p-2">
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

                  <label class="mr-auto block cursor-pointer space-x-2">
                    <input
                      checked={mode() === compileMode.UNIVERSAL}
                      value="UNIVERSAL"
                      class="text-brand-default"
                      onChange={[setMode, compileMode.UNIVERSAL]}
                      type="radio"
                      name="dom"
                    />
                    <span>Universal Rendering & moduleName:</span>
                    <input
                      onFocus={[setMode, compileMode.UNIVERSAL]}
                      onInput={(e) => {
                        setUniversalModuleName(e.target.value);
                      }}
                      class="p-2.5"
                      type="text"
                      value={universalModuleName()}
                      name="moduleName"
                    />
                  </label>
                </div>
              </div>
            </section>
          );
        },
        filetree: () => (
          <FileTree
            files={props.tabs.map((x) => ({ name: x.name }))}
            folders={[]}
            onClick={(name) => {
              const panel = dockview.getGroupPanel(name);
              if (panel) panel.focus?.();
              else
                dockview.addPanel({
                  id: name,
                  component: 'editor',
                  params: {
                    currentModel: monacoTabs().get(`file:///${props.id}/${name}`)!.model,
                  },
                });
            }}
          />
        ),
      },
    });
    const panel = dockview.addPanel({
      id: props.current!,
      component: 'editor',
      params: {
        currentModel: currentModel(),
      },
    });

    const preview = dockview.addPanel({
      id: 'Preview',
      component: 'preview',
      position: {
        referencePanel: panel,
        direction: 'right',
      },
    });
    dockview.addPanel({
      id: 'Output',
      component: 'output',
      position: {
        referencePanel: preview,
        direction: 'within',
      },
    });
    dockview.addPanel({
      id: 'File Tree',
      component: 'filetree',
      position: {
        referencePanel: panel,
        direction: 'below',
      },
    });
  });
  return (
    <>
      <div
        ref={grid}
        class="dockview-theme-replit flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white font-sans text-black dark:text-white"
      >
        {''}
        <Show when={error()}>
          <Error message={error()} onDismiss={() => setError('')} />
        </Show>
      </div>
    </>
  );
};
