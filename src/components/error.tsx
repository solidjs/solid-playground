import { Component, createEffect, createSignal } from 'solid-js';

import { Icon } from 'solid-heroicons';
import { chevronDown, chevronRight } from 'solid-heroicons/solid';

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

export const Error: Component<{
  onDismiss: (...args: unknown[]) => unknown;
  message: string;
}> = (props) => {
  const [firstLine, stackTrace] = doSomethingWithError(props.message);
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <details
      class="border-t-2 border-red-300 bg-red-200 p-2 text-red-800"
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
