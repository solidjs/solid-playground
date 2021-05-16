/**
 * Validate that a string is a valid URL
 *
 * @param url {string} - Url to validate
 */
export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
