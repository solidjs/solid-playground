import type { Component } from 'solid-js';

export const Dot: Component<{ isDragging: boolean }> = (props) => {
  return (
    <span
      class="m-1 w-1 h-1 rounded-full bg-blueGray-300 dark:bg-blueGray-600 dark:group-hover:bg-blueGray-200"
      classList={{
        'bg-blueGray-200': props.isDragging,
        'dark:bg-blueGray-200': props.isDragging,
      }}
    />
  );
};
