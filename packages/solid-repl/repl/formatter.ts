import { format as prettierFormat } from 'prettier/standalone';
import * as prettierPluginBabel from 'prettier/plugins/babel';
import * as prettierPluginEstree from 'prettier/plugins/estree';
import { serveWorker } from '../src/kernel/workerServer';

function format(code: string) {
  return prettierFormat(code, {
    parser: 'babel-ts',
    plugins: [prettierPluginBabel, prettierPluginEstree],
  });
}

serveWorker({
  FORMAT: async ({ code }: { code: string }) => ({ code: await format(code) }),
});

export {};
