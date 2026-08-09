import { verify, verifyAndFix } from 'eslint-solid-standalone';
import type { Linter } from 'eslint-solid-standalone';
import { serveWorker } from '../src/kernel/workerServer';

export interface LinterWorkerPayload {
  code: string;
  ruleSeverityOverrides?: Record<string, Linter.Severity>;
}

export interface LintMarker {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
  message: string;
  severity: number;
}

const messagesToMarkers = (messages: Array<Linter.LintMessage>): Array<LintMarker> => {
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
  LINT: ({ code, ruleSeverityOverrides }: LinterWorkerPayload) => ({
    markers: messagesToMarkers(verify(code, ruleSeverityOverrides)),
  }),
  FIX: ({ code, ruleSeverityOverrides }: LinterWorkerPayload) => {
    const report = verifyAndFix(code, ruleSeverityOverrides);
    return {
      markers: messagesToMarkers(report.messages),
      output: report.output,
      fixed: report.fixed,
    };
  },
});
