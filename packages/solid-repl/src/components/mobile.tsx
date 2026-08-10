import { Component, For, JSX, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { plus, xMark } from 'solid-heroicons/outline';
import { NewTab } from './newTab';
import { ImportMapPanel } from './importMapPanel';
import Editor from './editor';
import { useRepl } from './replContext';
import { Button } from './ui/Button';
import { css } from 'styled-system/css';

interface MobileReplProps {
  initialViews: string[];
  preview: (interactive: () => boolean) => JSX.Element;
  outputPane: () => JSX.Element;
  onPreviewOpen: (open: boolean) => void;
  onOutputOpen: (open: boolean) => void;
  onActiveFile: (id: string) => void;
}

const CARD_SCALE = 0.7;
const CARD_GAP = 40;
const STACK_PAD = 24;

const root = css({
  position: 'relative',
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minH: 0,
  overflow: 'hidden',
});

const stage = css({
  position: 'relative',
  flex: 1,
  minH: 0,
  bg: 'neutral.100',
  overscrollBehavior: 'contain',
  _dark: { bg: 'neutral.950' },
});

const viewShell = css({
  position: 'absolute',
  top: 0,
  left: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  bg: 'white',
  transitionProperty: 'transform, width, height, visibility, border-radius, box-shadow',
  transitionDuration: '0.3s',
  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
  _dark: { bg: 'neutral.900' },
});

const viewShellCard = css({
  rounded: 'xl',
  borderWidth: '1px',
  borderColor: 'neutral.300',
  shadow: 'lg',
  _dark: { borderColor: 'neutral.700' },
});

const contentHost = css({
  position: 'absolute',
  top: 0,
  left: 0,
  display: 'flex',
  flexDirection: 'column',
});

const cardHit = css({
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  cursor: 'pointer',
});

const cardBar = css({
  position: 'absolute',
  top: 0,
  left: 0,
  w: 'full',
  zIndex: 3,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
  h: 9,
  px: 3,
  cursor: 'pointer',
  fontSize: 'sm',
  fontWeight: 'medium',
  bg: 'neutral.100',
  borderBottomWidth: '1px',
  borderColor: 'neutral.200',
  _dark: { bg: 'neutral.800', borderColor: 'neutral.700', color: 'white' },
});

const cardClose = css({
  p: 1,
  rounded: 'md',
  flexShrink: 0,
  _hover: { bg: 'neutral.200' },
  _dark: { _hover: { bg: 'neutral.700' } },
});

const bottomBar = css({
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  px: 3,
  py: 1.5,
  pb: 'max(env(safe-area-inset-bottom), 0.375rem)',
  borderTopWidth: '1px',
  borderColor: 'neutral.200',
  bg: 'white',
  _dark: { borderColor: 'neutral.800', bg: 'neutral.900' },
});

const barButton = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  h: 9,
  w: 9,
  rounded: 'lg',
  flexShrink: 0,
  color: 'neutral.700',
  _hover: { bg: 'neutral.200' },
  _dark: { color: 'neutral.300', _hover: { bg: 'neutral.800' } },
});

const barTitle = css({
  flex: 1,
  minW: 0,
  textAlign: 'center',
  fontSize: 'sm',
  fontWeight: 'medium',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const tabCount = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  h: 7,
  minW: 7,
  px: 1,
  rounded: 'md',
  borderWidth: '2px',
  borderColor: 'neutral.600',
  fontSize: 'xs',
  fontWeight: 'bold',
  _dark: { borderColor: 'neutral.300', color: 'white' },
});

const tabCountActive = css({
  bg: 'neutral.600',
  color: 'white',
  _dark: { bg: 'neutral.300', color: 'black' },
});

const overlay = css({
  position: 'absolute',
  inset: 0,
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  bg: 'white',
  _dark: { bg: 'neutral.900' },
});

const emptyState = css({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
  color: 'neutral.500',
});

export const MobileRepl: Component<MobileReplProps> = (props) => {
  const api = useRepl();
  const workspace = api.workspace;

  const [openIds, setOpenIds] = createSignal<string[]>(props.initialViews);
  const [activeId, setActiveId] = createSignal<string | undefined>(props.initialViews[0]);
  const [switcher, setSwitcher] = createSignal(false);
  const [showNewTab, setShowNewTab] = createSignal(false);

  const isPane = (id: string) => id === 'Preview' || id === 'Output';
  const labelOf = (id: string) => (isPane(id) ? id : (workspace.nameOf(id) ?? id));

  const setActive = (id: string | undefined) => {
    setActiveId(id);
    if (id && workspace.byId(id)) props.onActiveFile(id);
  };
  setActive(activeId());

  createEffect(() => props.onPreviewOpen(openIds().includes('Preview')));
  createEffect(() => props.onOutputOpen(openIds().includes('Output')));
  onCleanup(() => {
    props.onPreviewOpen(false);
    props.onOutputOpen(false);
  });

  createEffect(() => {
    const live = new Set(workspace.files().map((f) => f.id));
    const open = openIds().filter((id) => isPane(id) || live.has(id));
    if (open.length === openIds().length) return;
    setOpenIds(open);
    if (!open.includes(activeId()!)) setActive(open[0]);
  });

  let stageRef!: HTMLDivElement;
  const [stageSize, setStageSize] = createSignal({ w: 0, h: 0 });
  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      setStageSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(stageRef);
    onCleanup(() => observer.disconnect());
  });

  const cardW = () => stageSize().w * CARD_SCALE;
  const cardH = () => stageSize().h * CARD_SCALE;
  const cardX = () => (stageSize().w - cardW()) / 2;
  const cardY = (index: number) => STACK_PAD + index * (cardH() + CARD_GAP);
  const stackHeight = () => STACK_PAD * 2 + openIds().length * (cardH() + CARD_GAP) - CARD_GAP;

  const activate = (id: string) => {
    setActive(id);
    setSwitcher(false);
  };

  const openView = (id: string) => {
    if (!openIds().includes(id)) setOpenIds(openIds().concat(id));
    setShowNewTab(false);
    activate(id);
  };

  const closeView = (id: string) => {
    const open = openIds();
    const index = open.indexOf(id);
    const next = open.filter((x) => x !== id);
    setOpenIds(next);
    if (activeId() === id) setActive(next[Math.min(index, next.length - 1)]);
  };

  const toggleSwitcher = () => {
    const entering = !switcher();
    setSwitcher(entering);
    if (entering) {
      const index = openIds().indexOf(activeId() ?? '');
      if (index > 0) {
        requestAnimationFrame(() => stageRef.scrollTo({ top: Math.max(0, cardY(index) - STACK_PAD) }));
      }
    }
  };

  const shellStyle = (id: string, index: () => number): JSX.CSSProperties => {
    const { w, h } = stageSize();
    if (!switcher()) {
      // `none`, not an identity transform: Chromium misroutes input into sandboxed iframes
      // under transformed ancestors.
      return {
        'width': w ? `${w}px` : '100%',
        'height': h ? `${h}px` : '100%',
        'transform': 'none',
        'visibility': activeId() === id ? 'visible' : 'hidden',
        'z-index': activeId() === id ? 2 : 1,
      };
    }
    return {
      'width': `${cardW()}px`,
      'height': `${cardH()}px`,
      'transform': `translate(${cardX()}px, ${cardY(index())}px)`,
      'visibility': 'visible',
      'z-index': activeId() === id ? 2 : 1,
    };
  };

  const contentStyle = (): JSX.CSSProperties => {
    const { w, h } = stageSize();
    return {
      'width': w ? `${w}px` : '100%',
      'height': h ? `${h}px` : '100%',
      'transform': switcher() ? `scale(${CARD_SCALE})` : 'none',
      'transform-origin': '0 0',
      'transition': 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      'pointer-events': switcher() ? 'none' : undefined,
    };
  };

  const content = (id: string) => {
    if (id === 'Preview') return props.preview(() => !switcher() && activeId() === 'Preview');
    if (id === 'Output') return props.outputPane();
    if (workspace.nameOf(id) === 'import_map.json') return <ImportMapPanel />;
    return <Editor fileId={id} autofocus={false} />;
  };

  return (
    <div class={root}>
      <div ref={stageRef} class={stage} style={{ 'overflow-y': switcher() ? 'auto' : 'hidden' }}>
        <div
          style={{
            position: 'relative',
            height: switcher() ? `${stackHeight()}px` : '100%',
          }}
        >
          <For each={openIds()}>
            {(id, index) => (
              <div class={viewShell} classList={{ [viewShellCard]: switcher() }} style={shellStyle(id, index)}>
                <div class={contentHost} style={contentStyle()}>
                  {content(id)}
                </div>
                <Show when={switcher()}>
                  <button class={cardHit} onClick={() => activate(id)} aria-label={`Open ${labelOf(id)}`} />
                  <div class={cardBar} onClick={() => activate(id)}>
                    <span
                      class={css({
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      })}
                    >
                      {labelOf(id)}
                    </span>
                    <button
                      class={cardClose}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeView(id);
                      }}
                      title={`Close ${labelOf(id)}`}
                    >
                      <Icon path={xMark} class={css({ h: 4, w: 4 })} />
                    </button>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
        <Show when={openIds().length === 0}>
          <div class={emptyState}>
            <p>No open tabs</p>
            <Button variant="primary" onClick={() => setShowNewTab(true)}>
              Open a file
            </Button>
          </div>
        </Show>
      </div>

      <div class={bottomBar}>
        <button class={barButton} onClick={() => setShowNewTab(true)} title="New tab">
          <Icon path={plus} class={css({ h: 5, w: 5 })} />
          <span class={css({ srOnly: true })}>New tab</span>
        </button>
        <div class={barTitle}>
          <Show when={!switcher()} fallback={`${openIds().length} open tabs`}>
            {activeId() ? labelOf(activeId()!) : ''}
          </Show>
        </div>
        <button
          class={tabCount}
          classList={{ [tabCountActive]: switcher() }}
          onClick={toggleSwitcher}
          title={switcher() ? 'Back to tab' : 'Show open tabs'}
        >
          {openIds().length}
        </button>
      </div>

      <Show when={showNewTab()}>
        <div class={overlay}>
          <NewTab
            tabs={api.tabs()}
            onOpenPane={openView}
            onOpenFile={(name) => {
              const file = workspace.byName(name);
              if (file) openView(file.id);
            }}
            onNewFile={(name) => {
              const file = workspace.create(name);
              if (file) openView(file.id);
            }}
            onUpload={(name, source) => {
              const file = workspace.create(name, source);
              if (file) openView(file.id);
            }}
            onDeleteFile={(name) => {
              const file = workspace.byName(name);
              if (file) workspace.remove(file.id);
            }}
            onRenameFile={(oldName, newName) => {
              const file = workspace.byName(oldName);
              if (file) workspace.rename(file.id, newName);
            }}
            onClose={() => setShowNewTab(false)}
          />
        </div>
      </Show>
    </div>
  );
};
