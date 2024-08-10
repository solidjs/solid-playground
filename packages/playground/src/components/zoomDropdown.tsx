import { magnifyingGlassPlus } from 'solid-heroicons/outline';
import Dismiss from 'solid-dismiss';
import { Component, createSignal, createEffect } from 'solid-js';
import { useZoom } from 'solid-repl/src/hooks/useZoom';
import { HeaderIcon } from './header';

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
      <HeaderIcon
        menu={props.showMenu}
        ref={btnEl}
        path={magnifyingGlassPlus}
        text="Scale Editor"
        title="Scale editor to make text larger or smaller"
      />
      <Dismiss menuButton={btnEl} open={open} setOpen={setOpen}>
        <div
          class="dark:bg-darkbg border-bord absolute z-10 w-min rounded border bg-white p-2"
          classList={{
            'left-1/4': props.showMenu,
          }}
          style={{
            transform: 'translateX(calc(2rem - 100%))',
          }}
        >
          <div class="flex">
            <button
              class="border-1 border-bord rounded-l px-3 py-1 text-sm uppercase tracking-wide hover:bg-gray-200 dark:hover:bg-neutral-700"
              aria-label="decrease font size"
              onClick={() => updateZoom('decrease')}
            >
              -
            </button>
            <div class="border-1 border-bord w-20 px-3 py-1 text-center text-sm uppercase tracking-wide">
              {zoomState.zoom}%
            </div>
            <button
              class="border-1 border-bord mr-4 rounded-r px-3 py-1 text-sm uppercase tracking-wide hover:bg-gray-200 dark:hover:bg-neutral-700"
              aria-label="increase font size"
              onClick={() => updateZoom('increase')}
            >
              +
            </button>
            <button
              class="border-1 border-bord rounded px-3 py-1 text-sm uppercase tracking-wide hover:bg-gray-200 dark:hover:bg-neutral-700"
              aria-label="reset font size"
              onClick={() => updateZoom('reset')}
            >
              Reset
            </button>
          </div>

          <label class="my-3 block cursor-pointer dark:text-white">
            <input
              type="checkbox"
              class="mr-4 cursor-pointer"
              checked={zoomState.overrideNative}
              onChange={(e) => setZoomState('overrideNative', e.currentTarget.checked)}
            />
            Override browser zoom keyboard shortcut
          </label>
          <label class="my-3 block cursor-pointer dark:text-white">
            <input
              type="checkbox"
              class="mr-4 cursor-pointer"
              checked={zoomState.scaleIframe}
              onChange={(e) => setZoomState('scaleIframe', e.currentTarget.checked)}
            />
            Scale iframe <strong>Result</strong>
          </label>
        </div>
      </Dismiss>
    </div>
  );
};
