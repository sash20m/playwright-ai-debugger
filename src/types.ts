// This is what the AI outputs after debugging on the trace logs.
export interface DebuggingReportResponse {
  folder?: string;
  filePath: string;
  line: number;
  column: number;
  function: string;
  description: string;
  issueImpact: string;
  recommendedFix: string;
  causalChain: string;
}

export interface TraceFiles {
  testTrace: string;
  traceTrace: string;
  traceStacks: string;
  traceNetwork: string;
}

// The object containing a separate trace folder (a unique failed test)
export interface FailedPlaywrightTest {
  folder: string;
  traces: TraceFiles;
}
