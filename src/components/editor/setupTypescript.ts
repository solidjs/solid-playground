import { languages } from 'monaco-editor';

const compilerOptions: languages.typescript.CompilerOptions = {
  target: languages.typescript.ScriptTarget.ESNext,
  allowNonTsExtensions: true,
  jsx: languages.typescript.JsxEmit.Preserve,
  noEmit: true,
  module: languages.typescript.ModuleKind.ESNext,
  moduleResolution: languages.typescript.ModuleResolutionKind.NodeJs,
  strict: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  importHelpers: true,
  esModuleInterop: true,
  jsxImportSource: 'solid-js',
};

languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
