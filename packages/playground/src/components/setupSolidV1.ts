import { languages } from 'monaco-editor';
import { createEffect, onCleanup } from 'solid-js';
import repl from 'solid-repl/src/repl';

const solidTypes: Record<string, string> = import.meta.glob('/node_modules/{solid-js,csstype}/**/*.{d.ts,json}', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export default function ReplV1(props: any) {
  createEffect(() => {
    const disposables: any[] = [];
    for (const path in solidTypes) {
      if (solidTypes[path]) {
        disposables.push(languages.typescript.typescriptDefaults.addExtraLib(solidTypes[path], `file://${path}`));
        disposables.push(languages.typescript.javascriptDefaults.addExtraLib(solidTypes[path], `file://${path}`));
      }
    }
    onCleanup(() => {
      disposables.forEach(d => d.dispose());
    });
  });

  // Call the imported component directly, preserving reactivity
  return (repl as any)(props);
}
