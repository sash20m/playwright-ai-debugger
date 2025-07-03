/**
 * CLI entry point and configuration for the Checkly Playwright AI Debugger.
 */
import fs from 'fs/promises';
import * as path from 'path';
import { Command } from 'commander';
import { loadEnvOptions } from './options';
import { Logger } from '../services/LoggingService';
import { DebugCommand } from './commands/runCommand';
import { CliError } from '../errors';

/**
 * Sets up and returns the main CLI program for the AI Debugger.
 *
 * - Adds global options (e.g., --api-key)
 * - Registers the main action for debugging trace zip files
 */
export async function cli(): Promise<Command> {
  const program = new Command()
    .name('ai-debugger')
    .description('Checkly Playwright AI Debugger')
    .argument('<traceZipFiles...>', 'Trace zip files to be debugged')
    .version('1.0.0')
    .exitOverride(err => {
      if (err.code === 'commander.missingArgument') {
        process.stderr.write('Error: ' + err.message + '\n');
        process.exit(2);
      }
      throw err;
    });

  // global options: --api-key
  loadEnvOptions(program);

  program.action(async (zipPaths: string[]) => {
    try {
      const command = await DebugCommand.build();
      await command.action(zipPaths);
    } catch (err: any) {
      if (err instanceof CliError) {
        Logger.error(err.message);
        process.exit(err.exitCode);
      }
      Logger.error('Unexpected error: ' + err.stack || err.message);
      process.exit(1);
    }
  });
  return program;
}
