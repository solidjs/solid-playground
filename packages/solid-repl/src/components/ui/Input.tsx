import { omit, type Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { cva } from 'styled-system/css';

export const inputStyles = cva({
  base: {
    fontSize: 'sm',
    boxSizing: 'border-box',
    // CSS initial is normal; Panda's normal token is 1.5.
    lineHeight: 'initial',
    appearance: 'auto',
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
      sm: { h: 8, px: 2, py: 1 },
      md: { h: 10, px: 3, py: 2 },
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
  const others = omit(props, 'class', 'size', 'inline');

  return <input {...others} class={[inputStyles({ size: props.size, inline: props.inline }), props.class]} />;
};
