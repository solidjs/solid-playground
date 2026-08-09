import { Component, JSX, splitProps } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { css, cx } from 'styled-system/css';
import type { IconPath } from './icon';

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
  const [local, rest] = splitProps(props, ['icon', 'class', 'children']);
  return (
    <button type="button" {...rest} class={cx(button, local.class)}>
      <Icon path={local.icon} class={buttonIcon} />
      {local.children}
    </button>
  );
};
