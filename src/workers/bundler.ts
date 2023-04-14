function getFileImports(contents: string) {
  // Regex below taken from https://gist.github.com/manekinekko/7e58a17bc62a9be47172
  const re = /import(?:[\s.*]([\w*{}\n\r\t, ]+)[\s*]from)?[\s*](?:["'](.*[\w]+)["'])?/gm;
  let names = [];
  while (true) {
    const res = re.exec(contents);
    if (res === null) break;
    names.push(res[2]);
  }
  return names;
}
function transformImport(importName: string) {
  if (importName.startsWith('.')) {
    // Recursively process
  }
  if (importName.includes('://')) {
    return importName;
  }
  return importName;
}
export function bundle(entryPoint: string, files: Record<string, string>) {
  const contents = files[entryPoint];
  const imports = getFileImports(contents);
  for (let i = 0; i < imports.length; i++) {
    const importName = imports[i];
  }
  return '';
}
