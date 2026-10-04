import { Linter } from 'eslint/universal';
import * as parser from '@typescript-eslint/parser';
import typescriptConfig from 'eslint-plugin-solid/configs/typescript';
import v2Config from 'eslint-plugin-solid/configs/v2';
import { serveWorker } from '../src/kernel/workerServer';

export interface LinterWorkerPayload {
  code: string;
  v2: boolean;
}

export interface LintMarker {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
  message: string;
  severity: number;
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

const messagesToMarkers = (messages: Linter.LintMessage[]): LintMarker[] => {
  if (messages.some((m) => m.fatal)) return [];
  return messages.map((m) => ({
    startLineNumber: m.line,
    endLineNumber: m.endLine ?? m.line,
    startColumn: m.column,
    endColumn: m.endColumn ?? m.column,
    message: `${m.message}\neslint(${m.ruleId})`,
    severity: m.severity === 2 ? 8 : 4,
  }));
};

serveWorker({
  LINT: ({ code, v2 }: LinterWorkerPayload) => ({
    markers: messagesToMarkers(linter.verify(code, configs[v2 ? 'v2' : 'v1'], FILENAME)),
  }),
  FIX: ({ code, v2 }: LinterWorkerPayload) => {
    const report = linter.verifyAndFix(code, configs[v2 ? 'v2' : 'v1'], FILENAME);
    return {
      markers: messagesToMarkers(report.messages),
      output: report.output,
      fixed: report.fixed,
    };
  },
});
