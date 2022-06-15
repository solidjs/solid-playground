import type { Component, JSX } from 'solid-js';

export const TabList: Component<Pick<JSX.HTMLAttributes<HTMLUListElement>, 'class' | 'classList' | 'children'>> = (
  props,
) => {
  return (
    <ul class={`flex tabs flex-wrap items-center list-none m-0 ${props.class || ''}`} classList={props.classList}>
      {props.children}
    </ul>
  );
};
