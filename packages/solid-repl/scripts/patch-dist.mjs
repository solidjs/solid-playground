// Post-build: point the emitted TS LSP client at the bundled worker (dist/tsWorker.mjs) instead of
// the worker source, and drop the now-unused emitted worker sources.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const lsp = 'dist/components/editor/typescriptLsp.js';
const source = readFileSync(lsp, 'utf8');
const patched = source.replace("from './tsWorker?worker'", "from '../../tsWorker.mjs?worker'");
if (patched === source) throw new Error(`patch-dist: worker import not found in ${lsp}`);
writeFileSync(lsp, patched);

for (const file of ['tsWorker.js', 'tsWorker.d.ts', 'typeAcquisition.js', 'typeAcquisition.d.ts']) {
  rmSync(`dist/components/editor/${file}`, { force: true });
}
