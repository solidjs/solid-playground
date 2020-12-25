// @ts-ignore
import prettier from 'prettier/esm/standalone.mjs';
// @ts-ignore
import parserBabel from 'prettier/esm/parser-babel.mjs';

function format(code: string) {
  return prettier.format(code, {
    parser: 'babel-ts',
    plugins: [parserBabel],
  });
}

self.addEventListener('message', async ({ data }) => {
  const { event, code } = data;

  switch (event) {
    case 'FORMAT':
      // @ts-ignore
      self.postMessage({
        event: 'RESULT',
        code: await format(code),
      });
      break;
  }
});
