import type { ParentComponent } from 'solid-js';

export const TabItem: ParentComponent<{
  active?: boolean;
  class?: string;
}> = (props) => {
  return (
    <li
      class={`border-brand-default relative inline-flex items-center overflow-hidden border-b-2 bg-slate-500 bg-opacity-0 font-sans text-sm leading-snug transition hover:bg-opacity-5 dark:border-gray-200 ${
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
  return <ul class="m-0 flex list-none flex-wrap items-center">{props.children}</ul>;
};
