import { createSignal, createEffect, batch, onCleanup, onMount, Show, JSX } from 'solid-js';
import { createMediaQuery } from '@solid-primitives/media';
import { throttle } from '@solid-primitives/scheduled';
import { Preview } from './preview';
import { Error } from './error';
import { MobileRepl } from './mobile';
import { createCodemirrorTabs } from './editor/codemirrorTabs';
import { useZoom } from '../hooks/useZoom';
import { NewTab } from './newTab';
import { CompileMode, compileOptions, type CompileModeOption, type SolidCompileOptions } from './CompileMode';
import { IconButton } from './ui/IconButton';
import { useMenu } from './ui/Menu';
import { ReplContext, type ReplApi } from './replContext';
import { keyBindingsOf } from '../kernel/commands';
import { createWorkerClient, latest } from '../kernel/workerClient';
import { solidPart } from '../kernel/mountSolid';
import { createWorkspace } from '../kernel/workspace';
import { createImportMap, IMPORT_MAP_FILE, isSolidV2 } from '../kernel/importMap';
import { createEditorCommands } from '../features/editorCommands';
import { fileMenuItems } from '../features/fileCommands';

import { FilePanel, OutputEditor } from './editor';
import type { Repl as ReplProps } from 'solid-repl/dist/repl';
import type { Tab } from 'solid-repl';
import {
  DockviewComponent,
  Orientation,
  type AddPanelOptions,
  type GroupPanelPartInitParameters,
  type IGroupHeaderProps,
  themeAbyssSpaced,
} from 'dockview';
import { Icon } from 'solid-heroicons';
import { plus, trash, xMark } from 'solid-heroicons/outline';
import { css } from 'styled-system/css';
import 'dockview/dist/styles/dockview.css';

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

interface RollupResult {
  compiled: Record<string, string>;
  externals: string[];
}

export const Repl: ReplProps = (props) => {
  const compiler = createWorkerClient(props.compiler);
  const formatter = createWorkerClient(props.formatter);
  const linter = createWorkerClient(props.linter);
  onCleanup(() => {
    compiler.dispose();
    formatter.dispose();
    linter.dispose();
  });

  const [error, setError] = createSignal('');
  const [output, setOutput] = createSignal<Record<string, string>>(
    {},
    { equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );
  const [universalModuleName, setUniversalModuleName] = createSignal('solid-universal-module');
  const [mode, setMode] = createSignal<CompileModeOption>(compileOptions.DOM);
  const [outputVisible, setOutputVisible] = createSignal(false);
  const [previewVisible, setPreviewVisible] = createSignal(false);
  const [displayErrors, setDisplayErrors] = createSignal(true);
  const [activeFileId, setActiveFileId] = createSignal<string | undefined>();
  const { zoomState } = useZoom();

  const importMap = createImportMap({
    tabs: () => props.tabs,
    setTabs: props.setTabs,
    version: () => props.version,
    onEdit: () => props.onUserEdit?.(),
  });

  const workspace = createWorkspace({
    tabs: () => props.tabs,
    setTabs: props.setTabs,
    folder: () => props.id,
    entry: ENTRY_FILE,
  });

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
    solidV2: () => isSolidV2(props.version),
    formatter,
    linter,
    keyBindings: keyBindingsOf(commands),
    onUserEdit: () => props.onUserEdit?.(),
    loadEditorState: (fileId) => props.storage?.getEditorState?.(fileId),
    saveEditorState: (fileId, state) => props.storage?.setEditorState?.(fileId, state),
  });

  const activeName = () => {
    const id = activeFileId();
    return id ? workspace.nameOf(id) : undefined;
  };

  const api: ReplApi = { workspace, importMap, commands, editors: cmTabs };

  const onCompileFailed = (e: unknown) => {
    console.error(e);
    setError(e instanceof globalThis.Error ? e.message : String(e));
  };

  const requestRollup = latest((tabs: Tab[]) =>
    compiler.request<RollupResult>('ROLLUP', { tabs, version: props.version }),
  );
  const requestBabel = latest((tab: Tab, compileOpts: SolidCompileOptions) =>
    compiler.request<{ compiled: string }>('BABEL', { tab, compileOpts, version: props.version }),
  );

  const compilePreview = throttle(async (tabs: Tab[]) => {
    const started = performance.now();
    try {
      const result = await requestRollup(tabs);
      if (!result) return;
      console.log(`Compilation took: ${performance.now() - started}ms`);
      batch(() => {
        setError('');
        setOutput(result.compiled);
        importMap.syncExternals(result.externals);
      });
    } catch (e) {
      onCompileFailed(e);
    }
  }, 250);

  const compileOutput = throttle(async (tab: Tab, compileOpts: SolidCompileOptions) => {
    try {
      const result = await requestBabel(tab, compileOpts);
      if (!result) return;
      setError('');
      cmTabs.ensureOutputView().setDoc(result.compiled);
    } catch (e) {
      onCompileFailed(e);
    }
  }, 250);

  createEffect(() => {
    void props.version;
    const tabs = props.tabs.filter((tab) => tab.name !== IMPORT_MAP_FILE);
    if (previewVisible() && tabs.length) compilePreview(tabs);
  });

  createEffect(() => {
    void props.version;
    const active = activeName();
    if (!outputVisible() || !active || !/\.[tj]sx$/.test(active)) return;
    const tab = props.tabs.find((tab) => tab.name === active);
    if (!tab) return;
    const current = mode();
    compileOutput(
      tab,
      current === compileOptions.UNIVERSAL ? { ...current, moduleName: universalModuleName() } : current,
    );
  });

  createEffect(() => cmTabs.syncTypes(importMap.state().imports));

  const isMobile = createMediaQuery('(max-width: 767px)');

  const previewSection = (interactive: () => boolean) => (
    <Preview
      importMap={importMap.state().imports}
      code={output()}
      devtools={!props.hideDevtools}
      isDark={props.dark}
      pointerEvents={interactive()}
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
      const openPanel = (options: AddPanelOptions) => {
        const panel = dockview.getGroupPanel(options.id);
        if (panel) panel.focus();
        else dockview.addPanel(options);
      };
      const openFile = (fileId: string) =>
        openPanel({ id: fileId, title: workspace.nameOf(fileId), tabComponent: 'file', component: 'editor' });
      const openPane = (id: string) =>
        openPanel({
          id,
          tabComponent: 'default',
          component: id.toLowerCase(),
          renderer: id === 'Preview' ? 'always' : undefined,
        });
      const open = (id: string) => (workspace.byId(id) ? openFile(id) : openPane(id));

      createEffect(() => {
        const live = new Set(workspace.files().map((f) => f.id));
        for (const panel of dockview.panels) {
          if (panel.view?.contentComponent === 'editor' && !live.has(panel.id)) panel.api.close();
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
                params.group.focus();
                openPanel({ id: 'newTab', title: 'New Tab', tabComponent: 'default', component: 'newTab' });
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
            const label = () => (isFile ? workspace.nameOf(fileId) : undefined) ?? params.title;

            if (isFile) {
              createEffect(() => {
                const name = workspace.nameOf(fileId);
                if (name && name !== params.api.title) params.api.setTitle(name);
              });
            }

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
          const [isTSX, setIsTSX] = createSignal(false);

          return solidPart<IGroupHeaderProps>(
            `${headerActions} ${css({ justifyContent: 'flex-end' })}`,
            () => (
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
            ),
            (params) => {
              const disposable = params.group.api.onDidActivePanelChange((e) => {
                if (!e) return;
                setIsTSX(/\.[tj]sx$/.test(e.panel.id));
              });
              return () => disposable.dispose();
            },
          );
        },
        createComponent(options) {
          let onInit: ((params: GroupPanelPartInitParameters) => (() => void) | void) | undefined;
          let component: (params: GroupPanelPartInitParameters) => JSX.Element = () => null;

          switch (options.name) {
            case 'newTab':
              component = (params) => <NewTab onOpen={open} onClose={() => params.api.close()} />;
              break;
            case 'editor':
              component = (params) => <FilePanel fileId={params.api.id} />;
              break;
            case 'preview': {
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
            }
            case 'output':
              setOutputVisible(true);
              onCleanup(() => setOutputVisible(false));
              component = outputSection;
              break;
          }

          return solidPart<GroupPanelPartInitParameters>(
            css({ display: 'flex', flexDirection: 'column', h: 'full' }),
            (params) => <ReplContext.Provider value={api}>{component(params)}</ReplContext.Provider>,
            onInit,
          );
        },
      });

      const entryId = entryFileId() ?? ENTRY_FILE;

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
          orientation: props.vertical ? Orientation.VERTICAL : Orientation.HORIZONTAL,
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
        if (e.panel && workspace.byId(e.panel.id)) setActiveFileId(e.panel.id);
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
          />
        </Show>
        <Show when={error()}>
          <Error message={error()} onDismiss={() => setError('')} />
        </Show>
      </div>
    </ReplContext.Provider>
  );
};
