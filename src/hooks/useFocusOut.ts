import { createEffect, createSignal, onCleanup } from 'solid-js';

type TCb = (t: boolean) => void;
export type FocusOutToggle = TCb;

const useFocusOut = (
  props: {
    onToggle?: FocusOutToggle;
    debug?: boolean;
  } = {},
) => {
  const onToggle = props.onToggle;
  const debug = props.debug || false;
  const [toggle, setToggle] = createSignal(false);
  let timeoutId: number | null = 0;
  let init = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    setToggle(false);
  };

  createEffect(() => {
    const toggleVal = toggle();

    if (!init) {
      init = true;
      return;
    }
    if (!toggleVal && debug) return;

    if (toggleVal) {
      document.addEventListener('keydown', onKeyDown);
    } else {
      document.removeEventListener('keydown', onKeyDown);
    }
    onToggle && onToggle(toggleVal);
  });

  const onFOClick = () => {
    clearTimeout(timeoutId!);
    timeoutId = null;

    const toggleVal = toggle();
    setToggle(!toggleVal);
  };

  const onFOBlur = () => {
    const newTimeout = window.setTimeout(() => {
      setToggle(false);
    });
    timeoutId = newTimeout;
  };

  const onFOFocus = () => {
    clearTimeout(timeoutId!);
    timeoutId = null;
  };

  onCleanup(() => {
    document.removeEventListener('keydown', onKeyDown);
  });

  return [[toggle, setToggle], { onFOBlur, onFOFocus, onFOClick }] as [
    [() => boolean, (v: boolean) => void],
    { onFOBlur: () => void; onFOFocus: () => void; onFOClick: () => void },
  ];
};

export default useFocusOut;
