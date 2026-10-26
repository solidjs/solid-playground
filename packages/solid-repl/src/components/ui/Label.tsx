import { omit, type ParentComponent } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { css } from 'styled-system/css';

const labelStyles = css({
  fontSize: 'sm',
  fontWeight: 'semibold',
  color: 'neutral.500',
  _dark: { color: 'neutral.400' },
});

export const Label: ParentComponent<JSX.LabelHTMLAttributes<HTMLLabelElement>> = (props) => {
  const others = omit(props, 'class', 'children');

  return (
    <label {...others} class={[labelStyles, props.class]}>
      {props.children}
    </label>
  );
};
