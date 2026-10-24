// Solid version previews use when the host does not pass `version` (or passes ''). Its compiler is
// bundled in the compiler worker; keep in step with the @solidjs/babel-plugin devDependency.
// Kept free of solid-js imports so the compiler worker can use it.
export const DEFAULT_SOLID_VERSION = '2.0.0-rc.18';

/** Normalizes a host-supplied version: empty means the bundled default. */
export const resolveSolidVersion = (version: string | undefined): string => version || DEFAULT_SOLID_VERSION;
