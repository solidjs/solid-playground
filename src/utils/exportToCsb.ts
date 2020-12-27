import pkg from '../../package.json';
import { Tab } from '../store';
import { getParameters } from 'codesandbox/lib/api/define';

type IFIles = Record<string, { content: string; isBinary: boolean }>;

export function exportToCsb(tabs: Tab[]) {
  const params = tabs.reduce<IFIles>((p, tab) => {
    p[`src/${tab.name}.${tab.type}`] = { content: tab.source, isBinary: false };
    return p;
  }, {});

  const { dependencies: d, devDependencies: dd } = pkg;

  const parameters = getParameters({
    files: {
      ...params,
      '.babelrc': {
        // @ts-ignore
        content: {
          presets: ['env', 'babel-preset-solid', '@babel/preset-typescript'],
        },
        isBinary: false,
      },
      'tsconfig.json': {
        // @ts-ignore
        content: {
          compilerOptions: {
            strict: false,
            module: 'ESNext',
            target: 'ESNext',
            jsx: 'preserve',
            esModuleInterop: true,
            sourceMap: true,
            allowJs: true,
            lib: ['es6', 'dom'],
            rootDir: 'src',
            moduleResolution: 'node',
            jsxImportSource: 'solid-js',
            types: ['solid-js', 'solid-js/dom'],
          },
        },
        isBinary: false,
      },
      'index.html': {
        content: [
          `<html>`,
          `  <head>`,
          `    <title>Parcel Sandbox</title>`,
          `    <meta charset="UTF-8" />`,
          `  </head>`,
          ``,
          `  <body>`,
          `    <div id="app"></div>`,
          ``,
          `    <script src="src/${tabs[0].name}.${tabs[0].type}"></script>`,
          `  </body>`,
          `</html>`,
        ].join('\n'),
        isBinary: false,
      },
      'package.json': {
        // @ts-ignore
        content: {
          scripts: {
            start: 'parcel index.html --open',
            build: 'parcel build index.html',
          },
          dependencies: {
            '@babel/core': dd['@babel/core'],
            '@babel/preset-typescript': d['@babel/preset-typescript'],
            'babel-preset-solid': d['babel-preset-solid'],
            'solid-js': d['solid-js'],
          },
          devDependencies: {
            'parcel-bundler': '^1.6.1',
          },
        },
        isBinary: false,
      },
    },
  });

  const url = `https://codesandbox.io/api/v1/sandboxes/define?parameters=${parameters}`;

  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener');

  document.body.appendChild(a);
  a.click();
  a.remove();
}
