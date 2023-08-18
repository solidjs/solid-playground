import { languages } from 'monaco-editor';

const solidTypes = import.meta.glob('/node_modules/{solid-js,csstype}/**/*.{d.ts,json}', { eager: true, as: 'raw' });

for (const path in solidTypes) {
  languages.typescript.typescriptDefaults.addExtraLib(solidTypes[path], `file://${path}`);
  languages.typescript.javascriptDefaults.addExtraLib(solidTypes[path], `file://${path}`);
}

import repl from 'solid-repl/src/repl';
export default repl;
