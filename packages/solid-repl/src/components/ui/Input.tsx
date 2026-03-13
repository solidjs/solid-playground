import { Component, JSX, splitProps } from 'solid-js';

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {}

export const Input: Component<InputProps> = (props) => {
  const [local, others] = splitProps(props, ['class']);

  return (
    <input
      {...others}
      class={`border-neutral-200 bg-transparent py-3 dark:border-neutral-700 block border-b-2 text-lg transition-colors duration-200 focus:border-solidc focus:outline-none dark:focus:border-solidc ${
        local.class || ''
      }`}
    />
  );
};
