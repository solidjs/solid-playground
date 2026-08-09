import { Component, JSX, Show, createMemo, createUniqueId } from 'solid-js';
import { Portal } from 'solid-js/web';
import * as dialog from '@zag-js/dialog';
import { useMachine, normalizeProps } from '@zag-js/solid';
import { css } from 'styled-system/css';

const backdrop = css({
  position: 'fixed',
  inset: 0,
  zIndex: 10,
  bg: 'black/50',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const panel = css({
  width: 96,
  p: 4,
  rounded: 'lg',
  shadow: 'lg',
  borderWidth: '1px',
  borderColor: 'neutral.200',
  bg: 'white',
  _dark: { borderColor: 'neutral.700', bg: 'neutral.900', color: 'white' },
});

export function useDialog(options: { open: () => boolean; onOpenChange: (open: boolean) => void }) {
  const id = createUniqueId();
  const service = useMachine(dialog.machine, () => ({
    id,
    open: options.open(),
    onOpenChange: ({ open }) => options.onOpenChange(open),
  }));
  const api = createMemo(() => dialog.connect(service, normalizeProps));

  const Root: Component<{ children: JSX.Element }> = (props) => (
    <Show when={api().open}>
      <Portal>
        <div {...api().getBackdropProps()} class={backdrop}>
          <div {...api().getPositionerProps()}>
            <div {...api().getContentProps()} class={panel}>
              {props.children}
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );

  return { Root };
}
