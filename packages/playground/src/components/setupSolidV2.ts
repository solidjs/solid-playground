import { languages } from 'monaco-editor';
import { createEffect, onCleanup } from 'solid-js';
import repl from 'solid-repl/src/repl';

const solidTypes: Record<string, string> = import.meta.glob('../../../solid-v2-repl/node_modules/{@solidjs,solid-js,csstype}/**/*.{d.ts,json}', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export default function ReplV2(props: any) {
  createEffect(() => {
    const disposables: any[] = [];
    for (const path in solidTypes) {
      if (solidTypes[path]) {
        const normalizedPath = path.replace('../../../solid-v2-repl', '');
        disposables.push(languages.typescript.typescriptDefaults.addExtraLib(solidTypes[path], `file://${normalizedPath}`));
        disposables.push(languages.typescript.javascriptDefaults.addExtraLib(solidTypes[path], `file://${normalizedPath}`));
      }
    }
    onCleanup(() => {
      disposables.forEach(d => d.dispose());
    });
  });

  return (repl as any)(props);
}
