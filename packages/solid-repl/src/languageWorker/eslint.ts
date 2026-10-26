import { Linter } from 'eslint/universal';
import * as parser from '@typescript-eslint/parser';
import typescriptConfig from 'eslint-plugin-solid/configs/typescript';
import v2Config from 'eslint-plugin-solid/configs/v2';
import type { Diagnostic } from '@codemirror/lint';

interface LintPayload {
  code: string;
  v2: boolean;
}

const FILENAME = 'main.tsx';
const languageOptions = { parser, parserOptions: { ecmaFeatures: { jsx: true }, tsconfigRootDir: '/' } };
const configs = {
  v1: [{ files: [FILENAME], languageOptions, ...typescriptConfig }],
  v2: [
    {
      files: [FILENAME],
      ...v2Config,
      languageOptions: { ...v2Config.languageOptions, ...languageOptions },
      rules: { ...v2Config.rules, 'solid/jsx-no-undef': [2, { typescriptEnabled: true }] },
    },
  ],
} as Record<'v1' | 'v2', Linter.Config[]>;

const linter = new Linter({ configType: 'flat', cwd: '/' });

const toDiagnostics = (code: string, messages: Linter.LintMessage[]): Diagnostic[] => {
  if (messages.some((m) => m.fatal)) return [];
  const lineStarts = [0];
  for (let i = code.indexOf('\n'); i !== -1; i = code.indexOf('\n', i + 1)) lineStarts.push(i + 1);
  const offset = (line: number, column: number) => (lineStarts[line - 1] ?? code.length) + column - 1;
  return messages.map((m) => {
    const from = offset(m.line, m.column);
    return {
      from,
      to: Math.max(from, offset(m.endLine ?? m.line, m.endColumn ?? m.column)),
      severity: m.severity === 2 ? 'error' : 'warning',
      message: m.message,
      source: `eslint(${m.ruleId})`,
    };
  });
};

export const lint = ({ code, v2 }: LintPayload) => ({
  diagnostics: toDiagnostics(code, linter.verify(code, configs[v2 ? 'v2' : 'v1'], FILENAME)),
});

export const fix = ({ code, v2 }: LintPayload) => {
  const { output, fixed } = linter.verifyAndFix(code, configs[v2 ? 'v2' : 'v1'], FILENAME);
  return { output, fixed };
};
