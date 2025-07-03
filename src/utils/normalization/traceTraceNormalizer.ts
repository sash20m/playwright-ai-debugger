import { ITraceNormalizer } from './types';

interface TraceEntry {
  version?: number;
  type: string;
  origin?: string;
  browserName?: string;
  options?: any;
  platform?: string;
  wallTime?: number;
  monotonicTime?: number;
  sdkLanguage?: string;
  testIdAttributeName?: string;
  title?: string;
  callId?: string;
  startTime?: number;
  apiName?: string;
  class?: string;
  method?: string;
  params?: any;
  stepId?: string;
  beforeSnapshot?: string;
  endTime?: number;
  afterSnapshot?: string;
  result?: any;
  time?: number;
  message?: string;
  pageId?: string;
  sha1?: string;
  width?: number;
  height?: number;
  timestamp?: number;
  frameSwapWallTime?: number;
  snapshot?: any;
}

export type NormalizedTrace = TraceEntry[];

/**
 * Normalizes Playwright trace.trace data.
 */
export class TraceNormalizer implements ITraceNormalizer {
  traces: NormalizedTrace[] = [];
  constructor(traceContent: string) {
    this.normalize(traceContent);
  }
  normalize(rawData: string) {
    const entries = rawData.split('\n').filter(line => line.trim() !== '');
    this.traces = entries
      .map(line => JSON.parse(line) as TraceEntry)
      .map(entry => ({
        ...entry,
        ...entry.options,
        ...entry.params,
        ...entry.result,
        ...entry.snapshot,
      }));
  }

  formatForLLMConsumption(): string {
    return JSON.stringify(this.traces);
  }
}
