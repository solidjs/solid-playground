import { languages } from 'monaco-editor';

const solidTypes = import.meta.glob('/node_modules/solid-js/**/*.{d.ts,json}', { eager: true, as: 'raw' });

for (const path in solidTypes) {
  languages.typescript.typescriptDefaults.addExtraLib(solidTypes[path], `file://${path}`);
  languages.typescript.javascriptDefaults.addExtraLib(solidTypes[path], `file://${path}`);
}

import repl from '../../src/repl';
export default repl;
