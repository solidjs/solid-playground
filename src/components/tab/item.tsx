import type { Component, JSX } from 'solid-js';

export const TabItem: Component<Props> = (props) => {
  return (
    <li
      class={`relative inline-flex text-sm font-sans leading-snug items-center bg-slate-500 bg-opacity-0 hover:bg-opacity-5 overflow-hidden space-x-2 border-brand-default dark:border-gray-200 border-b-2 ${
        props.class || ''
      }`}
      classList={{
        'border-opacity-90 dark:border-opacity-90 hover:border-opacity-100': props.active || false,
        'border-opacity-0 dark:border-opacity-0 hover:border-opacity-10 dark:hover:border-opacity-10': !props.active,
      }}
    >
      {props.children}
    </li>
  );
};

interface Props extends JSX.LiHTMLAttributes<HTMLLIElement> {
  active?: boolean;
}
