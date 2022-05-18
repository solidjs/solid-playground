import { decompressFromURL as decompress } from '@amoutonbrady/lz-string';

export function parseHash<T>(hash: string): T | undefined {
  try {
    return JSON.parse(decompress(hash)!);
  } catch {
    return;
  }
}
