import { ParentComponent, Component, Show } from 'solid-js';
import { Icon } from 'solid-heroicons';

export interface MenuProps {
  onClose: () => void;
  class?: string;
  style?: JSX.CSSProperties;
}

export const Menu: ParentComponent<MenuProps> = (props) => {
  return (
    <div
      class={`min-w-32 border-neutral-200 bg-white py-1 dark:border-neutral-700 dark:bg-neutral-800 z-[1000] rounded-lg border shadow-lg ${
        props.class || 'fixed'
      }`}
      style={props.style}
      onClick={(e) => e.stopPropagation()}
    >
      {props.children}
    </div>
  );
};

export interface MenuItemProps {
  label: string;
  icon?: any;
  onClick: () => void;
  variant?: 'danger' | 'default';
}

export const MenuItem: Component<MenuItemProps> = (props) => {
  return (
    <button
      class="w-full space-x-2 px-3 py-2 flex items-center text-left text-sm transition-colors"
      classList={{
        'hover:bg-neutral-50 dark:hover:bg-neutral-700': props.variant !== 'danger',
        'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20': props.variant === 'danger',
      }}
      onClick={() => {
        props.onClick();
      }}
    >
      <Show when={props.icon} fallback={<div class="h-3 w-3" />}>
        <Icon path={props.icon} class="h-3 w-3" />
      </Show>
      <span>{props.label}</span>
    </button>
  );
};
