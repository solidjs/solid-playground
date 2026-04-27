import { ParentComponent, JSX, splitProps } from 'solid-js';
import { css, cx } from 'styled-system/css';

const labelStyles = css({
  fontSize: 'sm',
  fontWeight: 'semibold',
  color: 'neutral.500',
  _dark: { color: 'neutral.400' },
});

export const Label: ParentComponent<JSX.LabelHTMLAttributes<HTMLLabelElement>> = (props) => {
  const [local, others] = splitProps(props, ['class', 'children']);

  return (
    <label {...others} class={cx(labelStyles, local.class)}>
      {local.children}
    </label>
  );
};
