import { format as prettierFormat } from 'prettier/standalone';
import * as prettierPluginBabel from 'prettier/plugins/babel';
import * as prettierPluginEstree from 'prettier/plugins/estree';

function format(code: string) {
  return prettierFormat(code, {
    parser: 'babel-ts',
    plugins: [prettierPluginBabel, prettierPluginEstree as any],
  });
}

self.addEventListener('message', async ({ data }) => {
  const { event, code } = data;

  switch (event) {
    case 'FORMAT':
      self.postMessage({
        event: 'FORMAT',
        code: await format(code),
      });
      break;
  }
});

export {};
