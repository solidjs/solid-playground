import { Component, JSX, splitProps } from 'solid-js';

export interface CheckboxProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: Component<CheckboxProps> = (props) => {
  const [local, others] = splitProps(props, ['label', 'class', 'classList']);

  return (
    <label
      class={`space-x-2 dark:text-white flex cursor-pointer items-center ${local.class || ''}`}
      classList={local.classList}
    >
      <input
        type="checkbox"
        {...others}
        class="h-4 w-4 border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 shrink-0 cursor-pointer rounded-sm text-solidc focus:ring-solidc"
      />
      <span class="text-sm">{local.label}</span>
    </label>
  );
};
