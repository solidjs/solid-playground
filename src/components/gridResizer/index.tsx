import { Component, createSignal, createEffect, onCleanup } from 'solid-js';
import { throttle } from '@solid-primitives/scheduled';

const Dot: Component<{ isDragging: boolean }> = (props) => {
  return (
    <span
      class="h-1 w-1 rounded-full bg-slate-300 dark:bg-white dark:group-hover:bg-slate-200"
      classList={{
        'bg-slate-200': props.isDragging,
        'dark:bg-slate-200': props.isDragging,
      }}
    />
  );
};

type SolidRef = (el: HTMLDivElement) => void;

export const GridResizer: Component<{
  ref: HTMLDivElement | SolidRef;
  isHorizontal: boolean;
  onResize: (clientX: number, clientY: number) => void;
}> = (props) => {
  const [isDragging, setIsDragging] = createSignal(false);

  const onResizeStart = () => setIsDragging(true);
  const onResizeEnd = () => setIsDragging(false);

  const onMouseMove = throttle((e: MouseEvent) => {
    props.onResize(e.clientX, e.clientY);
  }, 10);

  const onTouchMove = throttle((e: TouchEvent) => {
    const touch = e.touches[0];
    props.onResize(touch.clientX, touch.clientY);
  }, 10);

  const setRef = (el: HTMLDivElement) => {
    (props.ref as SolidRef)(el);

    el.addEventListener('mousedown', onResizeStart, { passive: true });
    el.addEventListener('touchstart', onResizeStart, { passive: true });

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

  return (
    <div
      ref={setRef}
      class="hover:bg-brand-default dark:hover:bg-brand-default flex items-center justify-center gap-2 border-slate-200 dark:border-neutral-800"
      classList={{
        'bg-brand-default dark:bg-brand-default': isDragging(),
        'bg-slate-50 dark:bg-solid-darkbg/70': !isDragging(),
        'flex-col cursor-col-resize border-l-2 border-r-2 w-[12px]': !props.isHorizontal,
        'flex-row cursor-row-resize border-t-2 border-b-2 h-[12px]': props.isHorizontal,
      }}
    >
      <div
        classList={{
          'fixed inset-0 z-10': isDragging(),
          'hidden': !isDragging(),
          'cursor-col-resize': !props.isHorizontal,
          'cursor-row-resize': props.isHorizontal,
        }}
      />
      <Dot isDragging={isDragging()} />
      <Dot isDragging={isDragging()} />
      <Dot isDragging={isDragging()} />
    </div>
  );
};
