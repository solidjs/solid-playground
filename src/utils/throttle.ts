export const throttle = (fn: (...params: unknown[]) => unknown, wait: number) => {
  let previouslyRun: number;
  let queuedToRun: NodeJS.Timeout;

  return function invokeFn(...args: unknown[]) {
    const now = Date.now();

    clearTimeout(queuedToRun);
    queuedToRun = undefined;

    if (!previouslyRun || now - previouslyRun >= wait) {
      fn.apply(null, args);
      previouslyRun = now;
    } else {
      queuedToRun = setTimeout(invokeFn.bind(null, ...args), wait - (now - previouslyRun));
    }
  };
};
