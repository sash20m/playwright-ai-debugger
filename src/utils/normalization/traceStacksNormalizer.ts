import { ParseError } from '../../errors';
import { ITraceNormalizer } from './types';

// Types for the normalized trace.stacks data
export interface TraceStackCall {
  functionName: string;
  line: number;
  column: number;
}

export interface NormalizedTraceStackFile {
  filePath: string;
  calls: TraceStackCall[];
}

// Types for the raw trace.stacks data
interface RawTraceStacksData {
  files: string[];
  stacks: [number, [number, number, number, string][]][];
}

/**
 * Normalizes Playwright trace.stacks data from compact array format
 * to a file-centric structure grouped by file path.
 */
export class TraceStacksNormalizer implements ITraceNormalizer {
  traces: NormalizedTraceStackFile[] = [];

  constructor(traceContent: string) {
    this.normalize(traceContent);
  }

  /**
   * It parses the stacks objects and grouped in a coherent object only the necessary information from the file: the file path,
   * and what functions have been called there (with line,column)
   */
  normalize(traceContent: string) {
    let parsed: RawTraceStacksData;
    try {
      parsed = JSON.parse(traceContent);
    } catch (e) {
      throw new ParseError('Invalid trace.stacks data: not valid JSON');
    }
    const { files, stacks } = parsed;

    const fileCallsMap = new Map<number, TraceStackCall[]>();

    stacks.forEach(([_, rawFrames]) => {
      rawFrames.forEach(([fileIndex, line, column, functionName]) => {
        if (!fileCallsMap.has(fileIndex)) {
          fileCallsMap.set(fileIndex, []);
        }

        fileCallsMap.get(fileIndex)!.push({
          functionName: functionName || '<anonymous>',
          line,
          column,
        });
      });
    });

    const normalizedFiles: NormalizedTraceStackFile[] = [];

    fileCallsMap.forEach((calls, fileIndex) => {
      const filePath = files[fileIndex] || `<unknown file at index ${fileIndex}>`;
      normalizedFiles.push({
        filePath,
        calls,
      });
    });

    this.traces = normalizedFiles;
  }

  formatFile(file: NormalizedTraceStackFile): string {
    const header = `File: ${file.filePath}`;
    const calls = file.calls
      .map(call => {
        return `  ${call.functionName} (line ${call.line}, col ${call.column})`;
      })
      .join('\n');

    return `${header}\n${calls}`;
  }

  // Returns the normalized version of the trace.stacks is a simple format to be consumed by LLMs.
  formatForLLMConsumption(): string {
    return this.traces.map(file => this.formatFile(file)).join('\n\n');
  }
}
