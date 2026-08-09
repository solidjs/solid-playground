import { Component, createMemo, createSignal } from 'solid-js';

import { Icon } from 'solid-heroicons';
import { chevronDown, chevronRight, xMark } from 'solid-heroicons/solid';
import { IconButton } from './ui/IconButton';
import { css } from 'styled-system/css';

export const Error: Component<{
  onDismiss: (...args: unknown[]) => unknown;
  message: string;
}> = (props) => {
  const lines = createMemo(() => props.message.split('\n'));
  const firstLine = () => lines()[0] ?? '';
  const stackTrace = () => lines().slice(1).join('\n');
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <div
      class={css({
        position: 'relative',
        borderTopWidth: '2px',
        borderColor: 'red.300',
        bg: 'red.50',
        p: 2,
        _dark: { bg: 'red.900/20' },
      })}
    >
      <details
        class={css({ color: 'red.800', _dark: { color: 'red.300' } })}
        onToggle={(event) => setIsOpen(event.currentTarget.open)}
      >
        <summary
          class={css({
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            pr: 8,
          })}
        >
          <Icon class={css({ mr: 1, h: 5, w: 5, opacity: 0.7 })} path={isOpen() ? chevronDown : chevronRight} />
          <code class={css({ fontSize: 'sm', fontWeight: 'medium' })} innerText={firstLine()} />
        </summary>

        <pre
          class={css({
            mt: 2,
            ml: 6,
            fontSize: 'sm',
            opacity: 0.8,
            overflow: 'auto',
            whiteSpace: 'pre',
          })}
        >
          <code innerText={stackTrace()} />
        </pre>
      </details>
      <IconButton
        icon={xMark}
        class={css({
          position: 'absolute',
          top: 2,
          right: 2,
          color: 'red.800',
          _hover: { bg: 'red.200' },
          _dark: { color: 'red.300', _hover: { bg: 'red.800/50' } },
        })}
        onClick={() => props.onDismiss()}
      />
    </div>
  );
};
