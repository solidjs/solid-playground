import { languages, editor } from 'monaco-editor';
import vsDark from './vs_dark_good.json';
import vsLight from './vs_light_good.json';
import { loadWASM } from 'onigasm';
import { Registry } from 'monaco-textmate';
import { wireTmGrammars } from 'monaco-editor-textmate';
import typescriptReactTM from './TypeScriptReact.tmLanguage.json';
import cssTM from './css.tmLanguage.json';

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
