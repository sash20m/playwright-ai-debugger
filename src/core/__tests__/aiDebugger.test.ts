import { AIDebugger } from '../aiDebugger';
import { DebuggingReportResponse, TraceFiles } from '../../types';
import { ModelMessage, generateObject, streamText } from 'ai';

jest.mock('../../config/config', () => {
  const mockConfig = {
    get: jest.fn(),
    set: jest.fn(),
    CONFIG_DIR: '.config-keys',
    CONFIG_FILE: __dirname + '/.config-keys/config.json',
  };

  mockConfig.get.mockImplementation((key: string) => {
    const mockValues: Record<string, string> = {
      openaiKey: 'test-openai-key',
      anthropicKey: 'test-anthropic-key',
    };
    return Promise.resolve(mockValues[key] || '');
  });

  return mockConfig;
});

jest.mock('ai', () => ({
  generateObject: jest.fn(),
  streamText: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() =>
    jest.fn((modelName: string) => ({
      name: modelName,
      provider: 'openai',
    }))
  ),
}));

describe('AIDebugger', () => {
  let aiDebugger: AIDebugger;

  const mockTraces: TraceFiles = {
    testTrace: 'test trace content',
    traceTrace: 'trace trace content',
    traceStacks: 'trace stacks content',
    traceNetwork: 'trace network content',
  };

  beforeEach(async () => {
    // Create an instance of AIDebugger with the mock LLMs
    aiDebugger = await AIDebugger.build();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runDebuggingAnalysis', () => {
    it('should format trace files and call LLM with correct parameters', async () => {
      const mockResponse: DebuggingReportResponse = {
        filePath: 'test/file.spec',
        line: 10,
        column: 5,
        function: 'testFunction',
        description: 'Test error message',
        issueImpact: 'Test solution',
        recommendedFix: 'high',
        causalChain: 'Test solution',
      };

      (generateObject as jest.Mock).mockResolvedValue({ object: mockResponse });

      const result = await aiDebugger.runDebuggingAnalysis(mockTraces);

      expect(result).toEqual(mockResponse);
      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.anything(),
          schema: expect.anything(),
          messages: expect.arrayContaining([expect.objectContaining({ role: 'user' })]),
          system: expect.any(String),
        })
      );
    });

    it('should reject with error when LLM call fails', async () => {
      const error = new Error('LLM call failed');
      (generateObject as jest.Mock).mockRejectedValue(error);

      await expect(aiDebugger.runDebuggingAnalysis(mockTraces)).rejects.toThrow(error);
    });
  });

  describe('runAgentOnAnalysis', () => {
    it('should format input and return a stream from LLM', async () => {
      const mockTextStream = (async function* () {
        yield 'chunk1';
        yield 'chunk2';
        yield 'chunk3';
      })();

      (streamText as jest.Mock).mockReturnValue({ textStream: mockTextStream });

      const messagesHistory: ModelMessage[] = [];
      const question = 'What went wrong?';
      const debuggingAnalysis = 'Test analysis';

      const resultGenerator = aiDebugger.runAgentOnAnalysis({
        messagesHistory,
        question,
        debuggingAnalysis,
        traces: mockTraces,
      });

      // Collect all chunks from the generator
      const chunks: string[] = [];
      for await (const chunk of resultGenerator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['chunk1', 'chunk2', 'chunk3']);
      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.anything(),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining("Here's the debugging report on the test: Test analysis"),
            }),
          ]),
          system: expect.any(String),
        })
      );
    });
  });

  describe('formatTraceFilesForLLMConsumption', () => {
    it('should format trace files into a string with XML-like tags', () => {
      const formatted = (aiDebugger as jest.Mocked<AIDebugger>).formatTraceFilesForLLMConsumption(mockTraces);

      expect(formatted).toContain('<files>');
      expect(formatted).toContain('<file name="test.trace">test trace content</file>');
      expect(formatted).toContain('<file name="trace.trace">trace trace content</file>');
      expect(formatted).toContain('<file name="trace.stack">trace stacks content</file>');
      expect(formatted).toContain('<file name="trace.network">trace network content</file>');
    });
  });
});
