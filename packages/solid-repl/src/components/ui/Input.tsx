import { Component, JSX, splitProps } from 'solid-js';
import { cva, cx } from 'styled-system/css';

const input = cva({
  base: {
    fontSize: 'sm',
    color: 'inherit',
    bg: 'transparent',
    border: '1px solid',
    borderColor: 'neutral.200',
    rounded: 'md',
    transition: 'colors',
    transitionDuration: '200ms',
    _focus: { borderColor: 'solidc', outline: 'none' },
    _dark: { borderColor: 'neutral.700' },
  },
  variants: {
    size: {
      sm: { px: 2, py: 1 },
      md: { px: 3, py: 2 },
    },
    inline: {
      true: { display: 'inline-block', width: 'auto' },
      false: { display: 'block', width: '100%' },
    },
  },
  defaultVariants: {
    size: 'md',
    inline: false,
  },
});

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  size?: 'sm' | 'md';
  inline?: boolean;
}

export const Input: Component<InputProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'size', 'inline']);

  return <input {...others} class={cx(input({ size: local.size, inline: local.inline }), local.class)} />;
};
