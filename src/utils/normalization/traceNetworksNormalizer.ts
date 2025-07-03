import { ITraceNormalizer } from './types';

/**
 * The final form of trace.network that will be sent to the LLMs.
 */
interface NormalizedTraceNetwork {
  type: string;
  snapshot: {
    _frameref: string;
    _monotonicTime: number;
    startedDateTime: string;
    time: number;
    request: any;
    response: any;
    cache: any;
    timings: any;
    pageref: string;
    serverIPAddress: string;
    _serverPort: number;
    _securityDetails: any;
  };
}

/**
 * Normalizes Playwright trace.networks data from JSON object to an array.
 */
export class TraceNetworksNormalizer implements ITraceNormalizer {
  traces: NormalizedTraceNetwork[] = [];

  constructor(traceContent: string) {
    this.normalize(traceContent);
  }

  normalize(traceContent: string) {
    const entries = traceContent.split('\n').filter(line => line.trim() !== '');
    this.traces = entries.map(line => JSON.parse(line) as NormalizedTraceNetwork);
  }

  formatForLLMConsumption(): string {
    return JSON.stringify(this.traces);
  }
}
