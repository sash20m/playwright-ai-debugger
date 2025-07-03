import { TraceNormalizer } from '../traceTraceNormalizer';
import { TraceStacksNormalizer } from '../traceStacksNormalizer';
import { TraceNetworksNormalizer } from '../traceNetworksNormalizer';
import { TestTraceNormalizer } from '../testTraceNormalizer';
import * as fs from 'fs';
import * as path from 'path';

// These are just some general tests. In a prod setting, this would require more in-depth testing with real mocked data.
describe('Normalization Module', () => {
  const fixtureDir = path.join(__dirname, './fixtures');

  it('normalizes trace.trace', () => {
    const traceContent = fs.readFileSync(path.join(fixtureDir, '0-trace.trace'), 'utf-8');
    const normalizer = new TraceNormalizer(traceContent);
    expect(Array.isArray(normalizer.traces)).toBe(true);
    expect(normalizer.traces.length).toBeGreaterThan(0);
    expect(typeof normalizer.formatForLLMConsumption()).toBe('string');
  });

  it('normalizes trace.stacks', () => {
    const stacksContent = fs.readFileSync(path.join(fixtureDir, '0-trace.stacks'), 'utf-8');
    let content = stacksContent;
    if (!stacksContent.trim().startsWith('{')) {
      content = stacksContent.split('\n').find(line => line.trim().startsWith('{')) || '';
    }
    const normalizer = new TraceStacksNormalizer(content);
    expect(Array.isArray(normalizer.traces)).toBe(true);
    expect(normalizer.traces.length).toBeGreaterThan(0);
    expect(typeof normalizer.formatForLLMConsumption()).toBe('string');
  });

  it('normalizes trace.network', () => {
    const networkContent = fs.readFileSync(path.join(fixtureDir, '0-trace.network'), 'utf-8');
    const normalizer = new TraceNetworksNormalizer(networkContent);
    expect(Array.isArray(normalizer.traces)).toBe(true);
    expect(normalizer.traces.length).toBeGreaterThan(0);
    expect(typeof normalizer.formatForLLMConsumption()).toBe('string');
  });

  it('normalizes test.trace', () => {
    const testTraceContent = fs.readFileSync(path.join(fixtureDir, 'test.trace'), 'utf-8');
    const normalizer = new TestTraceNormalizer(testTraceContent);
    expect(Array.isArray(normalizer.traces)).toBe(true);
    expect(normalizer.traces.length).toBeGreaterThan(0);
    expect(typeof normalizer.formatForLLMConsumption()).toBe('string');
  });
});
