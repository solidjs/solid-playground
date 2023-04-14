import { transform } from '@babel/standalone';
//@ts-ignore
import babelPresetSolid from 'babel-preset-solid';

let files: Record<string, string> = {};
let importMap: Record<string, string> = {};
const CDN_URL = (importee: string) => `https://jspm.dev/${importee}`;
function babelTransform(code: string) {
  let { code: transformedCode } = transform(code, {
    presets: [
      [babelPresetSolid, { generate: 'dom', hydratable: false }],
      ['typescript', { onlyRemoveTypeImports: true }],
    ],
    filename: 'file' + '.tsx',
  });
  return transformedCode;
}
function getFileImports(contents: string) {
  // Regex below taken from https://gist.github.com/manekinekko/7e58a17bc62a9be47172
  const re = /import(?:[\s.*]([\w*{}\n\r\t, ]+)[\s*]from)?[\s*](?:["'](.*[\w]+)["'])?/gm;
  let names = [];
  for (const match of contents.matchAll(re)) {
    names.push({ name: match[2], index: match.index });
  }
  return names;
}
function transformImport(importName: string) {
  if (importName.startsWith('.')) {
    const contents = transformedFiles[importName];
    const transformedCode = babelTransform(contents);
    transformedFiles[importName] = transformedCode!;
    const importURL = URL.createObjectURL(new Blob([transformedCode!], { type: 'text/javascript' }));
    return importURL;
  }
  if (importName.includes('://')) {
    return importName;
  }
  importMap[importName] = CDN_URL(importName);
  return importName;
}
let transformedFiles: Record<string, string> = {};
function transformFile(fileName: string) {
  let contents = files[fileName];
  const imports = getFileImports(contents);
  for (let i = 0; i < imports.length; i++) {
    const importInfo = imports[i];
    const { name } = importInfo;
    if (name.startsWith('.')) {
      transformFile(name);
    }
  }
  for (let i = 0; i < imports.length; i++) {
    const importInfo = imports[i];
    const { name, index } = importInfo;
    contents =
      contents.substring(0, index) +
      contents.substring(index!, contents.length - 1).replace(name, transformImport(name));
  }

  transformedFiles[fileName] = contents;
}
export function bundle(entryPoint: string, yes: Record<string, string>) {
  files = yes;
  transformedFiles = {};
  transformFile(entryPoint);
  return [babelTransform(transformedFiles[entryPoint]), importMap];
}
