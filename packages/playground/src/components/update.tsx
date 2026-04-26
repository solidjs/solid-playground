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
      <div class="z-10 border-neutral-200 bg-white px-6 py-4 dark:border-neutral-700 dark:text-white dark:bg-neutral-900 relative max-w-sm rounded-lg border text-solidc shadow-lg">
        <button
          title="close"
          onClick={props.onDismiss}
          class="top-2 right-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 p-1 absolute rounded-md"
        >
          <Icon path={xMark} class="h-5" />
        </button>
        <p class="pr-6 font-semibold">There's a new update available.</p>
        <p class="mt-2 text-sm opacity-80">
          Refresh your browser or click the button below to get the latest update of the REPL.
        </p>
        <button
          onClick={() => location.reload()}
          class="mt-4 px-3 py-1.5 text-white rounded-md bg-solidc text-sm hover:bg-solidc/90"
        >
          Refresh
        </button>
      </div>
    </Portal>
  );
};
