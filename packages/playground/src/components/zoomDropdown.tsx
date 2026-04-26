import { Icon } from 'solid-heroicons';
import { magnifyingGlassPlus, minus, plus } from 'solid-heroicons/outline';
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
        <span class="text-sm md:sr-only">Scale Editor</span>
      </Button>
      <Dismiss menuButton={btnEl} open={open} setOpen={setOpen}>
        <div
          class="z-10 w-min border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900 absolute rounded-lg border shadow-lg"
          classList={{
            'left-1/4': props.showMenu,
          }}
          style={{
            transform: 'translateX(calc(2rem - 100%))',
          }}
        >
          <div class="flex items-center">
            <button
              class="border-neutral-200 p-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 inline-flex items-center justify-center rounded-l-md border"
              aria-label="decrease font size"
              onClick={() => updateZoom('decrease')}
            >
              <Icon path={minus} class="h-4 w-4" />
            </button>
            <div class="w-20 border-neutral-200 px-3 py-1 dark:border-neutral-700 border-y text-center text-sm tabular-nums">
              {zoomState.zoom}%
            </div>
            <button
              class="mr-4 border-neutral-200 p-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 inline-flex items-center justify-center rounded-r-md border"
              aria-label="increase font size"
              onClick={() => updateZoom('increase')}
            >
              <Icon path={plus} class="h-4 w-4" />
            </button>
            <button
              class="border-neutral-200 px-3 py-1 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 rounded-md border text-sm"
              aria-label="reset font size"
              onClick={() => updateZoom('reset')}
            >
              Reset
            </button>
          </div>
          <div class="mt-3 space-y-2">
            <Checkbox
              label="Override browser zoom keyboard shortcut"
              checked={zoomState.overrideNative}
              onChange={(e) => setZoomState('overrideNative', e.currentTarget.checked)}
            />
            <Checkbox
              label="Scale iframe result"
              checked={zoomState.scaleIframe}
              onChange={(e) => setZoomState('scaleIframe', e.currentTarget.checked)}
            />
          </div>
        </div>
      </Dismiss>
    </div>
  );
};
