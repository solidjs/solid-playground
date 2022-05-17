export const throttle = <T extends any[]>(fn: (...params: T) => unknown, wait: number): ((...args: T) => void) => {
  let previouslyRun: number;
  let queuedToRun: number | undefined;

  return function invokeFn(...args: T) {
    const now = Date.now();

    clearTimeout(queuedToRun);
    queuedToRun = undefined;

    if (!previouslyRun || now - previouslyRun >= wait) {
      fn(...args);
      previouslyRun = now;
    } else {
      queuedToRun = window.setTimeout(() => invokeFn(...args), wait - (now - previouslyRun));
    }
  };
};
