import type { ParentComponent } from 'solid-js';

export const TabList: ParentComponent = (props) => {
  return <ul class="flex tabs flex-wrap items-center list-none m-0">{props.children}</ul>;
};
