import type { ParentComponent } from 'solid-js';

export const TabItem: ParentComponent<{
  active?: boolean;
  class?: string;
}> = (props) => {
  return (
    <li
      class={`relative inline-flex text-sm font-sans transition leading-snug items-center bg-slate-500 bg-opacity-0 hover:bg-opacity-5 overflow-hidden border-brand-default dark:border-gray-200 border-b-2 ${
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

export const TabList: ParentComponent = (props) => {
  return <ul class="flex tabs flex-wrap items-center list-none m-0">{props.children}</ul>;
};
