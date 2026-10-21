// Solid 2 batches writes automatically (applied on the next microtask, or with `flush()`).
// Kept as a passthrough for API compatibility with consumers that imported it.
export const batched =
  <A extends unknown[], R>(fn: (...args: A) => R) =>
  (...args: A): R =>
    fn(...args);
