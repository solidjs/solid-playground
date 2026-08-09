import { Component, For, JSX, Show, createMemo, createUniqueId } from 'solid-js';
import { Portal } from 'solid-js/web';
import * as menu from '@zag-js/menu';
import { useMachine, normalizeProps } from '@zag-js/solid';
import { css, cva } from 'styled-system/css';
import { IconSlot, type IconPath } from './icon';

const menuStyles = css({
  minWidth: 44,
  borderWidth: '1px',
  borderColor: 'neutral.200',
  bg: 'white',
  color: 'neutral.900',
  py: 1,
  rounded: 'lg',
  shadow: 'lg',
  zIndex: 1000,
  outline: 'none',
  userSelect: 'none',
  _dark: { borderColor: 'neutral.700', bg: 'neutral.800', color: 'neutral.100' },
});

const menuItem = cva({
  base: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    px: 3,
    py: 1.5,
    gap: 2,
    textAlign: 'left',
    fontSize: 'sm',
    lineHeight: 'tight',
    transition: 'colors',
    cursor: 'pointer',
  },
  variants: {
    variant: {
      default: {
        '& svg': { color: 'neutral.500' },
        '&[data-highlighted]': { bg: 'neutral.200' },
        '_dark': { '& svg': { color: 'neutral.400' }, '&[data-highlighted]': { bg: 'neutral.700' } },
      },
      danger: {
        'color': 'red.600',
        '&[data-highlighted]': { bg: 'red.100' },
        '_dark': { 'color': 'red.400', '&[data-highlighted]': { bg: 'red.900/30' } },
      },
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface MenuItemDef {
  value: string;
  label: string;
  icon?: IconPath;
  variant?: 'default' | 'danger';
  onSelect: () => void;
}

export function useMenu(items: () => MenuItemDef[], options: { positioning?: menu.PositioningOptions } = {}) {
  const id = createUniqueId();

  const service = useMachine(menu.machine, () => ({
    id,
    positioning: options.positioning,
    onSelect: ({ value }) => {
      const item = items().find((i) => i.value === value);
      item?.onSelect();
    },
  }));

  const api = createMemo(() => menu.connect(service, normalizeProps));

  const openAt = (x: number, y: number) => {
    service.send({ type: 'CONTEXT_MENU', point: { x, y } });
  };

  const Content: Component<{ portal?: boolean }> = (props) => {
    const body = (
      <Show when={api().open}>
        <div {...api().getPositionerProps()}>
          <ul {...api().getContentProps()} class={menuStyles}>
            <For each={items()}>
              {(item) => (
                <li
                  {...api().getItemProps({ value: item.value })}
                  class={menuItem({ variant: item.variant ?? 'default' })}
                >
                  <IconSlot path={item.icon} />
                  <span>{item.label}</span>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>
    );

    return props.portal ? <Portal>{body as JSX.Element}</Portal> : (body as JSX.Element);
  };

  return { api, Content, openAt };
}
