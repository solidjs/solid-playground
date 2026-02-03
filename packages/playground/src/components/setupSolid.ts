import { typescript } from 'monaco-editor';

const solidTypes = import.meta.glob('/node_modules/{solid-js,csstype}/**/*.{d.ts,json}', { eager: true, as: 'raw' });

for (const path in solidTypes) {
  typescript.typescriptDefaults.addExtraLib(solidTypes[path], `file://${path}`);
  typescript.javascriptDefaults.addExtraLib(solidTypes[path], `file://${path}`);
}

import repl from 'solid-repl/src/repl';
export default repl;
