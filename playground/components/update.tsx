import { Component } from 'solid-js';
import { Portal } from 'solid-js/web';

import { Icon } from '@amoutonbrady/solid-heroicons';
import { x } from '@amoutonbrady/solid-heroicons/outline';

interface Props {
  onDismiss: (...args: unknown[]) => unknown;
}

export const Update: Component<Props> = (props) => {
  const mount = document.getElementById('update');

  return (
    <Portal mount={mount}>
      <div class="bg-blue-200 text-brand-default border border-blue-400 rounded shadow px-6 py-4 z-10 max-w-sm">
        <button
          title="close"
          onClick={props.onDismiss}
          class="absolute top-1 right-1 hover:text-blue-900"
        >
          <Icon path={x} class="h-6" />
        </button>
        <p class="font-semibold">There's a new update available.</p>
        <p class="mt-2">
          Refresh your browser or click the button below to get the latest update of the REPL.
        </p>
        <button
          onClick={() => location.reload()}
          class="bg-blue-800 text-blue-200 px-3 py-1 rounded mt-4 text-sm uppercase tracking-wide hover:bg-blue-900"
        >
          Refresh
        </button>
      </div>
    </Portal>
  );
};
