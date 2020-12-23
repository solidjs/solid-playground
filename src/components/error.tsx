import { Component } from 'solid-js';
import { Portal } from 'solid-js/web';

import { Icon } from '@amoutonbrady/solid-heroicons';
import { x } from '@amoutonbrady/solid-heroicons/outline';

interface Props {
  onDismiss: (...args: unknown[]) => unknown;
  message: string;
}

export const Error: Component<Props> = (props) => {
  const mount = document.getElementById('error');

  return (
    <Portal mount={mount}>
      <pre class="bg-red-200 text-red-800 border border-red-400 rounded shadow px-6 py-4 z-10 max-w-2xl whitespace-pre-line">
        <button
          title="close"
          type="button"
          onClick={props.onDismiss}
          class="absolute top-1 right-1 hover:text-red-900"
        >
          <Icon path={x} class="h-6 " />
        </button>
        <code innerText={props.message}></code>
      </pre>
    </Portal>
  );
};
