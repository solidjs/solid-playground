import { omit, type Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { css } from 'styled-system/css';

const wrapperStyles = css({
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  cursor: 'pointer',
  _dark: { color: 'white' },
});

const inputStyles = css({
  flexShrink: 0,
  h: 4,
  w: 4,
  rounded: 'sm',
  cursor: 'pointer',
  color: 'solidc',
  border: '1px solid',
  borderColor: 'neutral.300',
  _focus: { ringColor: 'solidc' },
  _dark: { borderColor: 'neutral.700', bg: 'neutral.800' },
});

export interface CheckboxProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: Component<CheckboxProps> = (props) => {
  const others = omit(props, 'label', 'class');

  return (
    <label class={[wrapperStyles, props.class]}>
      <input type="checkbox" {...others} class={inputStyles} />
      <span class={css({ fontSize: 'sm' })}>{props.label}</span>
    </label>
  );
};
