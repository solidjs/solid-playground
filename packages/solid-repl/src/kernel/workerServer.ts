import type { WorkerMessage } from './workerClient';

export type WorkerHandlers = Record<string, (payload: never) => unknown | Promise<unknown>>;

const toErrorPayload = (e: unknown) => ({
  message: e instanceof Error ? e.message : String(e),
  stack: e instanceof Error ? e.stack : undefined,
});

export function serveWorker(handlers: WorkerHandlers): void {
  self.addEventListener('message', async ({ data }: MessageEvent<WorkerMessage>) => {
    const handler = handlers[data?.event];
    if (!handler) return;

    try {
      const result = await handler(data as never);
      self.postMessage({ ...(result as object), event: data.event, id: data.id });
    } catch (e) {
      console.error(`[worker] ${data.event} failed`, e);
      self.postMessage({ event: 'ERROR', id: data.id, error: toErrorPayload(e) });
    }
  });
}
