import { version } from 'solid-js/package.json';

export const DEFAULT_SOLID_VERSION = version;

export const resolveSolidVersion = (version: string | undefined): string => version || DEFAULT_SOLID_VERSION;
