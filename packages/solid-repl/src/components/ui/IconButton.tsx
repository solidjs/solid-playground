import { Component, JSX } from 'solid-js';
import { Icon } from 'solid-heroicons';

export interface IconButtonProps {
  ref?: HTMLButtonElement;
  icon: any;
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  class?: string;
  size?: 'sm' | 'md' | 'lg';
  children?: JSX.Element;
}

const sizes = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export const IconButton: Component<IconButtonProps> = (props) => {
  return (
    <button
      ref={props.ref}
      type="button"
      onClick={props.onClick}
      title={props.title}
      disabled={props.disabled}
      class={`hover:bg-neutral-200 dark:hover:bg-neutral-700 inline-flex items-center justify-center rounded-md opacity-80 transition-all hover:opacity-100 disabled:pointer-events-none disabled:opacity-50 ${
        sizes[props.size || 'md']
      } ${props.class || ''}`}
      classList={{
        'bg-neutral-200 dark:bg-neutral-700 opacity-100': props.active,
      }}
    >
      <Icon path={props.icon} class={iconSizes[props.size || 'md']} />
      {props.children}
    </button>
  );
};
