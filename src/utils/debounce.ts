export function debounce<Args extends any[]>(
  callback: (...params: Args) => unknown,
  wait: number,
): (...args: Args) => void {
  let timeout: number;

  return (...args: Args) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => callback(...args), wait);
  };
}
