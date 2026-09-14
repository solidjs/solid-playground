import type { Component } from 'solid-js';
import { Portal } from 'solid-js/web';

import { Icon } from 'solid-heroicons';
import { xMark } from 'solid-heroicons/outline';
import { css } from 'styled-system/css';

const card = css({
  position: 'fixed',
  left: 3,
  right: 3,
  bottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
  maxW: 'sm',
  md: { left: 10, right: 'auto', bottom: 10 },
  px: 6,
  py: 4,
  rounded: 'lg',
  shadow: 'lg',
  borderWidth: '1px',
  borderColor: 'neutral.200',
  bg: 'white',
  color: 'solidc',
  zIndex: 10,
  _dark: { borderColor: 'neutral.700', bg: 'neutral.900', color: 'white' },
});

const closeBtn = css({
  position: 'absolute',
  top: 2,
  right: 2,
  p: 1,
  rounded: 'md',
  _hover: { bg: 'neutral.100' },
  _dark: { _hover: { bg: 'neutral.800' } },
});

const refreshBtn = css({
  mt: 4,
  px: 3,
  py: 1.5,
  bg: 'solidc',
  color: 'white',
  rounded: 'md',
  fontSize: 'sm',
  _hover: { bg: 'solidc/90' },
});

export const Update: Component<{
  onDismiss: (...args: unknown[]) => unknown;
}> = (props) => {
  const mount = document.getElementById('update');

  return (
    <Portal mount={mount!}>
      <div class={card}>
        <button title="close" onClick={props.onDismiss} class={closeBtn}>
          <Icon path={xMark} class={css({ h: 5 })} />
        </button>
        <p class={css({ pr: 6, fontWeight: 'semibold' })}>There's a new update available.</p>
        <p class={css({ mt: 2, fontSize: 'sm', opacity: 0.8 })}>
          Refresh your browser or click the button below to get the latest update of the REPL.
        </p>
        <button onClick={() => location.reload()} class={refreshBtn}>
          Refresh
        </button>
      </div>
    </Portal>
  );
};
