import { Component, For, JSX, Show, createMemo, createUniqueId } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { Portal } from 'solid-js/web';
import * as menu from '@zag-js/menu';
import { useMachine, normalizeProps } from '@zag-js/solid';
import { css, cva, cx } from 'styled-system/css';

const menuStyles = css({
  minWidth: 32,
  borderWidth: '1px',
  borderColor: 'neutral.200',
  bg: 'white',
  py: 1,
  rounded: 'lg',
  shadow: 'lg',
  zIndex: 1000,
  outline: 'none',
  _dark: { borderColor: 'neutral.700', bg: 'neutral.800' },
});

const menuItem = cva({
  base: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    px: 3,
    py: 2,
    gap: 2,
    textAlign: 'left',
    fontSize: 'sm',
    transition: 'colors',
    cursor: 'pointer',
  },
  variants: {
    variant: {
      default: {
        '&[data-highlighted]': { bg: 'neutral.200' },
        '_dark': { '&[data-highlighted]': { bg: 'neutral.700' } },
      },
      danger: {
        'color': 'red.600',
        '&[data-highlighted]': { bg: 'red.100' },
        '_dark': { '&[data-highlighted]': { bg: 'red.900/20' } },
      },
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface MenuItemDef {
  value: string;
  label: string;
  icon?: any;
  variant?: 'default' | 'danger';
  onSelect: () => void;
}

export interface MenuOptions {
  id?: string;
  positioning?: menu.PositioningOptions;
}

export function useMenu(items: () => MenuItemDef[], options: MenuOptions = {}) {
  const id = options.id ?? createUniqueId();

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
        <div {...(api().getPositionerProps() as any)}>
          <ul {...(api().getContentProps() as any)} class={menuStyles}>
            <For each={items()}>
              {(item) => (
                <li
                  {...(api().getItemProps({ value: item.value }) as any)}
                  class={menuItem({ variant: item.variant ?? 'default' })}
                >
                  <Show when={item.icon} fallback={<div class={css({ h: 3, w: 3 })} />}>
                    <Icon path={item.icon} class={css({ h: 3, w: 3 })} />
                  </Show>
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

export const Menu: Component<{ class?: string; style?: JSX.CSSProperties; children?: JSX.Element }> = (props) => (
  <div class={cx(menuStyles, props.class)} style={props.style} onClick={(e) => e.stopPropagation()}>
    {props.children}
  </div>
);

export const MenuItem: Component<{
  label: string;
  icon?: any;
  variant?: 'default' | 'danger';
  onClick: () => void;
}> = (props) => (
  <button class={menuItem({ variant: props.variant ?? 'default' })} onClick={() => props.onClick()}>
    <Show when={props.icon} fallback={<div class={css({ h: 3, w: 3 })} />}>
      <Icon path={props.icon} class={css({ h: 3, w: 3 })} />
    </Show>
    <span>{props.label}</span>
  </button>
);
