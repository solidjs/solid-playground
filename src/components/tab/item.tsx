import type { Component, JSX } from 'solid-js';

export const TabItem: Component<Props> = (props) => {
  return (
    <li
      class={`relative z-10 inline-flex text-sm font-sans leading-snug items-center bg-blueGray-500 bg-opacity-0 hover:bg-opacity-5 overflow-hidden space-x-2 border-solid border-brand-default dark:border-gray-200 border-opacity-5 dark:border-opacity-5 border-b-2 ${
        props.class || ''
      }`}
      classList={{
        'border-opacity-90 dark:border-opacity-90 hover:border-opacity-100': props.active || false,
        'hover:border-opacity-10 dark:hover:border-opacity-10': !props.active,
      }}
    >
      {props.children}
    </li>
  );
};

interface Props extends JSX.LiHTMLAttributes<HTMLLIElement> {
  active?: boolean;
}
