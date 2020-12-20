import { decompressFromEncodedURIComponent } from "lz-string";

export function parseHash<T>(hash: string, fallback: T) {
  try {
    return JSON.parse(decompressFromEncodedURIComponent(hash)!);
  } catch {
    return fallback;
  }
}
