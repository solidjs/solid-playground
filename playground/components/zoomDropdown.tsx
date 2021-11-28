import { Icon } from 'solid-heroicons';
import { zoomIn } from 'solid-heroicons/outline';
import Dismiss from 'solid-dismiss';
import { Component, createSignal, createEffect } from 'solid-js';
import useZoom from '../../src/hooks/useZoom';

export const ZoomDropdown: Component<{ showMenu: boolean }> = (props) => {
  const [open, setOpen] = createSignal(false);
  const { zoomState, updateZoomScale, updateZoomSettings } = useZoom();
  const popupDuration = 1250;
  let containerEl!: HTMLDivElement;
  let prevZoom = zoomState.zoom;
  let timeoutId: number | null = null;
  let btnEl!: HTMLButtonElement;
  let prevFocusedEl: HTMLElement | null;
  let stealFocus = true;

  const onMouseMove = () => {
    stealFocus = true;
    window.clearTimeout(timeoutId!);
  };

  const onKeyDownContainer = (e: KeyboardEvent) => {
    if (!open()) return;

    if (e.key === 'Escape' && !stealFocus) {
      if (prevFocusedEl) {
        setOpen(false);
        prevFocusedEl.focus();
        stealFocus = true;
      }
      window.clearTimeout(timeoutId!);
    }

    if (!['Tab', 'Enter', 'Space'].includes(e.key)) return;
    stealFocus = false;
    prevFocusedEl = null;
    window.clearTimeout(timeoutId!);
  };

  createEffect(() => {
    if (prevZoom === zoomState.zoom) return;
    prevZoom = zoomState.zoom;

    if (stealFocus) {
      prevFocusedEl = document.activeElement as HTMLElement;
      btnEl.focus();
      stealFocus = false;
    }

    setOpen(true);

    window.clearTimeout(timeoutId!);

    timeoutId = setTimeout(() => {
      setOpen(false);

      stealFocus = true;
      if (prevFocusedEl) {
        prevFocusedEl.focus();
      }
    }, popupDuration);
  });

  createEffect(() => {
    if (!open()) {
      if (containerEl) {
        containerEl.removeEventListener('mousemove', onMouseMove);
      }
      stealFocus = true;
    } else {
      if (containerEl) {
        containerEl.addEventListener('mousemove', onMouseMove, { once: true });
      }
    }
  });

  return (
    <div
      class="relative"
      onKeyDown={onKeyDownContainer}
      onClick={() => {
        window.clearTimeout(timeoutId!);
      }}
      ref={containerEl}
      tabindex="-1"
    >
      <button
        type="button"
        class="dark:text-white md:text-white flex flex-row space-x-2 items-center w-full md:px-3 px-2 py-2 focus:ring-1 rounded opacity-80 hover:opacity-100"
        classList={{
          'bg-gray-900': open() && !props.showMenu,
          'bg-gray-300 dark:text-black': open() && props.showMenu,
          'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black focus:outline-none focus:highlight-none active:highlight-none focus:ring-0 active:outline-none':
            props.showMenu,
        }}
        title="Scale editor to make text larger or smaller"
        ref={btnEl}
      >
        <Icon class="h-6" path={zoomIn} />
        <span class="text-xs md:sr-only">Scale Editor</span>
      </button>
      <Dismiss menuButton={btnEl} open={open} setOpen={setOpen}>
        <div
          class="absolute top-full left-1/2 bg-white dark:bg-gray-700 text-brand-default border border-gray-900 rounded shadow  p-6 -translate-x-1/2 z-10"
          classList={{
            'left-1/4': props.showMenu,
          }}
        >
          <div class="flex">
            <button
              class="bg-gray-500 text-white px-3 py-1 rounded-l text-sm uppercase tracking-wide hover:bg-gray-800 dark:hover:bg-black"
              aria-label="decrease font size"
              onClick={() => updateZoomScale('decrease')}
            >
              -
            </button>
            <div class="text-black bg-gray-100 dark:bg-gray-200 px-3 py-1 text-sm text-center w-20 uppercase tracking-wide ">
              {zoomState.zoom}%
            </div>
            <button
              class="bg-gray-500 text-white px-3 py-1 rounded-r text-sm uppercase tracking-wide mr-4 hover:bg-gray-800 dark:hover:bg-black"
              aria-label="increase font size"
              onClick={() => updateZoomScale('increase')}
            >
              +
            </button>
            <button
              class="bg-gray-500 text-white px-3 py-1 rounded  text-sm uppercase tracking-wide hover:bg-gray-800 dark:hover:bg-black"
              aria-label="reset font size"
              onClick={() => updateZoomScale('reset')}
            >
              Reset
            </button>
          </div>
          <div className="mt-10">
            <label class="block my-3 cursor-pointer dark:text-white">
              <input
                type="checkbox"
                class="mr-4 cursor-pointer"
                checked={zoomState.overrideNative}
                onChange={(e) => updateZoomSettings('overrideNative', e.currentTarget.checked)}
              />
              Override browser zoom keyboard shortcut
            </label>
            <label class="block my-3 cursor-pointer dark:text-white">
              <input
                type="checkbox"
                class="mr-4 cursor-pointer"
                checked={zoomState.scaleIframe}
                onChange={(e) => updateZoomSettings('scaleIframe', e.currentTarget.checked)}
              />
              Scale iframe <strong>Result</strong>
            </label>
          </div>
        </div>
      </Dismiss>
    </div>
  );
};
