import { createSignal, createEffect, createMemo, batch, onCleanup, onMount, Show, JSX } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { createMediaQuery } from '@solid-primitives/media';
import { Preview } from './preview';
import { Error } from './error';
import { MobileRepl } from './mobile';
import { throttle } from '@solid-primitives/scheduled';
import { createCodemirrorTabs } from './editor/codemirrorTabs';
import { useZoom } from '../hooks/useZoom';
import { NewTab } from './newTab';
import { CompileMode, compileOptions, type SolidCompileOptions } from './CompileMode';
import { IconButton } from './ui/IconButton';
import { useMenu } from './ui/Menu';
import { ReplContext, type ReplApi } from './replContext';
import { keyBindingsOf } from '../kernel/commands';
import { createWorkerClient, latest } from '../kernel/workerClient';
import { solidPart } from '../kernel/mountSolid';
import { createWorkspace } from '../kernel/workspace';
import {
  defaultUrl,
  parseImportMap,
  serializeImportMap,
  syncEntries,
  type ImportMapState,
} from '../kernel/importMap';
import { ImportMapPanel } from './importMapPanel';
import { createEditorCommands } from '../features/editorCommands';
import { fileMenuItems } from '../features/fileCommands';

import Editor, { OutputEditor } from './editor';
import type { Repl as ReplProps } from 'solid-repl/dist/repl';
import type { Tab } from 'solid-repl';
import {
  DockviewComponent,
  Orientation,
  GroupPanelPartInitParameters,
  IGroupHeaderProps,
  themeAbyssSpaced,
} from 'dockview-core';
import { Icon } from 'solid-heroicons';
import { arrowPath, plus, trash, xMark } from 'solid-heroicons/outline';
import { css } from 'styled-system/css';
import '../../node_modules/dockview-core/dist/styles/dockview.css';

const ENTRY_FILE = 'main.tsx';

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

const replBody = css({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minH: 0,
});

const headerActions = css({
  display: 'flex',
  alignItems: 'center',
  h: 'full',
  px: 1,
});
const tabBody = css({
  display: 'flex',
  alignItems: 'center',
  h: 'full',
  pl: 2,
});

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
  '& > * + *': {
    borderTopWidth: '1px',
    borderColor: 'slate.200',
    _dark: { borderColor: 'neutral.800' },
  },
});

export const Repl: ReplProps = (props) => {
  const compiler = createWorkerClient(props.compiler);
  const formatter = createWorkerClient(props.formatter);
  const linter = createWorkerClient(props.linter);
  onCleanup(() => {
    compiler.dispose();
    formatter.dispose();
    linter.dispose();
  });

  let now: number;

  const [error, setError] = createSignal('');
  const [output, setOutput] = createSignal<Record<string, string>>({});
  const [universalModuleName, setUniversalModuleName] = createSignal('solid-universal-module');
  const [mode, setMode] = createSignal<(typeof compileOptions)[keyof typeof compileOptions]>(compileOptions.DOM);

  const userTabs = () => props.tabs.filter((tab) => tab.name != 'import_map.json');

  const [outputVisible, setOutputVisible] = createSignal(false);
  const [previewVisible, setPreviewVisible] = createSignal(false);
  const [previewRefreshKey, setPreviewRefreshKey] = createSignal(0);
  const refreshPreview = () => setPreviewRefreshKey((key) => key + 1);
  const importMap = createMemo(
    () => parseImportMap(props.tabs.find((tab) => tab.name === 'import_map.json')?.source),
    undefined,
    {
      equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    },
  );

  const writeImportMap = (state: ImportMapState) => {
    const source = serializeImportMap(state);
    const tab = props.tabs.find((tab) => tab.name === 'import_map.json');
    if (!tab) {
      props.setTabs(props.tabs.concat({ name: 'import_map.json', source }));
    } else if (tab.source !== source) {
      tab.source = source;
      props.setTabs(props.tabs.slice());
    }
  };

  const [displayErrors, setDisplayErrors] = createSignal(true);
  const { zoomState } = useZoom();

  const workspace = createWorkspace({
    tabs: () => props.tabs,
    setTabs: props.setTabs,
    folder: () => props.id,
    entry: ENTRY_FILE,
  });

  const [activeFileId, setActiveFileId] = createSignal<string | undefined>();

  const commands = createEditorCommands({
    activeView: () => {
      const id = activeFileId();
      return id ? cmTabs.getView(id) : undefined;
    },
    activeFileId,
    format: (id) => cmTabs.format(id),
    fix: (id) => cmTabs.fix(id),
    displayErrors,
    setDisplayErrors,
  });

  const cmTabs = createCodemirrorTabs(props.id, {
    workspace,
    isDark: () => !!props.dark,
    fontSize: () => zoomState.fontSize,
    displayErrors,
    eslintEnabled: () => !props.version || parseInt(props.version, 10) < 2,
    formatter,
    linter,
    keyBindings: keyBindingsOf(commands),
    onUserEdit: () => props.onUserEdit?.(),
    onDocChange: (fileId, source) => {
      const file = workspace.byId(fileId);
      if (!file || file.source === source) return;
      const tab = props.tabs.find((t) => t.name === file.name);
      if (tab) tab.source = source;
      compile();
    },
    loadEditorState: (fileId) => props.storage?.getEditorState?.(fileId),
    saveEditorState: (fileId, state) => props.storage?.setEditorState?.(fileId, state),
  });

  createEffect(() => {
    void props.version;
    cmTabs.refreshDiagnostics();
  });

  const activeName = () => {
    const id = activeFileId();
    return id ? workspace.nameOf(id) : undefined;
  };

  const editPackages = (edit: (state: ImportMapState) => ImportMapState) => {
    props.onUserEdit?.();
    writeImportMap(edit(importMap()));
  };

  const api: ReplApi = {
    tabs: () => props.tabs,
    setTabs: props.setTabs,
    workspace,
    importMap,
    setPackageUrl: (name, url) =>
      editPackages(({ imports, pinned }) => ({
        imports: { ...imports, [name]: url },
        pinned: pinned.includes(name) ? pinned : pinned.concat(name),
      })),
    addPackage: (name) =>
      editPackages(({ imports, pinned }) => ({
        imports: { ...imports, [name]: defaultUrl(name) },
        pinned: pinned.concat(name),
      })),
    removePackage: (name) =>
      editPackages(({ imports, pinned }) => {
        const { [name]: _, ...rest } = imports;
        return { imports: rest, pinned: pinned.filter((pkg) => pkg !== name) };
      }),
    current: activeFileId,
    currentName: activeName,
    reset: () => props.reset(),
    onUserEdit: props.onUserEdit,
    isDark: () => !!props.dark,
    fontSize: () => zoomState.fontSize,
    displayErrors,
    setDisplayErrors,
    compiler,
    formatter,
    linter,
    commands,
    editors: cmTabs,
    folder: props.id,
  };

  interface RollupResult {
    compiled: Record<string, string>;
    externals: string[];
  }

  let syncedExternals: string | undefined;
  const applyRollupResult = ({ compiled, externals }: RollupResult) => {
    console.log(`Compilation took: ${performance.now() - now}ms`);
    const state = importMap();
    const key = [...externals].sort().join(',');
    batch(() => {
      setOutput(compiled);
      if (key !== syncedExternals || externals.some((specifier) => !(specifier in state.imports))) {
        syncedExternals = key;
        writeImportMap(syncEntries(state, externals));
      }
    });
  };

  const requestRollup = latest((tabs: Tab[]) =>
    compiler.request<RollupResult>('ROLLUP', { tabs, version: props.version }),
  );
  const requestBabel = latest((tab: Tab, compileOpts: SolidCompileOptions) =>
    compiler.request<{ compiled: string }>('BABEL', { tab, compileOpts, version: props.version }),
  );

  const onCompileFailed = (e: unknown) => {
    console.error(e);
    setError(e instanceof globalThis.Error ? e.message : String(e));
  };

  const applyRollupCompilation = throttle(async (tabs: Tab[]) => {
    now = performance.now();
    try {
      const result = await requestRollup(tabs);
      if (!result) return;
      setError('');
      applyRollupResult(result);
    } catch (e) {
      onCompileFailed(e);
    }
  }, 250);

  const applyBabelCompilation = throttle(async (tab: Tab, compileOpts: SolidCompileOptions) => {
    now = performance.now();
    try {
      const result = await requestBabel(tab, compileOpts);
      if (!result) return;
      setError('');
      cmTabs.ensureOutputView().setDoc(result.compiled);
    } catch (e) {
      onCompileFailed(e);
    }
  }, 250);

  const compile = () => {
    if (previewVisible()) {
      applyRollupCompilation(unwrap(userTabs()));
    }
    const active = activeName();
    if (outputVisible() && active?.endsWith('.tsx')) {
      let compileOpts: SolidCompileOptions = mode();
      if (compileOpts === compileOptions.UNIVERSAL) {
        compileOpts = {
          generate: 'universal',
          hydratable: false,
          moduleName: universalModuleName(),
        };
      }
      applyBabelCompilation(unwrap(props.tabs.find((tab) => tab.name == active))!, compileOpts);
    }
  };

  createEffect(() => {
    void props.version;
    if (!props.tabs.length) return;
    compile();
  });

  createEffect(() => cmTabs.syncTypes(importMap().imports));

  const isMobile = createMediaQuery('(max-width: 767px)');

  const previewSection = (interactive: () => boolean) => (
    <Preview
      importMap={importMap().imports}
      code={output()}
      devtools={!props.hideDevtools}
      isDark={props.dark}
      pointerEvents={interactive()}
      refreshKey={previewRefreshKey()}
    />
  );

  const outputSection = () => (
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

  const entryFileId = () => workspace.byName(ENTRY_FILE)?.id ?? workspace.files()[0]?.id;

  const DesktopRepl = () => {
    let ref!: HTMLDivElement;

    onMount(() => {
      const openFile = (fileId: string) => {
        const panel = dockview.getGroupPanel(fileId);
        if (panel) {
          panel.focus();
          return;
        }
        dockview.addPanel({
          id: fileId,
          title: workspace.nameOf(fileId),
          tabComponent: 'file',
          component: 'editor',
        });
      };

      const newFile = (name: string) => {
        const file = workspace.create(name);
        if (file) openFile(file.id);
      };

      createEffect(() => {
        const live = new Set(workspace.files().map((f) => f.id));
        for (const panel of [...dockview.panels]) {
          if (panel.view?.contentComponent !== 'editor') continue;
          if (!live.has(panel.id)) panel.api.close();
        }
      });

      const dockview = new DockviewComponent(ref, {
        theme: themeAbyssSpaced,
        defaultTabComponent: 'default',
        createLeftHeaderActionComponent: () =>
          solidPart<IGroupHeaderProps>(headerActions, (params) => (
            <IconButton
              icon={plus}
              class={css({ h: '28px' })}
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
          )),
        createTabComponent: (panel) =>
          solidPart<GroupPanelPartInitParameters>(tabBody, (params) => {
            const isFile = panel.name == 'file';
            const fileId = params.api.id;

            const [panelTitle, setPanelTitle] = createSignal(params.title);
            params.api.onDidTitleChange((e) => setPanelTitle(e.title));

            if (isFile) {
              createEffect(() => {
                const name = workspace.nameOf(fileId);
                if (name && name !== params.api.title) params.api.setTitle(name);
              });
            }

            const label = () => (isFile ? (workspace.nameOf(fileId) ?? panelTitle()) : panelTitle());

            const items = () => fileMenuItems(workspace, fileId);
            const { Content, openAt } = useMenu(items);

            return (
              <div
                class={tabLayout}
                onContextMenu={(e) => {
                  if (!isFile || items().length === 0) return;
                  e.preventDefault();
                  e.stopPropagation();
                  openAt(e.clientX, e.clientY);
                }}
              >
                <span
                  class={css({
                    fontSize: 'sm',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {label()}
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
            );
          }),
        createRightHeaderActionComponent: () => {
          const [activePanel, setActivePanel] = createSignal<string>();
          const isTSX = () => {
            const id = activePanel();
            return !!id && !!workspace.nameOf(id)?.endsWith('.tsx');
          };

          return solidPart<IGroupHeaderProps>(
            `${headerActions} ${css({ justifyContent: 'flex-end' })}`,
            () => (
              <>
                <Show when={activePanel() === 'Preview'}>
                  <IconButton
                    icon={arrowPath}
                    class={css({ h: '28px' })}
                    onClick={refreshPreview}
                    title="Refresh preview"
                  >
                    <span class={css({ srOnly: true })}>Refresh preview</span>
                  </IconButton>
                </Show>
                <Show when={isTSX()}>
                  <IconButton
                    icon={trash}
                    class={css({ h: '28px' })}
                    onClick={() => {
                      if (!confirm('Are you sure you want to reset the editor?')) return;
                      props.reset();
                    }}
                    title="Reset Editor"
                  >
                    <span class={css({ srOnly: true })}>Reset Editor</span>
                  </IconButton>
                </Show>
              </>
            ),
            (params) => {
              setActivePanel(params.group.activePanel?.id);
              const disposable = params.group.api.onDidActivePanelChange((e) => {
                setActivePanel(e?.panel.id);
              });
              return () => disposable.dispose();
            },
          );
        },
        createComponent(options) {
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
                    const file = workspace.byName(name);
                    if (file) openFile(file.id);
                  }}
                  onNewFile={newFile}
                  onUpload={(name: string, source: string) => {
                    const file = workspace.create(name, source);
                    if (file) setTimeout(() => openFile(file.id));
                  }}
                  onDeleteFile={(name) => {
                    const file = workspace.byName(name);
                    if (file) workspace.remove(file.id);
                  }}
                  onRenameFile={(oldName, newName) => {
                    const file = workspace.byName(oldName);
                    if (file) workspace.rename(file.id, newName);
                  }}
                  onClose={() => params.api.close()}
                />
              );
              break;
            case 'editor':
              component = (_, params) =>
                workspace.nameOf(params.api.id) === 'import_map.json' ? (
                  <ImportMapPanel />
                ) : (
                  <Editor fileId={params.api.id} />
                );
              break;
            case 'preview':
              setPreviewVisible(true);
              onCleanup(() => setPreviewVisible(false));
              const [previewIsActive, setPreviewIsActive] = createSignal(false);
              component = () => previewSection(previewIsActive);
              onInit = (params) => {
                setPreviewIsActive(params.api.isActive);
                const disposable = params.api.onDidActiveChange((e) => setPreviewIsActive(e.isActive));
                return () => disposable.dispose();
              };
              break;
            case 'output':
              setOutputVisible(true);
              onCleanup(() => setOutputVisible(false));
              component = outputSection;
              break;
          }

          return solidPart<GroupPanelPartInitParameters>(
            css({ display: 'flex', flexDirection: 'column', h: 'full' }),
            (params) => <ReplContext.Provider value={api}>{component(params.params, params)}</ReplContext.Provider>,
            onInit,
          );
        },
      });

      const entryId = workspace.byName(ENTRY_FILE)?.id ?? workspace.files()[0]?.id ?? ENTRY_FILE;

      const defaultLayout = {
        grid: {
          root: {
            type: 'branch' as const,
            data: [
              {
                type: 'leaf' as const,
                data: { views: [entryId], activeView: entryId, id: '1' },
                size: 400,
              },
              {
                type: 'leaf' as const,
                data: {
                  views: ['Preview', 'Output'],
                  activeView: 'Preview',
                  id: '2',
                },
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
            renderer: 'always' as const,
          },
          [entryId]: {
            id: entryId,
            title: workspace.nameOf(entryId) ?? ENTRY_FILE,
            tabComponent: 'file',
            contentComponent: 'editor',
          },
        },
      };

      let restored = false;
      const stored = props.storage?.getLayout?.();
      if (stored) {
        try {
          const validIds = new Set(
            workspace
              .files()
              .map((f) => f.id)
              .concat(['Output', 'Preview']),
          );
          for (const id in stored.panels) {
            if (!validIds.has(id)) delete stored.panels[id];
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
        if (workspace.byId(e.panel.id)) setActiveFileId(e.panel.id);
      });
    });

    return <div ref={ref} class={replBody} />;
  };

  return (
    <ReplContext.Provider value={api}>
      <div class={replHost}>
        <Show when={isMobile()} fallback={<DesktopRepl />}>
          <MobileRepl
            initialViews={[entryFileId(), 'Preview'].filter((id): id is string => !!id)}
            preview={previewSection}
            outputPane={outputSection}
            onPreviewOpen={setPreviewVisible}
            onOutputOpen={setOutputVisible}
            onActiveFile={setActiveFileId}
            onRefreshPreview={refreshPreview}
          />
        </Show>
        <Show when={error()}>
          <Error message={error()} onDismiss={() => setError('')} />
        </Show>
      </div>
    </ReplContext.Provider>
  );
};
