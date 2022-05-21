import { onCleanup, createEffect, createSignal, untrack, createRoot, Signal } from 'solid-js';

// A modified version of Ryan's https://codesandbox.io/s/explicit-keys-4iyen?file=/Key.js
// This version is designed to call a function on creation and onCleanup on removal
// for a certain keying function (the by parameter)
// this does not return any values, and is designed as more of a hook
export const keyedMap = <T>(props: { by: (a: T) => string; children: (a: () => T) => void; each: T[] }): void => {
  const key = props.by;
  const mapFn = props.children;
  const disposers = new Map<string, () => void>();
  let prev = new Map<string, Signal<T>>();
  onCleanup(() => {
    for (const disposer of disposers.values()) disposer();
  });

  return createEffect(() => {
    const list = props.each || [];
    const newNodes = new Map<string, Signal<T>>();
    return untrack(() => {
      for (const listItem of list) {
        const keyValue = key(listItem);
        const lookup = prev.get(keyValue);
        if (!lookup) {
          createRoot((dispose) => {
            disposers.set(keyValue, dispose);
            const item = createSignal(listItem);
            const result = mapFn(item[0]);
            newNodes.set(keyValue, item);
            return result;
          });
        } else {
          lookup[1](listItem as Exclude<T, Function>);
          newNodes.set(keyValue, lookup);
        }
      }
      // disposal
      for (const old of prev.keys()) {
        if (!newNodes.has(old)) disposers.get(old)!();
      }
      prev = newNodes;
    });
  });
};
