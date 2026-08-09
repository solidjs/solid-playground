import { Component, For, Show, onMount } from 'solid-js';
import { IconButton } from '../ui/IconButton';
import { useCommandMenu } from '../ui/CommandPalette';
import { useRepl } from '../replContext';
import { menuOf, toCommandItems } from '../../kernel/commands';
import { css } from 'styled-system/css';

const editorContainer = css({ flex: 1, p: 0, minH: 0, minW: 0, display: 'flex', overflow: 'hidden' });

const footer = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  h: '30px',
  px: 2,
  borderTopWidth: '1px',
  borderColor: 'neutral.200',
  bg: 'white',
  _dark: { borderColor: 'neutral.700', bg: 'neutral.900' },
});

const tsExts = new Set(['tsx', 'jsx', 'ts', 'js', 'mts', 'cts', 'mjs', 'cjs']);

export const Editor: Component<{ fileId: string; autofocus?: boolean }> = (props) => {
  const api = useRepl();
  let parent!: HTMLDivElement;

  onMount(() => api.editors.attach(props.fileId, parent, props.autofocus !== false));

  const name = () => api.workspace.nameOf(props.fileId) ?? '';
  const isTs = () => tsExts.has(name().split('.').pop() ?? '');

  const onContextMenu = (e: MouseEvent) => {
    if (!isTs()) return;
    const view = api.editors.getView(props.fileId);
    if (!view) return;
    e.preventDefault();
    const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
    if (pos != null) {
      const sel = view.state.selection.main;
      const lo = Math.min(sel.anchor, sel.head);
      const hi = Math.max(sel.anchor, sel.head);
      if (pos < lo || pos > hi) view.dispatch({ selection: { anchor: pos } });
    }
    openAt(e.clientX, e.clientY);
  };

  const items = () => toCommandItems(menuOf(api.commands, 'editor/context'));

  const { openAt, Content } = useCommandMenu(items);

  return (
    <>
      <div class={editorContainer} ref={parent} onContextMenu={onContextMenu} />
      <div class={footer}>
        <div />
        <div class={css({ display: 'flex', alignItems: 'center', gap: 1 })}>
          <For each={menuOf(api.commands, 'editor/toolbar')}>
            {(command) => (
              <Show when={command.icon}>
                {(icon) => <IconButton icon={icon()} title={command.title} onClick={() => command.run()} />}
              </Show>
            )}
          </For>
          <span class={css({ px: 2, fontSize: 'sm', color: 'neutral.500', _dark: { color: 'neutral.400' } })}>
            TypeScript
          </span>
        </div>
      </div>
      <Content />
    </>
  );
};

export const OutputEditor: Component = () => {
  const api = useRepl();
  let parent!: HTMLDivElement;
  onMount(() => api.editors.ensureOutputView().attach(parent));
  return <div class={editorContainer} ref={parent} />;
};

export default Editor;
