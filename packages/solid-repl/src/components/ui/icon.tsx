import { Show, type Component, type ComponentProps } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { css } from 'styled-system/css';

export type IconPath = ComponentProps<typeof Icon>['path'];

const slot = css({ h: 4, w: 4, flexShrink: 0 });

export const IconSlot: Component<{ path?: IconPath }> = (props) => (
  <Show when={props.path} fallback={<div class={slot} />}>
    {(path) => <Icon path={path()} class={slot} />}
  </Show>
);
