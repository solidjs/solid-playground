import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const resolveModule = (specifier: string) => fileURLToPath(import.meta.resolve(specifier));
const eslintUniversal = resolveModule('eslint/universal');
const pathe = resolveModule('pathe');
const nodeStub = resolve(import.meta.dirname, 'linter/nodeStub.cjs');

export const linterAliases: Record<string, string> = {
  'eslint/universal': eslintUniversal,
  'eslint/use-at-your-own-risk': nodeStub,
  'eslint': resolve(import.meta.dirname, 'linter/eslintShim.ts'),
  'tinyglobby': nodeStub,
  'node:fs': nodeStub,
  'node:url': nodeStub,
  'node:util': nodeStub,
  'node:path': pathe,
  'esquery': createRequire(eslintUniversal).resolve('esquery/dist/esquery.min.js'),
};

export const linterDefine: Record<string, string> = {
  'process.env': '{}',
  'process.platform': '""',
};
