import { ParentComponent, JSX, splitProps } from 'solid-js';

export const Label: ParentComponent<JSX.LabelHTMLAttributes<HTMLLabelElement>> = (props) => {
  const [local, others] = splitProps(props, ['class', 'children']);

  return (
    <label
      {...others}
      class={`text-neutral-500 dark:text-neutral-400 text-sm font-semibold uppercase tracking-wide ${
        local.class || ''
      }`}
    >
      {local.children}
    </label>
  );
};
