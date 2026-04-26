import { ParentComponent, JSX, splitProps } from 'solid-js';

const baseClasses =
  'flex items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solidc disabled:pointer-events-none disabled:opacity-50 space-x-2';

const variants = {
  primary: 'bg-solidc text-white hover:bg-solidc/90 px-4 py-2 justify-center',
  ghost: 'hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1.5',
};

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  active?: boolean;
}

export const Button: ParentComponent<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, ['variant', 'active', 'class', 'classList', 'children']);

  return (
    <button
      {...others}
      class={`${baseClasses} ${variants[local.variant || 'ghost']} ${local.class || ''}`}
      classList={{
        'bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white': local.active,
        ...local.classList,
      }}
    >
      {local.children}
    </button>
  );
};

export interface LinkButtonProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: keyof typeof variants;
  active?: boolean;
}

export const LinkButton: ParentComponent<LinkButtonProps> = (props) => {
  const [local, others] = splitProps(props, ['variant', 'active', 'class', 'classList', 'children']);

  return (
    <a
      {...others}
      class={`${baseClasses} ${variants[local.variant || 'ghost']} ${local.class || ''}`}
      classList={{
        'bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white': local.active,
        ...local.classList,
      }}
    >
      {local.children}
    </a>
  );
};
