// Those two function should be used to dynamically load rollup & babel
// The problem is how to bundle those as seperate chunks and then
// from a consumer still being able to resolve them.
// Ideally they would also be consumed within a web worker.
//
// Note: the globalThis types are in `./global.d.ts`

/**
 * This function load rollup into the globalThis object.
 */
export async function loadRollup() {
  if (globalThis.$rollup) return globalThis.$rollup;

  // @ts-ignore
  const { rollup } = await import('rollup/dist/rollup.browser.js');
  globalThis.$rollup = rollup;

  return globalThis.$rollup!;
}

/**
 * This function loads babel into the globalThis object.
 * The solid version could be used from a cdn like so:
 * import(`https://esm.sh/babel-preset-solid${_SOLID_VERSION}`)
 *
 * @param _SOLID_VERSION {string} - The solid compiler version
 */
export async function loadBabel() {
  if (globalThis.$babel) return globalThis.$babel;

  const { transform } = await import('@babel/standalone');
  const ts = await import('@babel/preset-typescript');
  const solid = await import('babel-preset-solid');

  globalThis.$babel = (code: string, opts: { babel: any; solid: any } = { babel: {}, solid: {} }) =>
    transform(code, {
      presets: [[solid, { ...opts.solid }], ts],
      ...opts.babel,
    });

  return globalThis.$babel;
}
