import { Component, onMount } from 'solid-js';
import { bell, bellSlash, codeBracket } from 'solid-heroicons/outline';
import { IconButton } from '../ui/IconButton';
import { useRepl } from '../replContext';
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

export const Editor: Component<{ name: string }> = (props) => {
  const api = useRepl();
  const uri = api.uriFor(props.name);
  let parent!: HTMLDivElement;

  onMount(() => api.editors.attach(uri, parent));

  return (
    <>
      <div class={editorContainer} ref={parent} />
      <div class={footer}>
        <div />
        <div class={css({ display: 'flex', alignItems: 'center', gap: 1 })}>
          <IconButton
            icon={api.displayErrors() ? bell : bellSlash}
            size="sm"
            title={api.displayErrors() ? 'Disable error reporting' : 'Enable error reporting'}
            onClick={() => api.setDisplayErrors(!api.displayErrors())}
          />
          <IconButton icon={codeBracket} size="sm" title="Format Document" onClick={() => api.editors.format(uri)} />
          <span class={css({ px: 2, fontSize: 'sm', color: 'neutral.500', _dark: { color: 'neutral.400' } })}>
            TypeScript
          </span>
        </div>
      </div>
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
