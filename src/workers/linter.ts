import { verify, verifyAndFix } from 'eslint-solid-standalone';
import type { Linter } from 'eslint-solid-standalone';
import type { editor } from 'monaco-editor';

type RuleSeverityOverrides = Parameters<typeof verify>[1];
export interface LinterWorkerPayload {
  event: 'LINT' | 'FIX';
  code: string;
  ruleSeverityOverrides?: RuleSeverityOverrides;
}

const messagesToMarkers = (messages: Array<Linter.LintMessage>): Array<editor.IMarkerData> => {
  if (messages.some((m) => m.fatal)) return []; // no need for any extra highlights on parse errors
  return messages.map((m) => ({
    startLineNumber: m.line,
    endLineNumber: m.endLine ?? m.line,
    startColumn: m.column,
    endColumn: m.endColumn ?? m.column,
    message: `${m.message}\neslint(${m.ruleId})`,
    severity: m.severity === 2 ? 8 /* error */ : 4 /* warning */,
  }));
};

async function lintResponse(code: string, ruleSeverityOverrides?: RuleSeverityOverrides) {
  return {
    event: 'LINT' as const,
    markers: messagesToMarkers(await verify(code, ruleSeverityOverrides)),
  };
}

async function fixResponse(code: string, ruleSeverityOverrides?: RuleSeverityOverrides) {
  const fixReport = await verifyAndFix(code, ruleSeverityOverrides);
  return {
    event: 'FIX' as const,
    markers: messagesToMarkers(fixReport.messages),
    output: fixReport.output,
    fixed: fixReport.fixed,
  };
}

function errorResponse(e: any) {
  return { event: 'ERROR' as const, error: (e as Error).message };
}

self.addEventListener('message', async ({ data }: MessageEvent<LinterWorkerPayload>) => {
  const { event } = data;
  try {
    if (event === 'LINT') {
      const { code, ruleSeverityOverrides } = data;
      self.postMessage(await lintResponse(code, ruleSeverityOverrides));
    } else if (event === 'FIX') {
      const { code, ruleSeverityOverrides } = data;
      self.postMessage(await fixResponse(code, ruleSeverityOverrides));
    }
  } catch (e) {
    console.error(e);
    self.postMessage(errorResponse(e));
  }
});

type LintResponse = Awaited<ReturnType<typeof lintResponse>>;
type FixResponse = Awaited<ReturnType<typeof fixResponse>>;
type ErrorResponse = ReturnType<typeof errorResponse>;
export type LinterWorkerResponse = LintResponse | FixResponse | ErrorResponse;
