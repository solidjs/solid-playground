import type { Component } from 'solid-js';

export const Dot: Component<{ isDragging: boolean }> = (props) => {
  return (
    <span
      class="m-1 w-1 h-1 rounded-full bg-slate-300 dark:bg-white dark:group-hover:bg-slate-200"
      classList={{
        'bg-slate-200': props.isDragging,
        'dark:bg-slate-200': props.isDragging,
      }}
    />
  );
};
