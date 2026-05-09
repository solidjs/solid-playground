import { createSignal, createEffect, batch, onCleanup, createMemo, onMount, Show, createRoot, JSX } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { Preview } from './preview';
import { Error } from './error';
import { throttle } from '@solid-primitives/scheduled';
import { editor, Uri } from 'monaco-editor';
import { createMonacoTabs } from './editor/monacoTabs';
import { NewTab } from './newTab';
import { CompileMode, compileOptions } from './CompileMode';
import { IconButton } from './ui/IconButton';

import Editor from './editor';
import type { Repl as ReplProps } from 'solid-repl/dist/repl';
import type { SolidVersion, Tab } from 'solid-repl';
import { DockviewComponent, Orientation, GroupPanelPartInitParameters, themeAbyssSpaced } from 'dockview-core';
import { insert } from 'solid-js/web';
import { Icon } from 'solid-heroicons';
import { plus, trash, pencil, xMark } from 'solid-heroicons/outline';
import '../../node_modules/dockview-core/dist/styles/dockview.css';
import { Menu, MenuItem } from './ui/Menu';
import Dismiss from 'solid-dismiss';

const getImportMap = (tabs: Tab[]): Record<string, string> => {
  try {
    const rawImportMap = tabs.find((tab) => tab.name === 'import_map.json');
    return JSON.parse(rawImportMap?.source ?? '{}');
  } catch {
    return {};
  }
};

const solidPackages = {
  v1: {
    solid: 'solid-js@1.9.12',
    web: 'solid-js@1.9.12/web',
  },
  v2: {
    solid: 'solid-js@2.0.0-beta.10',
    web: '@solidjs/web@2.0.0-beta.10?deps=solid-js@2.0.0-beta.10',
  },
} as const;

const solidCoreImportMap = (version: SolidVersion): Record<string, string> => {
  const packages = solidPackages[version];
  return {
    'solid-js': `https://esm.sh/${packages.solid}`,
    'solid-js/': `https://esm.sh/${packages.solid}/`,
    'solid-js/web': `https://esm.sh/${packages.web}`,
    '@solidjs/web': `https://esm.sh/${packages.web}`,
  };
};

const withSolidCoreImportMap = (map: Record<string, string>, version: SolidVersion) => {
  const next = { ...map };
  for (const key of ['solid-js', 'solid-js/', 'solid-js/web', '@solidjs/web']) {
    delete next[key];
  }
  return { ...next, ...solidCoreImportMap(version) };
};

export const Repl: ReplProps = (props) => {
  const { compiler, formatter, linter } = props;
  let now: number;

  const [error, setError] = createSignal('');
  const [output, setOutput] = createSignal<Record<string, string>>({});
  const [universalModuleName, setUniversalModuleName] = createSignal('solid-universal-module');
  const [mode, setMode] = createSignal<(typeof compileOptions)[keyof typeof compileOptions]>(compileOptions.DOM);

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
    const { event, compiled, externals, error } = data;
    if (event === 'ERROR') {
      console.error(error);
      return setError(error.message);
    } else setError('');

    if (event === 'BABEL') {
      outputModel.setValue(compiled);
    }

    if (event === 'ROLLUP') {
      const currentMap = withSolidCoreImportMap(importMap(), props.solidVersion);
      for (const file in currentMap) {
        // Catch any `jspm.dev` URLs and migrate them to `esm.sh`
        if (currentMap[file] === `https://jspm.dev/${file}`) {
          currentMap[file] = `https://esm.sh/${file}`;
        }
        if (!(file in externals) && currentMap[file] === `https://esm.sh/${file}`) {
          delete currentMap[file];
        }
      }
      for (const file in externals) {
        if (!(file in currentMap)) {
          currentMap[file] = externals[file];
        }
      }
      console.log(`Compilation took: ${performance.now() - now}ms`);

      batch(() => {
        syncImportMapTab(currentMap);
        setOutput(compiled);
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
    if (previewVisible()) {
      applyRollupCompilation({
        event: 'ROLLUP',
        tabs: unwrap(userTabs()),
        solidVersion: props.solidVersion,
      });
    }
    if (outputVisible() && props.current?.endsWith('.tsx')) {
      let compileOpts = mode();
      if (compileOpts === compileOptions.UNIVERSAL) {
        compileOpts = {
          generate: 'universal',
          hydratable: false,
          moduleName: universalModuleName(),
        };
      }
      applyBabelCompilation({
        event: 'BABEL',
        tab: unwrap(props.tabs.find((tab) => tab.name == props.current)),
        compileOpts,
        solidVersion: props.solidVersion,
      });
    }
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

  const syncImportMapTab = (map: Record<string, string>) => {
    const source = JSON.stringify(map, null, 2);
    let tab = props.tabs.find((tab) => tab.name === 'import_map.json');
    if (!tab) {
      tab = {
        name: 'import_map.json',
        source,
      };
      props.setTabs(props.tabs.concat(tab));
      return;
    }

    tab.source = source;
    const model = monacoTabs().get(`file:///${props.id}/import_map.json`)?.model;
    model?.setValue(source);
  };

  let lastSolidVersion = props.solidVersion;
  createEffect(() => {
    const version = props.solidVersion;
    if (version === lastSolidVersion) return;

    lastSolidVersion = version;
    const nextImportMap = withSolidCoreImportMap(importMap(), version);
    batch(() => {
      syncImportMapTab(nextImportMap);
      setImportMap(nextImportMap);
    });
    compile();
  });

  let ref!: HTMLDivElement;

  const [reloadSignal] = createSignal(false, { equals: false });
  const [devtoolsOpen] = createSignal(!props.hideDevtools);
  const [displayErrors, setDisplayErrors] = createSignal(true);

  onMount(() => {
    const newFile = (name: string) => {
      if (!name.trim()) return;
      const newTab = {
        name: name,
        source: '',
      };
      batch(() => {
        props.setTabs(props.tabs.concat(newTab));
        props.setCurrent(newTab.name);
      });
      dockview.addPanel({
        id: name,
        tabComponent: 'file',
        component: 'editor',
        params: {
          currentModel: monacoTabs().get(`file:///${props.id}/${name}`)!.model,
        },
      });
    };

    const deleteFile = (name: string) => {
      if (name === 'main.tsx') return;
      const newTabs = props.tabs.filter((tab) => tab.name !== name);
      const panel = dockview.getGroupPanel(name);
      panel?.api.close();
      batch(() => {
        props.setTabs(newTabs);
        if (props.current === name) {
          const mainPanel = dockview.getGroupPanel('main.tsx');
          mainPanel?.focus();
          props.setCurrent('main.tsx');
        }
      });
    };

    const renameFile = (oldName: string, newName: string) => {
      if (oldName === 'main.tsx') return;
      if (newName === oldName) return;
      if (!newName.trim()) return;
      const exists = props.tabs.some((tab) => tab.name === newName);
      if (exists) {
        alert('A file with that name already exists');
        return;
      }

      const tab = props.tabs.find((t) => t.name === oldName);
      if (!tab) return;

      const newTabs = props.tabs.map((t) => (t.name === oldName ? { ...t, name: newName } : t));

      batch(() => {
        props.setTabs(newTabs);
        if (props.current === oldName) {
          props.setCurrent(newName);
        }
      });

      // Update Panel ID if it exists? Dockview often requires adding/removing for ID change.
      // Easiest is to close old and open new at same position or just let user re-open.
      // But we can try to keep it simple: if open, close and reopen.
      const panel = dockview.getGroupPanel(oldName);
      if (panel) {
        panel.api.close();
        dockview.addPanel({
          id: newName,
          tabComponent: 'file',
          component: 'editor',
          params: {
            currentModel: monacoTabs().get(`file:///${props.id}/${newName}`)!.model,
          },
        });
      }
    };

    const dockview = new DockviewComponent(ref, {
      theme: themeAbyssSpaced,
      defaultTabComponent: 'default',
      createLeftHeaderActionComponent: () => {
        const element = (<div class="h-full px-1 flex items-center"></div>) as HTMLDivElement;
        let disposer: () => void;

        return {
          element,
          init: (params) => {
            createRoot((dispose) => {
              disposer = dispose;

              insert(element, () => (
                <IconButton
                  icon={plus}
                  class="h-[28px]"
                  size="sm"
                  onClick={() => {
                    const panel = dockview.getPanel('newTab');
                    if (panel) {
                      panel.focus();
                    } else {
                      params.group.focus();
                      dockview.addPanel({
                        id: 'newTab',
                        title: 'New Tab',
                        tabComponent: 'default',
                        component: 'newTab',
                      });
                    }
                  }}
                  title="New Tab"
                >
                  <span class="sr-only">New tab</span>
                </IconButton>
              ));
            });
          },
          dispose: () => disposer?.(),
        };
      },
      createTabComponent: (panel) => {
        const element = (<div class="h-full pl-2 flex items-center"></div>) as HTMLDivElement;
        let disposer: () => void;

        return {
          element,
          init: (params) => {
            const [showMenu, setShowMenu] = createSignal(false);
            const [menuPos, setMenuPos] = createSignal({ x: 0, y: 0 });

            createRoot((dispose) => {
              disposer = dispose;
              const [panelTitle, setPanelTitle] = createSignal(params.title);
              params.api.onDidTitleChange((e) => {
                setPanelTitle(e.title);
              });
              const isFile = panel.name == 'file';
              let containerRef: HTMLDivElement | undefined;

              insert(element, () => (
                <div
                  ref={containerRef}
                  class="h-full space-x-2 group flex items-center"
                  onContextMenu={(e) => {
                    if (!isFile) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuPos({ x: e.clientX, y: e.clientY });
                    setShowMenu(true);
                  }}
                >
                  <span class="truncate text-sm">{panelTitle()}</span>

                  <button
                    class="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 ml-auto rounded-sm opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      if (e.defaultPrevented) return;
                      e.preventDefault();
                      params.api.close();
                    }}
                    title="Close tab"
                  >
                    <Icon path={xMark} class="h-3 w-3 text-neutral-500" />
                  </button>

                  <Show when={isFile && showMenu()}>
                    <Dismiss
                      open={() => true}
                      setOpen={(val) => {
                        if (!val) setShowMenu(false);
                      }}
                      show
                      menuButton={containerRef}
                    >
                      <Menu
                        style={{ top: `${menuPos().y}px`, left: `${menuPos().x}px` }}
                        onClose={() => setShowMenu(false)}
                      >
                        <MenuItem
                          label="Rename"
                          icon={pencil}
                          onClick={() => {
                            const newName = prompt('Rename file to:', panelTitle());
                            if (newName) renameFile(panelTitle(), newName);
                            setShowMenu(false);
                          }}
                        />
                        <MenuItem
                          label="Delete"
                          icon={trash}
                          variant="danger"
                          onClick={() => {
                            if (confirm(`Delete ${panelTitle()}?`)) {
                              deleteFile(panelTitle());
                            }
                            setShowMenu(false);
                          }}
                        />
                      </Menu>
                    </Dismiss>
                  </Show>
                </div>
              ));
            });

            const hide = () => setShowMenu(false);
            window.addEventListener('click', hide);
            onCleanup(() => window.removeEventListener('click', hide));
          },
          dispose: () => disposer?.(),
        };
      },
      createRightHeaderActionComponent: () => {
        const element = (<div class="h-full px-1 flex items-center justify-end"></div>) as HTMLDivElement;
        let disposer: () => void;

        return {
          element,
          init: (params) => {
            const [isTSX, setIsTSX] = createSignal(false);
            params.group.api.onDidActivePanelChange((e) => {
              if (!e) return;
              setIsTSX(e.panel.id.endsWith('.tsx'));
            });
            createRoot((dispose) => {
              disposer = dispose;

              insert(element, () => (
                <Show when={isTSX()}>
                  <IconButton
                    icon={trash}
                    class="h-[28px]"
                    size="sm"
                    onClick={() => {
                      const confirmReset = confirm('Are you sure you want to reset the editor?');
                      if (!confirmReset) return;
                      props.reset();
                    }}
                    title="Reset Editor"
                  >
                    <span class="sr-only">Reset Editor</span>
                  </IconButton>
                </Show>
              ));
            });
          },
          dispose: () => disposer?.(),
        };
      },
      createComponent(options) {
        const element = (<div class="h-full flex flex-col"></div>) as HTMLDivElement;
        let disposer: () => void;
        let onInit: ((params: GroupPanelPartInitParameters) => (() => void) | void) | undefined;

        let component: (
          params: GroupPanelPartInitParameters['params'],
          x: GroupPanelPartInitParameters,
        ) => JSX.Element = () => null;

        switch (options.name) {
          case 'newTab':
            component = (_, params) => (
              <NewTab
                tabs={props.tabs}
                onOpenPane={(id) => {
                  const panel = dockview.getGroupPanel(id);
                  if (panel) {
                    panel.focus();
                  } else {
                    dockview.addPanel({
                      id,
                      tabComponent: 'default',
                      component: id.toLowerCase(),
                      renderer: id === 'Preview' ? 'always' : undefined,
                    });
                  }
                }}
                onOpenFile={(name) => {
                  const panel = dockview.getGroupPanel(name);
                  if (panel) {
                    panel.focus();
                  } else {
                    dockview.addPanel({
                      id: name,
                      tabComponent: 'file',
                      component: 'editor',
                      params: {
                        currentModel: monacoTabs().get(`file:///${props.id}/${name}`)!.model,
                      },
                    });
                  }
                }}
                onNewFile={newFile}
                onUpload={(name: string, source: string) => {
                  const newTab = { name, source };
                  batch(() => {
                    props.setTabs(props.tabs.concat(newTab));
                    props.setCurrent(newTab.name);
                  });
                  setTimeout(() => {
                    dockview.addPanel({
                      id: name,
                      tabComponent: 'file',
                      component: 'editor',
                      params: {
                        currentModel: monacoTabs().get(`file:///${props.id}/${name}`)!.model,
                      },
                    });
                  });
                }}
                onDeleteFile={deleteFile}
                onRenameFile={renameFile}
                onClose={() => {
                  params.api.close();
                }}
              />
            );
            break;
          case 'editor':
            component = (params) => (
              <Editor
                model={params.currentModel}
                onDocChange={(code: string) => {
                  if (params.currentModel.uri.path.includes('import_map.json')) {
                    const newImportMap = JSON.parse(code);
                    setImportMap(newImportMap);
                  } else {
                    compile();
                  }
                }}
                onUserEdit={props.onUserEdit}
                formatter={formatter}
                linter={linter}
                isDark={props.dark}
                withMinimap={false}
                displayErrors={displayErrors()}
                setDisplayErrors={setDisplayErrors}
              />
            );
            break;
          case 'preview':
            setPreviewVisible(true);
            onCleanup(() => {
              setPreviewVisible(false);
            });
            const [previewIsActive, setPreviewIsActive] = createSignal(false);
            component = () => (
              <Preview
                importMap={importMap()}
                code={output()}
                reloadSignal={reloadSignal()}
                devtools={devtoolsOpen()}
                isDark={props.dark}
                pointerEvents={previewIsActive()}
              />
            );
            onInit = (params) => {
              setPreviewIsActive(params.api.isActive);
              const disposable = params.api.onDidActiveChange((e) => {
                setPreviewIsActive(e.isActive);
              });
              return () => disposable.dispose();
            };
            break;
          case 'output':
            setOutputVisible(true);
            onCleanup(() => {
              setOutputVisible(false);
            });
            component = () => (
              <section class="min-h-0 min-w-0 divide-y-1 divide-slate-200 dark:divide-neutral-800 relative flex flex-1 flex-col">
                <Editor model={outputModel} isDark={props.dark} disabled withMinimap={false} />

                <CompileMode
                  mode={mode()}
                  setMode={setMode}
                  universalModuleName={universalModuleName()}
                  setUniversalModuleName={setUniversalModuleName}
                />
              </section>
            );
            break;
        }

        let onInitDisposer: (() => void) | undefined;

        return {
          element,
          init: (params) => {
            const result = onInit?.(params);
            if (result) onInitDisposer = result;
            createRoot((dispose) => {
              insert(element, () => component(params.params, params));
              disposer = dispose;
            });
          },
          dispose: () => {
            onInitDisposer?.();
            disposer?.();
          },
        };
      },
    });

    dockview.fromJSON({
      grid: {
        root: {
          type: 'branch',
          data: [
            {
              type: 'leaf',
              data: { views: ['main.tsx'], activeView: 'main.tsx', id: '1' },
              size: 400,
            },
            {
              type: 'leaf',
              data: { views: ['Preview', 'Output'], activeView: 'Preview', id: '2' },
              size: 250,
            },
          ],
          size: 480,
        },
        width: 1600,
        height: 480,
        orientation: Orientation.HORIZONTAL,
      },
      activeGroup: '1',
      panels: {
        Output: {
          id: 'Output',
          tabComponent: 'default',
          contentComponent: 'output',
        },
        Preview: {
          id: 'Preview',
          contentComponent: 'preview',
          tabComponent: 'default',
          renderer: 'always',
        },
        [props.current!]: {
          id: props.current!,
          tabComponent: 'file',
          contentComponent: 'editor',
          params: {
            currentModel: currentModel(),
          },
        },
      },
    });

    dockview.onDidActivePanelChange((e) => {
      if (!e) return;
      if ('currentModel' in (e.params ?? {})) {
        props.setCurrent(e.id);
      }
    });
  });

  return (
    <div class="h-full min-h-0 text-black dark:text-white flex flex-1 flex-col overflow-hidden font-sans">
      <div ref={ref} class="min-h-0 flex flex-1 flex-col" />
      <Show when={error()}>
        <Error message={error()} onDismiss={() => setError('')} />
      </Show>
    </div>
  );
};
