import { Component, createEffect, createSignal } from 'solid-js';

import { Icon } from 'solid-heroicons';
import { chevronDown, chevronRight, xMark } from 'solid-heroicons/solid';
import { IconButton } from './ui/IconButton';

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
    <div class="border-red-300 bg-red-50 p-2 dark:bg-red-900/20 relative border-t-2">
      <details class="text-red-800 dark:text-red-300" onToggle={(event) => setIsOpen(event.currentTarget.open)}>
        <summary class="pr-8 flex cursor-pointer items-center">
          <Icon class="mr-1 h-5 w-5 opacity-70" path={isOpen() ? chevronDown : chevronRight} />
          <code class="text-sm font-medium" innerText={firstLine()}></code>
        </summary>

        <pre class="mt-2 ml-6 overflow-auto whitespace-pre-line text-xs opacity-80">
          <code innerText={stackTrace()}></code>
        </pre>
      </details>
      <IconButton
        icon={xMark}
        class="top-2 right-2 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-800 dark:text-red-300 absolute"
        size="sm"
        onClick={() => props.onDismiss()}
      />
    </div>
  );
};
