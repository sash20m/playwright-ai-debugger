import * as fs from 'fs/promises';
import * as path from 'path';
import { TraceFiles } from './types';
import { ParseError, ValidationError } from '../../errors';

/**
 * TraceFileParser takes a folder path with trace files (test.trace, trace.stacks, trace.network, trace.trace),
 * and adds their content to the returning TraceFiles object.
 */
export class TraceFileParser {
  async parse(folder: string): Promise<TraceFiles> {
    const folderFiles = await fs.readdir(folder);

    const files = folderFiles.filter(f => f.includes('trace'));
    if (!files.length) throw new ValidationError('No trace files found in ' + folder);

    const out: any = {};
    for (const f of files) {
      const content = await fs.readFile(path.join(folder, f), 'utf-8');
      if (f.endsWith('test.trace')) out.testTrace = content;
      else if (f.endsWith('trace.trace')) out.traceTrace = content;
      else if (f.endsWith('trace.stacks')) out.traceStacks = content;
      else if (f.endsWith('trace.network')) out.traceNetwork = content;
    }

    if (!out.testTrace) throw new ParseError('Missing test.trace in ' + folder);
    if (!out.traceTrace) throw new ParseError('Missing trace.trace in ' + folder);
    if (!out.traceStacks) throw new ParseError('Missing trace.stacks in ' + folder);
    if (!out.traceNetwork) throw new ParseError('Missing trace.network in ' + folder);

    return out as TraceFiles;
  }
}
