import { omit, type Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { css } from 'styled-system/css';
import { Icon, type IconPath } from './icon';

const button = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  rounded: 'md',
  p: 1,
  opacity: 0.8,
  transition: 'all',
  _hover: { bg: 'neutral.200', opacity: 1 },
  _disabled: { pointerEvents: 'none', opacity: 0.5 },
  _dark: { _hover: { bg: 'neutral.700' } },
});

const buttonIcon = css({ h: 4, w: 4 });

export interface IconButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconPath;
}

export const IconButton: Component<IconButtonProps> = (props) => {
  const rest = omit(props, 'icon', 'class', 'children');
  return (
    <button type="button" {...rest} class={[button, props.class]}>
      <Icon path={props.icon} class={buttonIcon} />
      {props.children}
    </button>
  );
};
