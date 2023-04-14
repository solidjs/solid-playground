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
    names.push({ name: match[2], index: match.index, statement: match[0] });
  }
  return names;
}

let transformedFiles: Record<string, string> = {};
function transformImportee(fileName: string) {
  // Returns new import URL
  if (fileName.includes('://')) {
    return fileName;
  }
  if (!fileName.startsWith('.')) {
    const url = CDN_URL(fileName);
    importMap[fileName] = url;
    return fileName;
  }
  const contents = files[fileName];
  const imports = getFileImports(contents);
  let newContents = contents;
  for (let i = 0; i < imports.length; i++) {
    const importee = imports[i];
    const name = importee.name;
    const importUrl = transformImportee(name);
    const newStatement = importee.statement.replace(name, importUrl!);
    newContents = newContents.replace(importee.statement, newStatement);
  }
  const transpiledContents = babelTransform(newContents);
  return fileName == './main'
    ? transpiledContents
    : URL.createObjectURL(new Blob([transpiledContents!], { type: 'application/javascript' }));
}
export function bundle(entryPoint: string, yes: Record<string, string>) {
  files = yes;
  transformedFiles = {};
  return [transformImportee(entryPoint), importMap];
}
