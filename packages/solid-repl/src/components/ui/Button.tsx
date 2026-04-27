import { ParentComponent, JSX, splitProps } from 'solid-js';
import { cva, cx } from 'styled-system/css';

const button = cva({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    rounded: 'md',
    transition: 'colors',
    _focusVisible: {
      outline: 'none',
      ring: '2px',
      ringColor: 'solidc',
    },
    _disabled: { pointerEvents: 'none', opacity: 0.5 },
  },
  variants: {
    variant: {
      primary: {
        bg: 'solidc',
        color: 'white',
        px: 4,
        py: 2,
        justifyContent: 'center',
        _hover: { bg: 'solidc/90' },
      },
      ghost: {
        color: 'neutral.700',
        px: 2,
        py: 1.5,
        _hover: { bg: 'neutral.200' },
        _dark: {
          color: 'neutral.300',
          _hover: { bg: 'neutral.800' },
        },
      },
    },
    active: {
      true: {
        bg: 'neutral.200',
        color: 'black',
        _dark: { bg: 'neutral.700', color: 'white' },
      },
    },
  },
  defaultVariants: {
    variant: 'ghost',
  },
});

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  active?: boolean;
}

export const Button: ParentComponent<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, ['variant', 'active', 'class', 'children']);

  return (
    <button {...others} class={cx(button({ variant: local.variant, active: local.active }), local.class)}>
      {local.children}
    </button>
  );
};

export interface LinkButtonProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'primary' | 'ghost';
  active?: boolean;
}

export const LinkButton: ParentComponent<LinkButtonProps> = (props) => {
  const [local, others] = splitProps(props, ['variant', 'active', 'class', 'children']);

  return (
    <a {...others} class={cx(button({ variant: local.variant, active: local.active }), local.class)}>
      {local.children}
    </a>
  );
};
