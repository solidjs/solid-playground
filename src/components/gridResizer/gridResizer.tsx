import { Component, JSX, splitProps, createSignal, createEffect, onCleanup } from 'solid-js';
import { throttle } from '../../utils/throttle';
import { Dot } from './dot';

interface GridResizerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: (el: HTMLDivElement) => any | undefined;
  isHorizontal: boolean;
  direction: 'horizontal' | 'vertical';
  onResize: (clientX: number, clientY: number) => void;
}

export const GridResizer: Component<GridResizerProps> = (props) => {
  const [local, other] = splitProps(props, [
    'ref',
    'class',
    'isHorizontal',
    'direction',
    'onResize',
  ]);

  const [isDragging, setIsDragging] = createSignal(false);

  const onResizeStart = () => {
    setIsDragging(true);
  };

  const onResizeEnd = () => {
    setIsDragging(false);
  };

  const onMouseMove = throttle((e: MouseEvent) => {
    local.onResize(e.clientX, e.clientY);
  }, 10);

  const onTouchMove = throttle((e: TouchEvent) => {
    const touch = e.touches[0];
    local.onResize(touch.clientX, touch.clientY);
  }, 10);

  const setRef = (el: HTMLDivElement) => {
    if (local.ref) {
      local.ref(el);
    }

    el.addEventListener('mousedown', onResizeStart);
    el.addEventListener('touchstart', onResizeStart);

    onCleanup(() => {
      el.removeEventListener('mousedown', onResizeStart);
      el.removeEventListener('touchstart', onResizeStart);
    });
  };

  createEffect(() => {
    if (isDragging()) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onResizeEnd);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onResizeEnd);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onResizeEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onResizeEnd);
    }
  });

  const baseClasses =
    'justify-center group items-center border-blueGray-200 dark:border-blueGray-700 hover:bg-brand-default dark:hover:bg-brand-default';
  const resizingClasses = () =>
    `${
      isDragging() ? 'bg-brand-default dark:bg-brand-default' : 'bg-blueGray-50 dark:bg-gray-900'
    }`;
  const directionClasses = () =>
    local.direction === 'horizontal'
      ? `flex-col cursor-col-resize border-l-2 border-r-2 hidden${
          !local.isHorizontal ? ' md:flex' : ' '
        }`
      : `cursor-row-resize border-t-2 border-b-2 flex${!local.isHorizontal ? ' md:hidden' : ' '}`;
  const classes = () => `${baseClasses} ${resizingClasses()} ${directionClasses()} ${local.class}`;

  return (
    <>
      <div
        class={
          isDragging()
            ? `fixed inset-0 z-50 ${
                local.direction === 'horizontal' ? 'cursor-col-resize' : 'cursor-row-resize'
              }`
            : 'hidden'
        }
      />
      <div ref={setRef} class={classes()} {...other}>
        <Dot isDragging={isDragging()} />
        <Dot isDragging={isDragging()} />
        <Dot isDragging={isDragging()} />
      </div>
    </>
  );
};
