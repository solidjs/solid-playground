import { Registry } from 'monaco-textmate';
import { wireTmGrammars } from 'monaco-editor-textmate';
import * as monaco from 'monaco-editor';
import cssDefinition from './languages/css.tmLanguage.json?url';
import tsxDefinition from './languages/TypeScriptReact.tmLanguage.json?url';

const grammars = new Map();
grammars.set('css', 'source.css');
// grammars.set('javascript', 'source.js');
grammars.set('javascript', 'source.js.jsx');
// grammars.set('jsx', 'source.js.jsx');
// grammars.set('tsx', 'source.tsx');
// grammars.set('typescript', 'source.ts');
grammars.set('typescript', 'source.tsx');

const inverseGrammars: Record<string, string> = {
  'source.css': 'css',
  'source.js': 'jsx',
  // 'source.js': 'javascript',
  'source.js.jsx': 'jsx',
  'source.tsx': 'tsx',
  // 'source.ts': 'typescript',
};


function createRegistry(): Registry {
  return new Registry({
    getGrammarDefinition: async (scopeName) => {
      console.log(scopeName);
      switch (inverseGrammars[scopeName]) {
        case 'css':
          return {
            format: 'json',
            content: await (await fetch(cssDefinition)).text(),
          };
        case 'jsx':
        case 'typescript':
        case 'javascript':
        case 'tsx':
        default:
          return {
            format: 'json',
            content: await (await fetch(tsxDefinition)).text(),
          };
      }
    },
  });
}

let LOADED = false;

export default async function setupLanguages(
  editor: monaco.editor.ICodeEditor,
): Promise<void> {
  if (LOADED) {
    return;
  }
  LOADED = true;
  await wireTmGrammars(
    monaco,
    createRegistry(),
    grammars,
    editor,
  );
}