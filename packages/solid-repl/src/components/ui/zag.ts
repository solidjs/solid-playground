import { createEffect, createMemo, createSignal, flush, onSettled, untrack, type Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { InputProps, Machine, MachineSchema, Service } from '@zag-js/core';
import { createNormalizer } from '@zag-js/types';
import { VanillaMachine } from '@zag-js/vanilla';

// `@zag-js/solid` (even 2.0.0-next) still targets Solid 1.

type SolidPropTypes = JSX.IntrinsicElements & {
  element: JSX.HTMLAttributes<any>;
  style: JSX.CSSProperties;
};

export function useMachine<S extends MachineSchema, Api>(
  machine: Machine<S>,
  props: () => InputProps<S>,
  connect: (service: Service<S>, normalize: typeof normalizeProps) => Api,
): { api: Accessor<Api>; send: (event: S['event']) => void } {
  let current = untrack(props);
  const vm = new VanillaMachine(machine, () => current);
  const [version, setVersion] = createSignal(0);
  // zag looks up the nodes it just opened before the next frame, so its updates flush immediately.
  let inSolidQueue = false;
  const unsubscribe = vm.subscribe(() => {
    setVersion((v) => v + 1);
    if (!inSolidQueue) flush();
  });
  const insideSolidQueue = (fn: () => void) => {
    inSolidQueue = true;
    try {
      fn();
    } finally {
      inSolidQueue = false;
    }
  };

  createEffect(props, (next) => {
    if (next === current) return;
    current = next;
    insideSolidQueue(() => (vm as unknown as { notify(): void }).notify());
  });

  onSettled(() => {
    insideSolidQueue(() => vm.start());
    return () => {
      unsubscribe();
      vm.stop();
    };
  });

  const api = createMemo(() => {
    version();
    return connect(vm.service, normalizeProps);
  });

  return { api, send: vm.send };
}

const propMap: Record<string, string> = {
  onFocus: 'onFocusIn',
  onBlur: 'onFocusOut',
  onDoubleClick: 'onDblClick',
  onChange: 'onInput',
  defaultChecked: 'checked',
  defaultValue: 'value',
  htmlFor: 'for',
  className: 'class',
};

const hyphenate = (name: string) =>
  name.startsWith('--') ? name : name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/^ms-/, '-ms-');

export const normalizeProps = createNormalizer<SolidPropTypes>((props) => {
  const normalized: Record<string, unknown> = {};
  for (const key in props) {
    const value = (props as Record<string, unknown>)[key];
    if (key === 'readOnly' && value === false) continue;
    if (key === 'children') {
      if (typeof value === 'string') normalized.textContent = value;
      continue;
    }
    if (key === 'style' && value && typeof value === 'object') {
      const style: Record<string, string | number> = {};
      for (const [prop, v] of Object.entries(value)) {
        if (typeof v === 'string' || typeof v === 'number') style[hyphenate(prop)] = v;
      }
      normalized.style = style;
      continue;
    }
    // Solid 2 renders boolean attributes as presence/absence; ARIA states need the literal value.
    if (key.startsWith('aria-') && typeof value === 'boolean') {
      normalized[key] = String(value);
      continue;
    }
    normalized[propMap[key] ?? key] = value;
  }
  return normalized;
});
