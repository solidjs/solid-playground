import { Component, JSX, splitProps } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { cx, sva } from 'styled-system/css';

const iconButton = sva({
  slots: ['button', 'icon'],
  base: {
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      rounded: 'md',
      opacity: 0.8,
      transition: 'all',
      _hover: { bg: 'neutral.200', opacity: 1 },
      _disabled: { pointerEvents: 'none', opacity: 0.5 },
      _dark: { _hover: { bg: 'neutral.700' } },
    },
    icon: {},
  },
  variants: {
    size: {
      sm: { button: { p: 1 }, icon: { h: 4, w: 4 } },
      md: { button: { p: 1.5 }, icon: { h: 5, w: 5 } },
      lg: { button: { p: 2 }, icon: { h: 6, w: 6 } },
    },
    active: {
      true: {
        button: {
          bg: 'neutral.200',
          opacity: 1,
          _dark: { bg: 'neutral.700' },
        },
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface IconButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: any;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: Component<IconButtonProps> = (props) => {
  const [local, rest] = splitProps(props, ['icon', 'active', 'size', 'class', 'children']);
  const styles = () => iconButton({ size: local.size, active: local.active });
  return (
    <button type="button" {...rest} class={cx(styles().button, local.class)}>
      <Icon path={local.icon} class={styles().icon} />
      {local.children}
    </button>
  );
};
