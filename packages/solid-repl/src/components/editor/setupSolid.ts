import { languages, editor, typescript } from 'monaco-editor';
import { shikiToMonaco } from '@shikijs/monaco';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import darkPlus from '@shikijs/themes/dark-plus';
import lightPlus from '@shikijs/themes/light-plus';
import tsx from '@shikijs/langs/tsx';
import css from '@shikijs/langs/css';
import html from '@shikijs/langs/html';
import json from '@shikijs/langs/json';

const jsEngine = createJavaScriptRegexEngine();

const compilerOptions: typescript.CompilerOptions = {
  strict: true,
  target: typescript.ScriptTarget.ESNext,
  module: typescript.ModuleKind.ESNext,
  moduleResolution: typescript.ModuleResolutionKind.NodeJs,
  jsx: typescript.JsxEmit.Preserve,
  jsxImportSource: 'solid-js',
  allowNonTsExtensions: true,
};

typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

const loader = createHighlighterCoreSync({
  themes: [darkPlus, lightPlus],
  langs: [tsx, css, html, json],
  engine: jsEngine,
});

languages.register({ id: 'tsx' });
languages.register({ id: 'css' });
languages.register({ id: 'html' });
languages.register({ id: 'json' });

export function register() {
  shikiToMonaco(loader, {
    editor,
    languages: {
      ...languages,
      setTokensProvider: (id: string, provider: any) => {
        if (id === 'tsx') {
          languages.setTokensProvider('tsx', provider);
          languages.setTokensProvider('typescript', provider);
          languages.setTokensProvider('javascript', provider);
        } else languages.setTokensProvider(id, provider);
      },
    } as any,
  });
}

register();
