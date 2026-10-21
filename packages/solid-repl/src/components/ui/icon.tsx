import { For, Show, omit, type Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { css } from 'styled-system/css';
import type { IconPath } from './icons';

export type { IconPath } from './icons';

export interface IconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  path: IconPath;
}

export const Icon: Component<IconProps> = (props) => {
  const rest = omit(props, 'path');
  return (
    <svg
      viewBox="0 0 24 24"
      fill={props.path.outline ? 'none' : 'currentColor'}
      stroke={props.path.outline ? 'currentColor' : 'none'}
      stroke-width={props.path.outline ? 1.5 : undefined}
      stroke-linecap={props.path.outline ? 'round' : undefined}
      stroke-linejoin={props.path.outline ? 'round' : undefined}
      aria-hidden="true"
      {...rest}
    >
      <For each={props.path.paths}>
        {(p) => (
          <path
            d={p.d}
            fill-rule={p.evenodd ? 'evenodd' : undefined}
            clip-rule={p.evenodd ? 'evenodd' : undefined}
          />
        )}
      </For>
    </svg>
  );
};

const slot = css({ h: 4, w: 4, flexShrink: 0 });

export const IconSlot: Component<{ path?: IconPath }> = (props) => (
  <Show when={props.path} fallback={<div class={slot} />}>
    {(path) => <Icon path={path()} class={slot} />}
  </Show>
);
