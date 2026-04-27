import { Component, onMount, Show } from 'solid-js';
import type { EditorView } from '@codemirror/view';
import { bell, bellSlash, codeBracket } from 'solid-heroicons/outline';
import { IconButton } from '../ui/IconButton';
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

export const Editor: Component<{
  view: EditorView;
  showFooter?: boolean;
  onFormat?: () => void;
  displayErrors?: boolean;
  setDisplayErrors?: (value: boolean) => void;
}> = (props) => {
  let parent!: HTMLDivElement;

  onMount(() => {
    parent.appendChild(props.view.dom);
    if (!props.view.state.readOnly) props.view.focus();
  });

  return (
    <>
      <div class={editorContainer} ref={parent} />
      <Show when={props.showFooter}>
        <div class={footer}>
          <div />
          <div class={css({ display: 'flex', alignItems: 'center', gap: 1 })}>
            <Show when={props.setDisplayErrors}>
              <IconButton
                icon={props.displayErrors ? bell : bellSlash}
                size="sm"
                title={props.displayErrors ? 'Disable error reporting' : 'Enable error reporting'}
                onClick={() => props.setDisplayErrors?.(!props.displayErrors)}
              />
            </Show>
            <Show when={props.onFormat}>
              <IconButton icon={codeBracket} size="sm" title="Format Document" onClick={() => props.onFormat?.()} />
            </Show>
            <span class={css({ px: 2, fontSize: 'sm', color: 'neutral.500', _dark: { color: 'neutral.400' } })}>
              TypeScript
            </span>
          </div>
        </div>
      </Show>
    </>
  );
};

export default Editor;
