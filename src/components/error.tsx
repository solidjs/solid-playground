import { Component, createEffect, createSignal } from 'solid-js';

import { Icon } from 'solid-heroicons';
import { chevronDown, chevronRight } from 'solid-heroicons/solid';

interface Props {
  onDismiss: (...args: unknown[]) => unknown;
  message: string;
}

function doSomethingWithError(message: string) {
  const [firstLine, setFirstLine] = createSignal('');
  const [stackTrace, setStackTrace] = createSignal('');

  createEffect(() => {
    const [first, ...stack] = message.split('\n');
    setFirstLine(first);
    setStackTrace(stack.join('\n'));
  });

  return [firstLine, stackTrace] as const;
}

export const Error: Component<Props> = (props) => {
  const [firstLine, stackTrace] = doSomethingWithError(props.message);
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <details
      class="bg-red-200 text-red-800 p-2 border-t-2 border-red-300"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary class="flex cursor-pointer">
        <Icon class="h-7 opacity-70" path={isOpen() ? chevronDown : chevronRight} />
        <code innerText={firstLine()}></code>
      </summary>

      <pre class="whitespace-pre-line">
        <code innerText={stackTrace()}></code>
      </pre>
    </details>
  );
};
