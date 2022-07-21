import { languages, editor } from 'monaco-editor';
import vsDark from './vs_dark_good.json';
import vsLight from './vs_light_good.json';
import { loadWASM } from 'onigasm';
import { Registry } from 'monaco-textmate';
import { wireTmGrammars } from 'monaco-editor-textmate';
import typescriptReactTM from './TypeScriptReact.tmLanguage.json';
import cssTM from './css.tmLanguage.json';
import sPackageJson from '/node_modules/solid-js/package.json?raw';
import sWebPackageJson from '/node_modules/solid-js/web/package.json?raw';
import sJsxRuntime from '/node_modules/solid-js/jsx-runtime.d.ts?raw';
import sIndex from '/node_modules/solid-js/types/index.d.ts?raw';
import sJsx from '/node_modules/solid-js/types/jsx.d.ts?raw';
import sArray from '/node_modules/solid-js/types/reactive/array.d.ts?raw';
import sObservable from '/node_modules/solid-js/types/reactive/observable.d.ts?raw';
import sScheduler from '/node_modules/solid-js/types/reactive/scheduler.d.ts?raw';
import sSignal from '/node_modules/solid-js/types/reactive/signal.d.ts?raw';
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
import sStoreIndex from '/node_modules/solid-js/store/types/index.d.ts?raw';
import sStateModifier from '/node_modules/solid-js/store/types/modifiers.d.ts?raw';
import sMutable from '/node_modules/solid-js/store/types/mutable.d.ts?raw';
import sServer from '/node_modules/solid-js/store/types/server.d.ts?raw';
import sStore from '/node_modules/solid-js/store/types/store.d.ts?raw';

// Tell monaco about the file from solid-js
function cm(source: string, path: string) {
  languages.typescript.typescriptDefaults.addExtraLib(source, `file:///node_modules/solid-js/${path}`);
  languages.typescript.javascriptDefaults.addExtraLib(source, `file:///node_modules/solid-js/${path}`);
}

cm(sPackageJson, 'package.json');
cm(sWebPackageJson, 'web/package.json');
cm(sJsxRuntime, 'jsx-runtime.d.ts');
cm(sIndex, 'types/index.d.ts');
cm(sJsx, 'types/jsx.d.ts');
cm(sArray, 'types/reactive/array.d.ts');
cm(sObservable, 'types/reactive/mutable.d.ts');
cm(sScheduler, 'types/reactive/scheduler.d.ts');
cm(sSignal, 'types/reactive/signal.d.ts');
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
cm(sStoreIndex, 'store/types/index.d.ts');
cm(sStateModifier, 'store/types/modifiers.d.ts');
cm(sMutable, 'store/types/mutable.d.ts');
cm(sServer, 'store/types/server.d.ts');
cm(sStore, 'store/types/store.d.ts');

const compilerOptions: languages.typescript.CompilerOptions = {
  strict: true,
  target: languages.typescript.ScriptTarget.ESNext,
  module: languages.typescript.ModuleKind.ESNext,
  moduleResolution: languages.typescript.ModuleResolutionKind.NodeJs,
  jsx: languages.typescript.JsxEmit.Preserve,
  jsxImportSource: 'solid-js',
  allowNonTsExtensions: true,
};

languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

let loadingWasm: Promise<void>;

const registry = new Registry({
  async getGrammarDefinition(scopeName) {
    return {
      format: 'json',
      content: scopeName === 'source.tsx' ? typescriptReactTM : cssTM,
    };
  },
});

const grammars = new Map();
grammars.set('typescript', 'source.tsx');
grammars.set('javascript', 'source.tsx');
grammars.set('css', 'source.css');

// monaco's built-in themes aren't powereful enough to handle TM tokens
// https://github.com/Nishkalkashyap/monaco-vscode-textmate-theme-converter#monaco-vscode-textmate-theme-converter
editor.defineTheme('vs-dark-plus', vsDark as editor.IStandaloneThemeData);
editor.defineTheme('vs-light-plus', vsLight as editor.IStandaloneThemeData);

const hookLanguages = languages.setLanguageConfiguration;

languages.setLanguageConfiguration = (languageId: string, configuration: languages.LanguageConfiguration) => {
  liftOff();
  return hookLanguages(languageId, configuration);
};

export async function liftOff(): Promise<void> {
  if (!loadingWasm) loadingWasm = loadWASM(window.MonacoEnvironment.onigasm);
  await loadingWasm;

  // wireTmGrammars only cares about the language part, but asks for all of monaco
  // we fool it by just passing in an object with languages
  await wireTmGrammars({ languages } as any, registry, grammars);
}
