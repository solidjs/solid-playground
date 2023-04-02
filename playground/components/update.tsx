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
      <div class="text-brand-default z-10 max-w-sm rounded border border-blue-400 bg-blue-200 px-6 py-4 shadow">
        <button title="close" onClick={props.onDismiss} class="absolute right-1 top-1 hover:text-blue-900">
          <Icon path={xMark} class="h-6" />
        </button>
        <p class="font-semibold">There's a new update available.</p>
        <p class="mt-2">Refresh your browser or click the button below to get the latest update of the REPL.</p>
        <button
          onClick={() => location.reload()}
          class="mt-4 rounded bg-blue-800 px-3 py-1 text-sm uppercase tracking-wide text-blue-200 hover:bg-blue-900"
        >
          Refresh
        </button>
      </div>
    </Portal>
  );
};
