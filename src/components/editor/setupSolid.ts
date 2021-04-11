import { Uri, languages, editor } from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import vsDark from './vs_dark_good.json';
import vsLight from './vs_light_good.json';
import { loadWASM } from 'onigasm';
import { Registry } from 'monaco-textmate';
import { wireTmGrammars } from 'monaco-editor-textmate';
import onigasm from 'onigasm/lib/onigasm.wasm?url';
import typescriptReactTM from './TypeScriptReact.tmLanguage.json';
import cssTM from './css.tmLanguage.json';
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
  getWorker: function (moduleId, label: string) {
    switch (label) {
      case 'css':
        return new cssWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
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

const loadingWasm = loadWASM(onigasm);

const registry = new Registry({
  async getGrammarDefinition(scopeName) {
    return {
      format: 'json',
      content: scopeName == 'source.tsx' ? typescriptReactTM : cssTM,
    };
  },
});

const grammars = new Map();
grammars.set('typescript', 'source.tsx');
grammars.set('css', 'source.css');

// monaco's built-in themes aren't powereful enough to handle TM tokens
// https://github.com/Nishkalkashyap/monaco-vscode-textmate-theme-converter#monaco-vscode-textmate-theme-converter
editor.defineTheme('vs-dark-plus', vsDark as editor.IStandaloneThemeData);
editor.defineTheme('vs-light-plus', vsLight as editor.IStandaloneThemeData);

export async function liftOff(editor: editor.ICodeEditor) {
  await loadingWasm;
  // wireTmGrammars only cares about the language part, but asks for all of monaco
  // we fool it by just passing in an object with languages
  wireTmGrammars({ languages } as any, registry, grammars, editor);
}
