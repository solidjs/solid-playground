import { Component, JSX, splitProps } from 'solid-js';

export interface CheckboxProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: Component<CheckboxProps> = (props) => {
  const [local, others] = splitProps(props, ['label', 'class', 'classList']);

  return (
    <label
      class={`my-3 space-x-4 dark:text-white flex cursor-pointer items-center ${local.class || ''}`}
      classList={local.classList}
    >
      <input
        type="checkbox"
        {...others}
        class="h-4 w-4 shrink-0 border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 cursor-pointer rounded text-solidc focus:ring-solidc"
      />
      <span class="text-sm font-medium">{local.label}</span>
    </label>
  );
};
