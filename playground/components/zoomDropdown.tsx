import { Icon } from 'solid-heroicons';
import { magnifyingGlassPlus } from 'solid-heroicons/outline';
import Dismiss from 'solid-dismiss';
import { Component, createSignal, createEffect } from 'solid-js';
import { useZoom } from '../../src/hooks/useZoom';

export const ZoomDropdown: Component<{ showMenu: boolean }> = (props) => {
  const [open, setOpen] = createSignal(false);
  const { zoomState, updateZoom, setZoomState } = useZoom();
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

    timeoutId = window.setTimeout(() => {
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
        containerEl.removeEventListener('mouseenter', onMouseMove);
      }
      stealFocus = true;
    } else {
      if (containerEl) {
        containerEl.addEventListener('mouseenter', onMouseMove, { once: true });
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
        class="flex flex-row space-x-2 items-center md:px-1 px-2 py-2 rounded opacity-80 hover:opacity-100"
        classList={{
          'rounded-none	active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black': props.showMenu,
          'bg-gray-300 dark:text-black': open() && props.showMenu,
        }}
        title="Scale editor to make text larger or smaller"
        ref={btnEl}
      >
        <Icon class="h-6" path={magnifyingGlassPlus} />
        <span class="text-xs md:sr-only">Scale Editor</span>
      </button>
      <Dismiss menuButton={btnEl} open={open} setOpen={setOpen}>
        <div
          class="absolute bg-white dark:bg-solid-darkbg rounded shadow-md border-2 border-slate-200 dark:border-neutral-800 p-6 w-min z-10"
          classList={{
            'left-1/4': props.showMenu,
          }}
          style={{
            transform: 'translateX(calc(2rem - 100%))',
          }}
        >
          <div class="flex">
            <button
              class="px-3 py-1 rounded-l text-sm uppercase tracking-wide hover:bg-gray-200 dark:hover:bg-neutral-700 border-1 dark:border-gray-700"
              aria-label="decrease font size"
              onClick={() => updateZoom('decrease')}
            >
              -
            </button>
            <div class="px-3 py-1 text-sm text-center w-20 uppercase tracking-wide border-1 dark:border-gray-700">
              {zoomState.zoom}%
            </div>
            <button
              class="px-3 py-1 rounded-r text-sm uppercase tracking-wide mr-4 hover:bg-gray-200 dark:hover:bg-neutral-700 border-1 dark:border-gray-700"
              aria-label="increase font size"
              onClick={() => updateZoom('increase')}
            >
              +
            </button>
            <button
              class="px-3 py-1 rounded  text-sm uppercase tracking-wide hover:bg-gray-200 dark:hover:bg-neutral-700 border-1 dark:border-gray-700"
              aria-label="reset font size"
              onClick={() => updateZoom('reset')}
            >
              Reset
            </button>
          </div>
          <div class="mt-10">
            <label class="block my-3 cursor-pointer dark:text-white">
              <input
                type="checkbox"
                class="mr-4 cursor-pointer"
                checked={zoomState.overrideNative}
                onChange={(e) => setZoomState('overrideNative', e.currentTarget.checked)}
              />
              Override browser zoom keyboard shortcut
            </label>
            <label class="block my-3 cursor-pointer dark:text-white">
              <input
                type="checkbox"
                class="mr-4 cursor-pointer"
                checked={zoomState.scaleIframe}
                onChange={(e) => setZoomState('scaleIframe', e.currentTarget.checked)}
              />
              Scale iframe <strong>Result</strong>
            </label>
          </div>
        </div>
      </Dismiss>
    </div>
  );
};
