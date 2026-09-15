import { batch } from 'solid-js';

export const batched =
  <A extends unknown[], R>(fn: (...args: A) => R) =>
  (...args: A): R =>
    batch(() => fn(...args));
