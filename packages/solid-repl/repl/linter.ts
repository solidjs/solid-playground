import { verify, verifyAndFix } from 'eslint-solid-standalone';
import type { Linter } from 'eslint-solid-standalone';

export interface LinterWorkerPayload {
  event: 'LINT' | 'FIX';
  id: number;
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

self.addEventListener('message', ({ data }: MessageEvent<LinterWorkerPayload>) => {
  const { event, id } = data;
  try {
    if (event === 'LINT') {
      const { code, ruleSeverityOverrides } = data;
      self.postMessage({
        event: 'LINT' as const,
        id,
        markers: messagesToMarkers(verify(code, ruleSeverityOverrides)),
      });
    } else if (event === 'FIX') {
      const { code, ruleSeverityOverrides } = data;
      const fixReport = verifyAndFix(code, ruleSeverityOverrides);
      self.postMessage({
        event: 'FIX' as const,
        id,
        markers: messagesToMarkers(fixReport.messages),
        output: fixReport.output,
        fixed: fixReport.fixed,
      });
    }
  } catch (e) {
    console.error(e);
    self.postMessage({ event: 'ERROR' as const, id, error: e });
  }
});
