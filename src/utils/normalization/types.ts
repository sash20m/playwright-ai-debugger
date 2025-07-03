export interface ITraceNormalizer {
  formatForLLMConsumption(traces: any): string;
}
