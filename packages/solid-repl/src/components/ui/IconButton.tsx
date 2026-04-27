import { Component, JSX, splitProps } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { css, cva, cx } from 'styled-system/css';

const iconButton = cva({
  base: {
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
  variants: {
    size: {
      sm: { p: 1 },
      md: { p: 1.5 },
      lg: { p: 2 },
    },
    active: {
      true: {
        bg: 'neutral.200',
        opacity: 1,
        _dark: { bg: 'neutral.700' },
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const iconSizeStyles = {
  sm: css({ h: 4, w: 4 }),
  md: css({ h: 5, w: 5 }),
  lg: css({ h: 6, w: 6 }),
} as const;

export interface IconButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: any;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: Component<IconButtonProps> = (props) => {
  const [local, rest] = splitProps(props, ['icon', 'active', 'size', 'class', 'children']);
  const size = () => local.size ?? 'md';
  return (
    <button
      type="button"
      {...rest}
      class={cx(iconButton({ size: size(), active: local.active }), local.class)}
    >
      <Icon path={local.icon} class={iconSizeStyles[size()]} />
      {local.children}
    </button>
  );
};
