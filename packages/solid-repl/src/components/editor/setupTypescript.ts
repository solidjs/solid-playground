import type { LSPClient } from '@codemirror/lsp-client';
import type { Diagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';
import { createTypescriptLSPClient, createWorkerTransport, type TsLspDiagnostic } from './typescriptLsp';
import TsWorker from './tsWorker?worker';

const tsSeverity = (cat: number): Diagnostic['severity'] => {
  if (cat === 1) return 'error';
  if (cat === 0) return 'warning';
  if (cat === 2) return 'hint';
  return 'info';
};

export interface TypescriptSession {
  client: LSPClient;
  worker: Worker;
  getDiagnostics(uri: string, view: EditorView): Promise<Diagnostic[]>;
}

export function createTypescriptSession(): TypescriptSession {
  const worker = new TsWorker();
  const transport = createWorkerTransport(worker);
  const client = createTypescriptLSPClient(transport);

  return {
    client,
    worker,
    async getDiagnostics(uri, view) {
      const raw = (await client.request<{ uri: string }, TsLspDiagnostic[]>('playground/diagnostics', { uri })) ?? [];
      const docLength = view.state.doc.length;
      return raw.map((d) => {
        const start = Math.min(d.start, docLength);
        const end = Math.min(start + d.length, docLength);
        return {
          from: start,
          to: Math.max(start, end),
          severity: tsSeverity(d.severity),
          message: d.message,
          source: 'typescript',
        };
      });
    },
  };
}
