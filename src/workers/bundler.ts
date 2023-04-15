import { transform } from '@babel/standalone';
//@ts-ignore
import babelPresetSolid from 'babel-preset-solid';
import dd from 'dedent';
let files: Record<string, string> = {};
let allImports: string[] = [];
const CDN_URL = (importee: string) => `https://jspm.dev/${importee}`;
function uid(str: string) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}
let currentFileImports: string[] = [];
function babelTransform(filename: string, code: string) {
  let { code: transformedCode } = transform(code, {
    plugins: [
      function importGetter() {
        return {
          visitor: {
            ImportDeclaration(path: any) {
              const importee = path.node.source.value;
              if (!currentFileImports.includes(importee)) currentFileImports.push(path.node.source.value);
            },
          },
        };
      },
    ],
    presets: [
      [babelPresetSolid, { generate: 'dom', hydratable: false }],
      ['typescript', { onlyRemoveTypeImports: true }],
    ],
    filename: filename + '.tsx',
  });
  return transformedCode;
}

// Returns new import URL
function transformImportee(fileName: string) {
  // There's no point re-visiting a node again, as it's already been processed
  if (allImports.includes(fileName)) {
    return;
  }
  allImports.push(fileName);
  // Base cases
  if (fileName.includes('://')) {
    if (fileName.endsWith('.css')) {
      const id = uid(fileName);
      const js = dd`
    (() => {
      let link = document.getElementById('${id}');
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('id', ${id})
        document.head.appendChild(link)
      }
      link.setAttribute('rel', 'stylesheet')
      link.setAttribute('href', '${fileName}')
    })()
  `;
      return [{ name: fileName, contents: js }];
    }
    return [{ name: fileName, external: true }];
  }
  if (!fileName.startsWith('.')) {
    return [{ name: fileName, external: true }];
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
    return [{ name: fileName, contents: js }];
  }
  let dataToReturn: { name: string; contents?: string; external?: boolean }[] = [];
  // Parse file and all its children through recursion
  const contents = files[fileName];
  const parsedContents = babelTransform(fileName, contents);
  const imports = structuredClone(currentFileImports);
  currentFileImports = [];
  // console.log(imports);
  for (let i = 0; i < imports.length; i++) {
    const importee = imports[i];
    // console.log(transformImportee("./tab2"))
    // transformImportee('./tab3');
    const transformed = transformImportee(importee);
    if (transformed == undefined) continue;

    dataToReturn = dataToReturn.concat(transformed);
  }
  dataToReturn.push({ name: fileName, contents: parsedContents! });
  return dataToReturn;
}
export function bundle(entryPoint: string, fileRecord: Record<string, string>) {
  files = fileRecord;
  return { code: transformImportee(entryPoint) };
}
