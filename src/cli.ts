import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

import chalk from 'chalk';
import { Command, program } from 'commander';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function version(): Promise<string> {
  const pathPackageJson = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(await fs.readFile(pathPackageJson, 'utf8'));
  return (typeof packageJson === 'object' && packageJson?.version) || '0.0.0';
}

interface CliOptions {
  mustFindFiles?: boolean;
  cwd?: string;
  color?: boolean;
}

export async function app(): Promise<Command> {
  program
    .name('ai-debugger')
    .description('Checkly Playwright AI Debugger')
    .arguments('<files...>')
    .option('--cwd <dir>', 'Current Directory')
    .option('--color', 'Force color.')
    .option('--no-color', 'Do not use color.')
    .version(await version())
    .action(async (globs: string[], optionsCli: CliOptions, _command: Command) => {
      // console.log('Options: %o', optionsCli);
      //   program.showHelpAfterError(false);
      if (optionsCli.color !== undefined) {
        chalk.level = optionsCli.color ? 3 : 0;
      }
      console.log(chalk.yellow('Find Files:'));

      // TODO: Implement the logic to find the files

      //   for (const file of files) {
      //     console.log(chalk.gray(prefix) + chalk.white(file));
      //   }
    });

  program.showHelpAfterError();
  return program;
}

export async function run(argv?: string[]): Promise<void> {
  const prog = await app();
  await prog.parseAsync(argv);
}
