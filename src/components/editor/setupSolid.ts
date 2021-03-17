import { Uri, languages, editor } from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import sPackageJson from '/node_modules/solid-js/package.json?raw';
import sWebPackageJson from '/node_modules/solid-js/web/package.json?raw';
import sIndex from '/node_modules/solid-js/types/index.d.ts?raw';
import sJsx from '/node_modules/solid-js/types/jsx.d.ts?raw';
import sArray from '/node_modules/solid-js/types/reactive/array.d.ts?raw';
import sMutable from '/node_modules/solid-js/types/reactive/mutable.d.ts?raw';
import sScheduler from '/node_modules/solid-js/types/reactive/scheduler.d.ts?raw';
import sSignal from '/node_modules/solid-js/types/reactive/signal.d.ts?raw';
import sState from '/node_modules/solid-js/types/reactive/state.d.ts?raw';
import sStateModifier from '/node_modules/solid-js/types/reactive/stateModifiers.d.ts?raw';
import sComponent from '/node_modules/solid-js/types/render/component.d.ts?raw';
import sFlow from '/node_modules/solid-js/types/render/flow.d.ts?raw';
import sHydration from '/node_modules/solid-js/types/render/hydration.d.ts?raw';
import sRenderIndex from '/node_modules/solid-js/types/render/index.d.ts?raw';
import sSuspense from '/node_modules/solid-js/types/render/Suspense.d.ts?raw';
import sClient from '/node_modules/solid-js/web/types/client.d.ts?raw';
import sCore from '/node_modules/solid-js/web/types/core.d.ts?raw';
import sWebIndex from '/node_modules/solid-js/web/types/index.d.ts?raw';
import sWebJsx from '/node_modules/solid-js/web/types/jsx.d.ts?raw';
import sServerMock from '/node_modules/solid-js/web/types/server-mock.d.ts?raw';
import sJsxRuntime from '/node_modules/solid-js/jsx-runtime.d.ts?raw';

// Tell monaco about the file from solid-js
function cm(a: string, b: string) {
  editor.createModel(a, 'typescript', Uri.parse(`file:///node_modules/solid-js/${b}`));
}

cm(sPackageJson, 'package.json');
cm(sWebPackageJson, 'web/package.json');
cm(sIndex, 'types/index.d.ts');
cm(sJsx, 'types/jsx.d.ts');
cm(sArray, 'types/reactive/array.d.ts');
cm(sMutable, 'types/reactive/mutable.d.ts');
cm(sScheduler, 'types/reactive/scheduler.d.ts');
cm(sSignal, 'types/reactive/signal.d.ts');
cm(sState, 'types/reactive/state.d.ts');
cm(sStateModifier, 'types/reactive/stateModifiers.d.ts');
cm(sComponent, 'types/render/component.d.ts');
cm(sFlow, 'types/render/flow.d.ts');
cm(sHydration, 'types/render/hydration.d.ts');
cm(sRenderIndex, 'types/render/index.d.ts');
cm(sSuspense, 'types/render/Suspense.d.ts');
cm(sClient, 'web/types/client.d.ts');
cm(sCore, 'web/types/core.d.ts');
cm(sWebIndex, 'web/types/index.d.ts');
cm(sWebJsx, 'web/types/jsx.d.ts');
cm(sServerMock, 'web/types/server-mock.d.ts');
cm(sJsxRuntime, 'jsx-runtime.d.ts');

(window as any).MonacoEnvironment = {
  getWorker: function (moduleId, label) {
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

languages.typescript.typescriptDefaults.setCompilerOptions({
  lib: ['es6', 'DOM', 'dom.iterable'],
  target: languages.typescript.ScriptTarget.ESNext,
  moduleResolution: languages.typescript.ModuleResolutionKind.NodeJs,
  jsx: languages.typescript.JsxEmit.Preserve,
  jsxImportSource: 'solid-js',
  allowNonTsExtensions: true,
});
