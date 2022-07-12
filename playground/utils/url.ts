import { decompressFromURL as decompress } from '@amoutonbrady/lz-string';

/**
 * Validate that a string is a valid URL
 *
 * @param url {string} - Url to validate
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function parseHash<T>(hash: string): T | undefined {
  try {
    return JSON.parse(decompress(hash)!);
  } catch {
    return;
  }
}
