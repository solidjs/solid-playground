import { Icon } from '@amoutonbrady/solid-heroicons';
import { zoomIn } from '@amoutonbrady/solid-heroicons/outline';
import { Component, createSignal, Show } from 'solid-js';
import useFocusOut from '../../src/hooks/useFocusOut';
import useZoom from '../../src/hooks/useZoom';

export const ZoomDropdown: Component<{ showMenu: boolean }> = (props) => {
  const [_, { onFOBlur, onFOClick, onFOFocus }] = useFocusOut({ onToggle });
  const [open, setOpen] = createSignal(false);

  function onToggle(toggle: boolean) {
    setOpen(toggle);
  }

  return (
    <div class="relative" onFocusIn={onFOFocus} onFocusOut={onFOBlur} tabindex="-1">
      <button
        type="button"
        class="text-black md:text-white flex flex-row space-x-2 items-center w-full md:px-3 px-2 py-2 focus:ring-1 rounded text-white opacity-80 hover:opacity-100"
        classList={{
          'bg-gray-900': open() && !props.showMenu,
          'bg-gray-300': open() && props.showMenu,
          'rounded-none	active:bg-gray-300 hover:bg-gray-300 focus:outline-none focus:highlight-none active:highlight-none focus:ring-0 active:outline-none':
            props.showMenu,
        }}
        onClick={onFOClick}
        title="Scale editor to make text larger or smaller"
      >
        <Icon class="h-6" path={zoomIn} />
        <span class="text-xs md:sr-only">Scale Editor</span>
      </button>
      <Show when={open()}>
        <div
          class="absolute top-full left-1/2 bg-white text-brand-default border border-gray-900 rounded shadow  p-6 -translate-x-1/2 z-10"
          classList={{
            'left-1/4': props.showMenu,
          }}
        >
          <ScaleButtons></ScaleButtons>
          <div className="mt-10">
            <label class="block my-3 cursor-pointer">
              <input type="checkbox" class="mr-4 cursor-pointer" checked={true} />
              Override native zoom keyboard shortcut
            </label>
            <label class="block my-3 cursor-pointer">
              <input type="checkbox" class="mr-4 cursor-pointer" checked={true} />
              Scale iframe <strong>Result</strong>
            </label>
          </div>
        </div>
      </Show>
    </div>
  );
};

const ScaleButtons = () => {
  const { zoomState, updateZoom } = useZoom();

  return (
    <div class="flex">
      <button
        class="bg-gray-500 text-white px-3 py-1 rounded-l text-sm uppercase tracking-wide hover:bg-gray-800"
        aria-label="decrease font size"
        onClick={() => updateZoom('decrease')}
      >
        -
      </button>
      <div class="text-black bg-gray-100 px-3 py-1 text-sm text-center w-20 uppercase tracking-wide ">
        {zoomState.zoom}%
      </div>
      <button
        class="bg-gray-500 text-white px-3 py-1 rounded-r text-sm uppercase tracking-wide mr-4 hover:bg-gray-800"
        aria-label="increase font size"
        onClick={() => updateZoom('increase')}
      >
        +
      </button>
      <button
        class="bg-gray-500 text-white px-3 py-1 rounded  text-sm uppercase tracking-wide hover:bg-gray-800"
        aria-label="reset font size"
        onClick={() => updateZoom('reset')}
      >
        Reset
      </button>
    </div>
  );
};

export const ZoomAlert = () => {
  const { zoomState, updateZoom } = useZoom();

  return (
    <div>
      <ScaleButtons></ScaleButtons>
    </div>
  );
};
