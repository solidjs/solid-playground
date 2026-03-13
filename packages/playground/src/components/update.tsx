import type { Component } from 'solid-js';
import { Portal } from 'solid-js/web';

import { Icon } from 'solid-heroicons';
import { xMark } from 'solid-heroicons/outline';

export const Update: Component<{
  onDismiss: (...args: unknown[]) => unknown;
}> = (props) => {
  const mount = document.getElementById('update');

  return (
    <Portal mount={mount!}>
      <div class="z-10 border-blue-400 bg-blue-200 px-6 py-4 max-w-sm rounded border text-solidc shadow">
        <button title="close" onClick={props.onDismiss} class="top-1 right-1 hover:text-blue-900 absolute">
          <Icon path={xMark} class="h-6" />
        </button>
        <p class="font-semibold">There's a new update available.</p>
        <p class="mt-2">Refresh your browser or click the button below to get the latest update of the REPL.</p>
        <button
          onClick={() => location.reload()}
          class="mt-4 bg-blue-800 px-3 py-1 text-blue-200 hover:bg-blue-900 rounded text-sm uppercase tracking-wide"
        >
          Refresh
        </button>
      </div>
    </Portal>
  );
};
