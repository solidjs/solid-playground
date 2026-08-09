export interface WorkerErrorPayload {
  message: string;
  stack?: string;
}

export interface WorkerMessage {
  event: string;
  id?: number;
  error?: WorkerErrorPayload;
  [key: string]: unknown;
}

export interface WorkerClient {
  request<R = WorkerMessage>(event: string, payload?: Record<string, unknown>): Promise<R>;
  tryRequest<R = WorkerMessage>(event: string, payload?: Record<string, unknown>): Promise<R | undefined>;
  dispose(): void;
}

interface PendingRequest {
  resolve(value: WorkerMessage): void;
  reject(reason: Error): void;
}

export function createWorkerClient(worker: Worker): WorkerClient {
  let nextId = 0;
  const pending = new Map<number, PendingRequest>();

  const onMessage = ({ data }: MessageEvent<WorkerMessage>) => {
    const id = data?.id;
    if (typeof id !== 'number') return;
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (data.event === 'ERROR') {
      const err: WorkerErrorPayload = data.error ?? { message: 'Unknown worker error' };
      const error = new Error(err.message);
      if (err.stack) error.stack = err.stack;
      entry.reject(error);
    } else {
      entry.resolve(data);
    }
  };

  worker.addEventListener('message', onMessage);

  const request = <R>(event: string, payload?: Record<string, unknown>) => {
    const id = ++nextId;
    return new Promise<R>((resolve, reject) => {
      pending.set(id, { resolve: (value) => resolve(value as R), reject });
      worker.postMessage({ ...payload, event, id });
    });
  };

  return {
    request,
    tryRequest: <R>(event: string, payload?: Record<string, unknown>) =>
      request<R>(event, payload).catch(() => undefined),
    dispose() {
      worker.removeEventListener('message', onMessage);
      pending.clear();
    },
  };
}

export function latest<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  let token = 0;
  return async (...args: A): Promise<R | undefined> => {
    const mine = ++token;
    const result = await fn(...args);
    return mine === token ? result : undefined;
  };
}
