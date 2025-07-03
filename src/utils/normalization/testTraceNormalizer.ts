import { ParseError } from '../../errors';
import { ITraceNormalizer } from './types';

interface StackFrame {
  file: string;
  line: number;
  column: number;
  function: string;
}

interface Attachment {
  name: string;
  contentType: string;
  sha1: string;
}

interface BaseTestTraceEntry {
  type: string;
  callId?: string;
  parentId?: string;
  startTime?: number;
  endTime?: number;
  class?: string;
  method?: string;
  apiName?: string;
  params?: Record<string, any>;
  stack?: StackFrame[];
  attachments?: Attachment[];
}

interface ContextOptionsTrace extends BaseTestTraceEntry {
  type: 'context-options';
  version: number;
  origin: string;
  browserName: string;
  options: Record<string, any>;
  platform: string;
  wallTime: number;
  monotonicTime: number;
  sdkLanguage: string;
}

interface BeforeAfterTrace extends BaseTestTraceEntry {
  type: 'before' | 'after';
  callId: string;
}

interface ErrorTrace extends BaseTestTraceEntry {
  type: 'error';
  message: string;
  stack: StackFrame[];
  error?: {
    name: string;
    message: string;
    stack: string;
  };
}

interface ExpectTrace extends BaseTestTraceEntry {
  type: 'expect';
  callId: string;
  startTime: number;
  endTime: number;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
}

interface AttachTrace extends BaseTestTraceEntry {
  type: 'attach';
  callId: string;
  startTime: number;
  endTime: number;
  attachments: Attachment[];
}

// These are just some of the types of entries.
export type TestTraceEntry =
  | ContextOptionsTrace
  | BeforeAfterTrace
  | ErrorTrace
  | ExpectTrace
  | AttachTrace
  | BaseTestTraceEntry;

/**
 * This is the final form of test.trace that will be sent to the LLMs.
 */
export interface NormalizedTestTrace {
  type: string;
  callId?: string;
  parentId?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  apiName?: string;
  params?: Record<string, any>;
  stack?: StackFrame[];
  attachments?: Attachment[];
  error?: {
    name: string;
    message: string;
    stack: string;
  };
  version?: number;
  origin?: string;
  browserName?: string;
  options?: Record<string, any>;
  platform?: string;
  wallTime?: number;
  monotonicTime?: number;
  sdkLanguage?: string;
  message?: string;
}

/**
 * Normalizes Playwright test.trace data.
 */
export class TestTraceNormalizer implements ITraceNormalizer {
  traces: NormalizedTestTrace[] = [];

  // We filter the entries that have values in "apiName" from NOISE_ENTRIES. They're just Playwright internal calls,
  // and thus irrelevant for our debugging.
  private readonly NOISE_ENTRIES = [
    /^fixture:/,
    /^browserType\./,
    /^browserContext\./,
    /^page\./,
    /^video\./,
    /^attach/,
    /^Before Hooks$/,
    /^After Hooks$/,
    /^Worker Cleanup$/,
  ];

  constructor(traceContent: string) {
    this.normalize(traceContent);
  }

  normalize(traceContent: string) {
    // Add the traces a normal objects
    const raw = this.parse(traceContent);
    // Cleans the traces of noise
    const clean = this.filter(raw);
    // Normalizes the traces based on a more readable format.
    const normalized = this.normalizeAll(clean);

    this.traces = normalized;
  }

  formatForLLMConsumption(): string {
    return JSON.stringify(this.traces);
  }

  // Takes the raw JSON objects from the trace and adds them to an array of trace logs
  private parse(content: string): TestTraceEntry[] {
    const entries: TestTraceEntry[] = [];
    for (const line of content.trim().split('\n')) {
      if (!line) continue;
      try {
        entries.push(JSON.parse(line));
      } catch (err) {
        throw new ParseError('Invalid line in trace: ' + line);
      }
    }
    return entries;
  }

  private isNoise(entry: TestTraceEntry): boolean {
    if (!entry.apiName) return false;
    return this.NOISE_ENTRIES.some(pattern => pattern.test(entry.apiName!));
  }

  private filter(entries: TestTraceEntry[]): TestTraceEntry[] {
    return entries.filter(e => !this.isNoise(e));
  }

  private normalizeAll(entries: TestTraceEntry[]): NormalizedTestTrace[] {
    return entries.map(e => this.process(e));
  }

  // Normalizes a trace with some standardization
  private process(entry: TestTraceEntry): NormalizedTestTrace {
    const base: NormalizedTestTrace = {
      type: entry.type,
      callId: entry.callId,
      parentId: entry.parentId,
      startTime: entry.startTime,
      endTime: entry.endTime,
      apiName: entry.apiName,
      params: entry.params,
      stack: entry.stack,
      attachments: entry.attachments,
    };

    if (entry?.startTime !== undefined && entry?.endTime !== undefined) {
      base.duration = entry?.endTime - entry?.startTime;
    }

    if (entry?.type === 'context-options') {
      const ctx = entry as ContextOptionsTrace;
      Object.assign(base, {
        version: ctx.version,
        origin: ctx.origin,
        browserName: ctx.browserName,
        options: ctx.options,
        platform: ctx.platform,
        wallTime: ctx.wallTime,
        monotonicTime: ctx.monotonicTime,
        sdkLanguage: ctx.sdkLanguage,
      });
    }

    if ('error' in entry && entry.error) {
      base.error = entry.error;
    }

    if (entry.type === 'error') {
      base.message = (entry as ErrorTrace).message;
    }

    return base;
  }
}
