import { Icon } from 'solid-heroicons';
import { magnifyingGlassPlus } from 'solid-heroicons/outline';
import Dismiss from 'solid-dismiss';
import { Component, createSignal, createEffect } from 'solid-js';
import { useZoom } from 'solid-repl/src/hooks/useZoom';
import { Button } from 'solid-repl/src/components/ui/Button';
import { Checkbox } from 'solid-repl/src/components/ui/Checkbox';

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
      <Button
        type="button"
        classList={{
          'rounded-none active:bg-gray-300 hover:bg-gray-300 dark:hover:text-black': props.showMenu,
          'bg-gray-300 dark:text-black': open() && props.showMenu,
        }}
        title="Scale editor to make text larger or smaller"
        ref={btnEl}
      >
        <Icon class="h-6" path={magnifyingGlassPlus} />
        <span class="text-xs md:sr-only">Scale Editor</span>
      </Button>
      <Dismiss menuButton={btnEl} open={open} setOpen={setOpen}>
        <div
          class="z-10 w-min border-slate-200 bg-white p-6 dark:border-neutral-800 absolute rounded border-2 shadow-md dark:bg-darkbg"
          classList={{
            'left-1/4': props.showMenu,
          }}
          style={{
            transform: 'translateX(calc(2rem - 100%))',
          }}
        >
          <div class="space-x-0.5 flex items-center">
            <button
              class="px-3 py-1 hover:bg-gray-100 dark:border-neutral-700 dark:hover:bg-neutral-800 rounded-l border text-sm uppercase tracking-wide"
              aria-label="decrease font size"
              onClick={() => updateZoom('decrease')}
            >
              -
            </button>
            <div class="w-20 px-3 py-1 dark:border-neutral-700 border text-center text-sm uppercase tracking-wide">
              {zoomState.zoom}%
            </div>
            <button
              class="mr-4 px-3 py-1 hover:bg-gray-100 dark:border-neutral-700 dark:hover:bg-neutral-800 rounded-r border text-sm uppercase tracking-wide"
              aria-label="increase font size"
              onClick={() => updateZoom('increase')}
            >
              +
            </button>
            <button
              class="px-3 py-1 hover:bg-gray-100 dark:border-neutral-700 dark:hover:bg-neutral-800 rounded border text-sm uppercase tracking-wide"
              aria-label="reset font size"
              onClick={() => updateZoom('reset')}
            >
              Reset
            </button>
          </div>
          <div class="mt-10">
            <Checkbox
              label="Override browser zoom keyboard shortcut"
              checked={zoomState.overrideNative}
              onChange={(e) => setZoomState('overrideNative', e.currentTarget.checked)}
            />
            <Checkbox
              label="Scale iframe Result"
              checked={zoomState.scaleIframe}
              onChange={(e) => setZoomState('scaleIframe', e.currentTarget.checked)}
            />
          </div>
        </div>
      </Dismiss>
    </div>
  );
};
