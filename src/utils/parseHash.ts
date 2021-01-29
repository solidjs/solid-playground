import { decompressFromURL as decompress } from '@amoutonbrady/lz-string';

export function parseHash<T>(hash: string, fallback: T) {
  try {
    return JSON.parse(decompress(hash)!);
  } catch {
    return fallback;
  }
}
