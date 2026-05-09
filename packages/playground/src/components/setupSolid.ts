import { typescript } from 'monaco-editor';
import { createEffect } from 'solid-js';
import type { SolidVersion } from 'solid-repl';
import type { Repl as ReplProps } from 'solid-repl/dist/repl';
import repl from 'solid-repl/src/repl';

const commonTypes: Record<string, string> = import.meta.glob('/node_modules/csstype/**/*.{d.ts,json}', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const solidV1Types: Record<string, string> = import.meta.glob('/node_modules/solid-js/**/*.{d.ts,json}', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const solidV2Types: Record<string, string> = import.meta.glob(
  '/node_modules/{solid-js-v2,@solidjs\\/signals,@solidjs\\/web}/**/*.{d.ts,json}',
  {
    eager: true,
    query: '?raw',
    import: 'default',
  },
);

let currentVersion: SolidVersion | undefined;
let disposables: { dispose: () => void }[] = [];

const addLib = (path: string, source: string) => {
  disposables.push(typescript.typescriptDefaults.addExtraLib(source, `file://${path}`));
  disposables.push(typescript.javascriptDefaults.addExtraLib(source, `file://${path}`));
};

const setCompilerOptions = (version: SolidVersion) => {
  const compilerOptions: typescript.CompilerOptions = {
    strict: true,
    target: typescript.ScriptTarget.ESNext,
    module: typescript.ModuleKind.ESNext,
    moduleResolution: typescript.ModuleResolutionKind.NodeJs,
    jsx: typescript.JsxEmit.Preserve,
    jsxImportSource: version === 'v2' ? '@solidjs/web' : 'solid-js',
    allowNonTsExtensions: true,
  };

  typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
  typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
};

const setSolidTypes = (version: SolidVersion) => {
  if (version === currentVersion) return;

  currentVersion = version;
  setCompilerOptions(version);
  for (const disposable of disposables) disposable.dispose();
  disposables = [];

  for (const path in commonTypes) {
    addLib(path, commonTypes[path]);
  }

  const solidTypes = version === 'v2' ? solidV2Types : solidV1Types;
  for (const path in solidTypes) {
    addLib(path.replace('/solid-js-v2/', '/solid-js/'), solidTypes[path]);
  }
};

const Repl: ReplProps = (props) => {
  createEffect(() => setSolidTypes(props.solidVersion));
  return repl(props);
};

export default Repl;
