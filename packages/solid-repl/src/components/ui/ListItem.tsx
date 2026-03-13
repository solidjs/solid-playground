import { ParentComponent, JSX, Show } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { Button } from './Button';

export interface ListItemProps {
  label: string;
  type?: string;
  icon?: any;
  active?: boolean;
  onClick?: (e: MouseEvent) => void;
  actions?: JSX.Element;
  endIcon?: any;
}

export const ListItem: ParentComponent<ListItemProps> = (props) => {
  return (
    <Button
      variant="ghost"
      class="w-full !p-2 justify-start !rounded-lg"
      active={props.active}
      onClick={(e) => props.onClick?.(e)}
    >
      <Show when={props.icon}>
        <div
          class="mr-3 h-8 w-8 flex shrink-0 items-center justify-center rounded-full"
          classList={{
            'bg-solidc/10 text-solidc': props.active,
            'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400': !props.active,
          }}
        >
          <Icon path={props.icon} class="h-4 w-4" />
        </div>
      </Show>
      <div class="min-w-0 flex-1 text-left">
        <div class="truncate text-sm font-medium">{props.label}</div>
        <Show when={props.type}>
          <div class="text-neutral-500 dark:text-neutral-400 text-[10px] capitalize">{props.type}</div>
        </Show>
      </div>
      <div class="space-x-1 flex shrink-0 items-center">
        {props.actions}
        <Show when={props.endIcon}>
          <Icon path={props.endIcon} class="h-4 w-4" />
        </Show>
        {props.children}
      </div>
    </Button>
  );
};
