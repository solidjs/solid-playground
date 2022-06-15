import { Component, createSignal, createEffect, onCleanup } from 'solid-js';
import { throttle } from '@solid-primitives/scheduled';
import { Dot } from './dot';

interface GridResizerProps {
  ref: (el: HTMLDivElement) => void;
  isHorizontal: boolean;
  onResize: (clientX: number, clientY: number) => void;
}

export const GridResizer: Component<GridResizerProps> = (props) => {
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
    props.ref(el);

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

  return (
    <div
      ref={setRef}
      class="flex justify-center group items-center border-slate-200 dark:border-neutral-800 hover:bg-brand-default dark:hover:bg-brand-default"
      classList={{
        'bg-brand-default dark:bg-brand-default': isDragging(),
        'bg-slate-50 dark:bg-solid-darkbg/70': !isDragging(),
        'flex-col cursor-col-resize border-l-2 border-r-2': props.isHorizontal,
        'flex-row cursor-row-resize border-t-2 border-b-2': !props.isHorizontal,
      }}
    >
      <div
        classList={{
          'fixed inset-0 z-10': isDragging(),
          'hidden': !isDragging(),
          'cursor-col-resize': props.isHorizontal,
          'cursor-row-resize': !props.isHorizontal,
        }}
      />
      <Dot isDragging={isDragging()} />
      <Dot isDragging={isDragging()} />
      <Dot isDragging={isDragging()} />
    </div>
  );
};
