import { createSignal, createEffect, getOwner, onSettled, runWithOwner, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { createMediaQuery } from '@solid-primitives/media';
import { throttle } from '@solid-primitives/scheduled';
import { Preview } from './preview';
import { ErrorBanner } from './errorBanner';
import { createMobileViews, MobileRepl } from './mobile';
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
import { resolveSolidVersion } from '../kernel/solidVersion';
import { createEditorCommands } from '../features/editorCommands';
import { fileMenuItems } from '../features/fileCommands';

import { FilePanel, OutputEditor } from './editor';
import type { Repl as ReplComponent, Tab } from '../types';
import {
  DockviewComponent,
  DockviewCompositeDisposable,
  Orientation,
  type AddPanelOptions,
  type GroupPanelPartInitParameters,
  type IGroupHeaderProps,
  themeAbyssSpaced,
} from 'dockview';
import { Icon } from './ui/icon';
import { plus, trash, xMark } from './ui/icons';
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

interface CompileResult {
  compiled: Record<string, string>;
  externals: string[];
}

export const Repl: ReplComponent = (props) => {
  const compiler = createWorkerClient(props.compiler);
  const formatter = createWorkerClient(props.formatter);

  const solidVersion = () => resolveSolidVersion(props.version);

  const [error, setError] = createSignal('');
  const [output, setOutput] = createSignal<Record<string, string>>(
    {},
    { equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );
  const [universalModuleName, setUniversalModuleName] = createSignal(compileOptions.UNIVERSAL.moduleName);
  const [mode, setMode] = createSignal<CompileModeOption>(compileOptions.DOM);
  const [desktopOutputVisible, setOutputVisible] = createSignal(false);
  const [desktopPreviewVisible, setPreviewVisible] = createSignal(false);
  const [displayErrors, setDisplayErrors] = createSignal(true);
  const [desktopActiveFileId, setActiveFileId] = createSignal<string | undefined>();
  const { zoomState } = useZoom();

  const importMap = createImportMap({
    tabs: () => props.tabs,
    setTabs: props.setTabs,
    version: solidVersion,
    onEdit: () => props.onUserEdit?.(),
  });

  const workspace = createWorkspace({
    tabs: () => props.tabs,
    setTabs: props.setTabs,
    folder: () => props.id,
    entry: ENTRY_FILE,
    onNameTaken: (name) => alert(`A file named ${name} already exists`),
  });

  const entryFileId = () => workspace.byName(ENTRY_FILE)?.id ?? workspace.files()[0]?.id;

  const isMobile = createMediaQuery('(max-width: 767px)');
  const mobileViews = createMobileViews(
    workspace,
    untrack(() => [entryFileId(), 'Preview'].filter((id): id is string => !!id)),
  );
  const previewVisible = () => (isMobile() ? mobileViews.openIds().includes('Preview') : desktopPreviewVisible());
  const outputVisible = () => (isMobile() ? mobileViews.openIds().includes('Output') : desktopOutputVisible());
  const activeFileId = () => (isMobile() ? mobileViews.activeFileId() : desktopActiveFileId());

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

  const cmTabs = createCodemirrorTabs({
    workspace,
    isDark: () => !!props.dark,
    fontSize: () => zoomState.fontSize,
    displayErrors,
    solidV2: () => isSolidV2(solidVersion()),
    formatter,
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
    setError(e instanceof Error ? e.message : String(e));
  };

  const requestCompile = latest((tabs: Tab[]) =>
    compiler.request<CompileResult>('COMPILE', { tabs, version: solidVersion() }),
  );
  const requestBabel = latest((tab: Tab, compileOpts: SolidCompileOptions) =>
    compiler.request<{ compiled: string }>('BABEL', { tab, compileOpts, version: solidVersion() }),
  );

  const compilePreview = throttle(async (tabs: Tab[]) => {
    try {
      const result = await requestCompile(tabs);
      if (!result) return;
      setError('');
      setOutput(result.compiled);
      importMap.syncExternals(result.externals);
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

  createEffect(
    () => {
      void solidVersion();
      const tabs = props.tabs.filter((tab) => tab.name !== IMPORT_MAP_FILE);
      return previewVisible() && tabs.length ? tabs : undefined;
    },
    (tabs) => {
      if (tabs) compilePreview(tabs);
    },
  );

  createEffect(
    () => {
      void solidVersion();
      const active = activeName();
      if (!outputVisible() || !active || !/\.[tj]sx$/.test(active)) return undefined;
      const tab = props.tabs.find((tab) => tab.name === active);
      if (!tab) return undefined;
      const current = mode();
      const compileOpts: SolidCompileOptions =
        current === compileOptions.UNIVERSAL ? { ...current, moduleName: universalModuleName() } : current;
      return { tab, compileOpts };
    },
    (job) => {
      if (job) compileOutput(job.tab, job.compileOpts);
    },
  );

  createEffect(
    () => importMap.state().imports,
    (imports) => {
      cmTabs.syncTypes(imports);
    },
  );

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

  const DesktopRepl = () => {
    let ref!: HTMLDivElement;
    const owner = getOwner();
    let dockview: DockviewComponent | undefined;

    createEffect(
      () => new Set(workspace.files().map((f) => f.id)),
      (live) => {
        if (!dockview) return;
        for (const panel of dockview.panels) {
          if (panel.view?.contentComponent === 'editor' && !live.has(panel.id)) panel.api.close();
        }
      },
    );

    // Dockview calls back from `onSettled` (no primitives allowed) and from unowned user actions.
    onSettled(() =>
      runWithOwner(null, () => {
        const openPanel = (options: AddPanelOptions) => {
          const panel = view.getGroupPanel(options.id);
          if (panel) panel.focus();
          else view.addPanel(options);
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

        const view = new DockviewComponent(ref, {
          theme: themeAbyssSpaced,
          defaultTabComponent: 'default',
          createLeftHeaderActionComponent: () =>
            solidPart<IGroupHeaderProps>(owner, headerActions, (params) => (
              <IconButton
                icon={plus}
                class={css({ h: '28px' })}
                onClick={() => {
                  params.group.focus();
                  openPanel({ id: 'NewTab', title: 'New Tab', tabComponent: 'default', component: 'newTab' });
                }}
                title="New Tab"
              >
                <span class={css({ srOnly: true })}>New tab</span>
              </IconButton>
            )),
          createTabComponent: (panel) =>
            solidPart<GroupPanelPartInitParameters>(owner, tabBody, (params) => {
              const isFile = panel.name === 'file';
              const fileId = params.api.id;
              const label = () => (isFile ? workspace.nameOf(fileId) : undefined) ?? params.title;

              if (isFile) {
                createEffect(
                  () => workspace.nameOf(fileId),
                  (name) => {
                    if (name && name !== params.api.title) params.api.setTitle(name);
                  },
                );
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
            const [activePanelId, setActivePanelId] = createSignal<string>();
            const isTSX = () => /\.[tj]sx$/.test(workspace.nameOf(activePanelId() ?? '') ?? '');

            return solidPart<IGroupHeaderProps>(
              owner,
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
                const disposable = params.group.api.onDidActivePanelChange((e) => setActivePanelId(e?.panel.id));
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
                const [previewIsActive, setPreviewIsActive] = createSignal(false);
                component = () => previewSection(previewIsActive);
                onInit = (params) => {
                  setPreviewVisible(true);
                  setPreviewIsActive(params.api.isActive);
                  const disposable = params.api.onDidActiveChange((e) => setPreviewIsActive(e.isActive));
                  return () => {
                    disposable.dispose();
                    setPreviewVisible(false);
                  };
                };
                break;
              }
              case 'output':
                component = outputSection;
                onInit = () => {
                  setOutputVisible(true);
                  return () => setOutputVisible(false);
                };
                break;
            }

            return solidPart<GroupPanelPartInitParameters>(
              owner,
              css({ display: 'flex', flexDirection: 'column', h: 'full' }),
              (params) => <ReplContext value={api}>{component(params)}</ReplContext>,
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
            view.fromJSON(stored);
            restored = view.panels.length > 0;
          } catch {}
        }
        if (!restored) view.fromJSON(defaultLayout);
        dockview = view;

        const disposables = new DockviewCompositeDisposable(
          view.onDidActivePanelChange((e) => {
            // Dockview fires this synchronously from panel operations, possibly inside effects.
            if (e.panel && untrack(() => workspace.byId(e.panel!.id))) setActiveFileId(e.panel.id);
          }),
        );

        const storage = props.storage;
        if (storage?.setLayout) {
          const saveLayout = throttle(() => storage.setLayout!(view.toJSON()), 300);
          disposables.addDisposables(view.onDidLayoutChange(saveLayout), { dispose: saveLayout.clear });
        }
        disposables.addDisposables(view);

        return () => {
          dockview = undefined;
          disposables.dispose();
        };
      }),
    );

    return <div ref={ref} class={replBody} />;
  };

  return (
    <ReplContext value={api}>
      <div class={replHost}>
        <Show when={isMobile()} fallback={<DesktopRepl />}>
          <MobileRepl views={mobileViews} preview={previewSection} outputPane={outputSection} />
        </Show>
        <Show when={error()}>
          <ErrorBanner message={error()} onDismiss={() => setError('')} />
        </Show>
      </div>
    </ReplContext>
  );
};
