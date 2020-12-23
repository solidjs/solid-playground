export function debounce(callback: (...params: unknown[]) => unknown, wait: number) {
  let timeout: NodeJS.Timeout;

  return (...args: unknown[]) => {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => callback.apply(context, args), wait);
  };
}
