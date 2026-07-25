import { createSignal, createEffect, batch, onCleanup, onMount, Show, createRoot, JSX } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { Preview } from './preview';
import { Error } from './error';
import { throttle } from '@solid-primitives/scheduled';
import { createCodemirrorTabs } from './editor/codemirrorTabs';
import { useZoom } from '../hooks/useZoom';
import { NewTab } from './newTab';
import { CompileMode, compileOptions } from './CompileMode';
import { IconButton } from './ui/IconButton';
import { useMenu } from './ui/Menu';
import { ReplContext, type ReplApi } from './replContext';

import Editor, { OutputEditor } from './editor';
import type { Repl as ReplProps } from 'solid-repl/dist/repl';
import type { Tab } from 'solid-repl';
import { DockviewComponent, Orientation, GroupPanelPartInitParameters, themeAbyssSpaced } from 'dockview-core';
import { insert } from 'solid-js/web';
import { Icon } from 'solid-heroicons';
import { plus, trash, pencil, xMark } from 'solid-heroicons/outline';
import { css } from 'styled-system/css';
import '../../node_modules/dockview-core/dist/styles/dockview.css';

const getImportMap = (tabs: Tab[]): Record<string, string> => {
  try {
    const rawImportMap = tabs.find((tab) => tab.name === 'import_map.json');
    return JSON.parse(rawImportMap?.source ?? '{}');
  } catch {
    return {};
  }
};

const replHost = css({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minH: 0,
  h: 'full',
  overflow: 'clip',
  fontFamily: 'sans',
  color: 'black',
  _dark: { color: 'white' },
});

const replBody = css({ display: 'flex', flex: 1, flexDirection: 'column', minH: 0 });

const headerActions = css({ display: 'flex', alignItems: 'center', h: 'full', px: 1 });
const tabBody = css({ display: 'flex', alignItems: 'center', h: 'full', pl: 2 });

const tabLayout = css({
  'display': 'flex',
  'alignItems': 'center',
  'h': 'full',
  'gap': 2,
  '& .tab-close': { opacity: 0, transition: 'opacity 0.15s' },
  '_hover': { '& .tab-close': { opacity: 1 } },
});

const tabClose = css({
  ml: 'auto',
  p: 0.5,
  rounded: 'sm',
  _hover: { bg: 'neutral.200' },
  _dark: { _hover: { bg: 'neutral.700' } },
});

const outputPane = css({
  'position': 'relative',
  'display': 'flex',
  'flex': 1,
  'flexDirection': 'column',
  'minH': 0,
  'minW': 0,
  '& > * + *': { borderTopWidth: '1px', borderColor: 'slate.200', _dark: { borderColor: 'neutral.800' } },
});

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

  const [displayErrors, setDisplayErrors] = createSignal(true);
  const { zoomState } = useZoom();

  const cmTabs = createCodemirrorTabs(props.id, () => props.tabs, {
    isDark: () => !!props.dark,
    fontSize: () => zoomState.fontSize,
    displayErrors,
    formatter,
    linter,
    onUserEdit: () => props.onUserEdit?.(),
    onDocChange: (_uri, tab) => {
      if (tab.name === 'import_map.json') {
        try {
          setImportMap(JSON.parse(tab.source));
        } catch {}
      } else {
        compile();
      }
    },
    loadEditorState: (uri) => props.storage?.getEditorState?.(uri),
    saveEditorState: (uri, state) => props.storage?.setEditorState?.(uri, state),
  });

  const [activeName, setActiveName] = createSignal<string | undefined>();

  const api: ReplApi = {
    tabs: () => props.tabs,
    setTabs: props.setTabs,
    current: activeName,
    reset: () => props.reset(),
    onUserEdit: props.onUserEdit,
    isDark: () => !!props.dark,
    fontSize: () => zoomState.fontSize,
    displayErrors,
    setDisplayErrors,
    compiler,
    formatter,
    linter,
    editors: cmTabs,
    folder: props.id,
    uriFor: (name) => `file:///${props.id}/${name}`,
  };

  const onCompilerMessage = ({ data }: any) => {
    const { event, compiled, externals, error } = data;
    if (event === 'ERROR') {
      console.error(error);
      return setError(error.message);
    } else setError('');

    if (event === 'BABEL') {
      cmTabs.ensureOutputView().setDoc(compiled);
    }

    if (event === 'ROLLUP') {
      const currentMap = { ...importMap() };
      for (const file in currentMap) {
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
        let tab = props.tabs.find((tab) => tab.name === 'import_map.json');
        if (!tab) {
          tab = {
            name: 'import_map.json',
            source: JSON.stringify(currentMap, null, 2),
          };
          props.setTabs(props.tabs.concat(tab));
        } else {
          tab.source = JSON.stringify(currentMap, null, 2);
          cmTabs.setSource(`file:///${props.id}/import_map.json`, tab.source);
        }

        setOutput(compiled);
        setImportMap(currentMap);
      });
    }
  };
  compiler.addEventListener('message', onCompilerMessage);
  onCleanup(() => compiler.removeEventListener('message', onCompilerMessage));

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
      });
    }
    const active = activeName();
    if (outputVisible() && active?.endsWith('.tsx')) {
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
        tab: unwrap(props.tabs.find((tab) => tab.name == active)),
        compileOpts,
      });
    }
  };

  createEffect(() => {
    if (!props.tabs.length) return;
    compile();
  });

  let ref!: HTMLDivElement;

  onMount(() => {
    const newFile = (name: string) => {
      if (!name.trim()) return;
      props.setTabs(props.tabs.concat({ name, source: '' }));
      dockview.addPanel({
        id: name,
        tabComponent: 'file',
        component: 'editor',
      });
    };

    const deleteFile = (name: string) => {
      if (name === 'main.tsx') return;
      dockview.getGroupPanel(name)?.api.close();
      props.setTabs(props.tabs.filter((tab) => tab.name !== name));
      if (activeName() === name) dockview.getGroupPanel('main.tsx')?.focus();
    };

    const renameFile = (oldName: string, newName: string) => {
      if (oldName === 'main.tsx') return;
      if (newName === oldName) return;
      if (!newName.trim()) return;
      if (props.tabs.some((tab) => tab.name === newName)) {
        alert('A file with that name already exists');
        return;
      }

      const tab = props.tabs.find((t) => t.name === oldName);
      if (!tab) return;

      props.setTabs(props.tabs.map((t) => (t.name === oldName ? { ...t, name: newName } : t)));

      const panel = dockview.getGroupPanel(oldName);
      if (panel) {
        panel.api.close();
        dockview.addPanel({
          id: newName,
          tabComponent: 'file',
          component: 'editor',
        });
      }
    };

    const dockview = new DockviewComponent(ref, {
      theme: themeAbyssSpaced,
      defaultTabComponent: 'default',
      createLeftHeaderActionComponent: () => {
        const element = (<div class={headerActions} />) as HTMLDivElement;
        let disposer: () => void;

        return {
          element,
          init: (params) => {
            createRoot((dispose) => {
              disposer = dispose;
              insert(element, () => (
                <IconButton
                  icon={plus}
                  class={css({ h: '28px' })}
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
                  <span class={css({ srOnly: true })}>New tab</span>
                </IconButton>
              ));
            });
          },
          dispose: () => disposer?.(),
        };
      },
      createTabComponent: (panel) => {
        const element = (<div class={tabBody} />) as HTMLDivElement;
        let disposer: () => void;

        return {
          element,
          init: (params) => {
            createRoot((dispose) => {
              disposer = dispose;
              const [panelTitle, setPanelTitle] = createSignal(params.title);
              params.api.onDidTitleChange((e) => setPanelTitle(e.title));
              const isFile = panel.name == 'file';

              const { Content, openAt } = useMenu(() => [
                {
                  value: 'rename',
                  label: 'Rename',
                  icon: pencil,
                  onSelect: () => {
                    const newName = prompt('Rename file to:', panelTitle());
                    if (newName) renameFile(panelTitle(), newName);
                  },
                },
                {
                  value: 'delete',
                  label: 'Delete',
                  icon: trash,
                  variant: 'danger',
                  onSelect: () => {
                    if (confirm(`Delete ${panelTitle()}?`)) deleteFile(panelTitle());
                  },
                },
              ]);

              insert(element, () => (
                <div
                  class={tabLayout}
                  onContextMenu={(e) => {
                    if (!isFile) return;
                    e.preventDefault();
                    e.stopPropagation();
                    openAt(e.clientX, e.clientY);
                  }}
                >
                  <span
                    class={css({ fontSize: 'sm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}
                  >
                    {panelTitle()}
                  </span>
                  <button
                    class={`tab-close ${tabClose}`}
                    onClick={(e) => {
                      if (e.defaultPrevented) return;
                      e.preventDefault();
                      params.api.close();
                    }}
                    title="Close tab"
                  >
                    <Icon path={xMark} class={css({ h: 3, w: 3, color: 'neutral.500' })} />
                  </button>
                  <Content portal />
                </div>
              ));
            });
          },
          dispose: () => disposer?.(),
        };
      },
      createRightHeaderActionComponent: () => {
        const element = (<div class={`${headerActions} ${css({ justifyContent: 'flex-end' })}`} />) as HTMLDivElement;
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
                    class={css({ h: '28px' })}
                    size="sm"
                    onClick={() => {
                      if (!confirm('Are you sure you want to reset the editor?')) return;
                      props.reset();
                    }}
                    title="Reset Editor"
                  >
                    <span class={css({ srOnly: true })}>Reset Editor</span>
                  </IconButton>
                </Show>
              ));
            });
          },
          dispose: () => disposer?.(),
        };
      },
      createComponent(options) {
        const element = (
          <div class={css({ display: 'flex', flexDirection: 'column', h: 'full' })} />
        ) as HTMLDivElement;
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
                    });
                  }
                }}
                onNewFile={newFile}
                onUpload={(name: string, source: string) => {
                  props.setTabs(props.tabs.concat({ name, source }));
                  setTimeout(() => {
                    dockview.addPanel({
                      id: name,
                      tabComponent: 'file',
                      component: 'editor',
                    });
                  });
                }}
                onDeleteFile={deleteFile}
                onRenameFile={renameFile}
                onClose={() => params.api.close()}
              />
            );
            break;
          case 'editor':
            component = (_, params) => <Editor name={params.api.id} />;
            break;
          case 'preview':
            setPreviewVisible(true);
            onCleanup(() => setPreviewVisible(false));
            const [previewIsActive, setPreviewIsActive] = createSignal(false);
            component = () => (
              <Preview
                importMap={importMap()}
                code={output()}
                devtools={!props.hideDevtools}
                isDark={props.dark}
                pointerEvents={previewIsActive()}
              />
            );
            onInit = (params) => {
              setPreviewIsActive(params.api.isActive);
              const disposable = params.api.onDidActiveChange((e) => setPreviewIsActive(e.isActive));
              return () => disposable.dispose();
            };
            break;
          case 'output':
            setOutputVisible(true);
            onCleanup(() => setOutputVisible(false));
            component = () => (
              <section class={outputPane}>
                <OutputEditor />
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
              insert(element, () => (
                <ReplContext.Provider value={api}>{component(params.params, params)}</ReplContext.Provider>
              ));
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

    const defaultLayout = {
      grid: {
        root: {
          type: 'branch' as const,
          data: [
            {
              type: 'leaf' as const,
              data: { views: ['main.tsx'], activeView: 'main.tsx', id: '1' },
              size: 400,
            },
            {
              type: 'leaf' as const,
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
        'Output': { id: 'Output', tabComponent: 'default', contentComponent: 'output' },
        'Preview': {
          id: 'Preview',
          contentComponent: 'preview',
          tabComponent: 'default',
          renderer: 'always' as const,
        },
        'main.tsx': {
          id: 'main.tsx',
          tabComponent: 'file',
          contentComponent: 'editor',
        },
      },
    };

    let restored = false;
    const stored = props.storage?.getLayout?.();
    if (stored) {
      try {
        const validNames = new Set(props.tabs.map((t) => t.name).concat(['Output', 'Preview']));
        for (const id in stored.panels) {
          if (!validNames.has(id)) delete stored.panels[id];
        }
        dockview.fromJSON(stored);
        restored = dockview.panels.length > 0;
      } catch {}
    }
    if (!restored) dockview.fromJSON(defaultLayout);

    if (props.storage?.setLayout) {
      const saveLayout = throttle(() => props.storage!.setLayout!(dockview.toJSON()), 300);
      const layoutDisp = dockview.onDidLayoutChange(saveLayout);
      onCleanup(() => layoutDisp.dispose());
    }

    dockview.onDidActivePanelChange((e) => {
      if (!e.panel) return;
      if (props.tabs.some((tab) => tab.name === e.panel!.id)) {
        setActiveName(e.panel.id);
      }
    });
  });

  return (
    <ReplContext.Provider value={api}>
      <div class={replHost}>
        <div ref={ref} class={replBody} />
        <Show when={error()}>
          <Error message={error()} onDismiss={() => setError('')} />
        </Show>
      </div>
    </ReplContext.Provider>
  );
};
