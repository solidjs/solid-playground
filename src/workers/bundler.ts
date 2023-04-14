import { transform } from '@babel/standalone';
import type { ImportMap } from 'solid-repl';
//@ts-ignore
import babelPresetSolid from 'babel-preset-solid';
import dd from 'dedent';
let files: Record<string, string> = {};
let importMap: ImportMap = {};
let createdObjectURLs: string[] = [];
const CDN_URL = (importee: string) => `https://jspm.dev/${importee}`;
function uid(str: string) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}
function babelTransform(filename: string, code: string) {
  let { code: transformedCode } = transform(code, {
    presets: [
      [babelPresetSolid, { generate: 'dom', hydratable: false }],
      ['typescript', { onlyRemoveTypeImports: true }],
    ],
    filename: filename + '.tsx',
  });
  return transformedCode;
}
function createObjectURL(data: string) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/javascript' }));
  createdObjectURLs.push(url);
  return url;
}
// Gets all imports within the file
function getFileImports(contents: string) {
  // Regex below taken from https://gist.github.com/manekinekko/7e58a17bc62a9be47172
  const re = /import(?:[\s.*]([\w*{}\n\r\t, ]+)[\s*]from)?[\s*](?:["'](.*[\w]+)["'])?/gm;
  let names = [];
  for (const match of contents.matchAll(re)) {
    names.push({ name: match[2], index: match.index, statement: match[0] });
  }
  return names;
}

// Returns new import URL
function transformImportee(fileName: string) {
  // Base cases
  if (fileName.includes('://')) {
    return fileName;
  }
  if (!fileName.startsWith('.')) {
    const url = CDN_URL(fileName);
    importMap[fileName] = url;
    return fileName;
  }
  if (fileName.endsWith('.css')) {
    const contents = files[fileName];
    const id = uid(fileName);
    const js = dd`
    (() => {
      let stylesheet = document.getElementById('${id}');
      if (!stylesheet) {
        stylesheet = document.createElement('style')
        stylesheet.setAttribute('id', ${id})
        document.head.appendChild(stylesheet)
      }
      const styles = document.createTextNode(\`${contents}\`)
      stylesheet.innerHTML = ''
      stylesheet.appendChild(styles)
    })()
  `;
    return createObjectURL(js);
  }
  // Parse file and all its children through recursion
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
  const transpiledContents = babelTransform(fileName, newContents);
  return fileName == './main' ? transpiledContents! : createObjectURL(transpiledContents!);
}
export function bundle(entryPoint: string, fileRecord: Record<string, string>) {
  // Clean up object URLs from last run
  for (const url of createdObjectURLs) {
    URL.revokeObjectURL(url);
  }
  createdObjectURLs = [];
  files = fileRecord;
  importMap = {};
  return { code: transformImportee(entryPoint), importMap };
}
