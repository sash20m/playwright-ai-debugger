import { cli } from '../cli';
import { Command } from 'commander';

jest.mock('../commands/runCommand', () => ({
  DebugCommand: {
    build: jest.fn().mockResolvedValue({
      action: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit() was called');
});

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(JSON.stringify({ version: '1.0.0' })),
}));

describe('CLI', () => {
  let program: Command;
  let stderrOutput = '';
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    stderrOutput = '';
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(input => {
      stderrOutput += input;
      return true;
    });
    program = createTestCommand();
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('should create a command with correct name and description', async () => {
    const cmd = await cli();
    expect(cmd.name()).toBe('ai-debugger');
    expect(cmd.description()).toBe('Checkly Playwright AI Debugger');
  });

  it('should require trace zip files', async () => {
    const cmd = await cli();

    await expect(cmd.parseAsync(['node', 'cli.js --api-key testkey'])).rejects.toThrow();

    expect(stderrOutput).toContain("error: missing required argument 'traceZipFiles'");
  });
});

function createTestCommand() {
  const command = new Command();
  command.exitOverride();
  return command;
}
