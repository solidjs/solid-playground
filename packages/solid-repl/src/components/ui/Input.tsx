import { Component, JSX, splitProps } from 'solid-js';

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  size?: 'sm' | 'md';
  inline?: boolean;
}

const sizes = {
  sm: 'px-2 py-1',
  md: 'px-3 py-2',
};

export const Input: Component<InputProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'size', 'inline']);

  return (
    <input
      {...others}
      class={`border-neutral-200 bg-transparent dark:border-neutral-700 rounded-md border text-sm transition-colors duration-200 focus:border-solidc focus:outline-none dark:focus:border-solidc ${
        local.inline ? 'inline-block w-auto' : 'block w-full'
      } ${sizes[local.size || 'md']} ${local.class || ''}`}
    />
  );
};
