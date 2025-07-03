/**
 * Adds environment-related CLI options and handles API key configuration for OpenAI.
 * @param cmd The Commander.js Command instance to augment.
 */
import { Command } from 'commander';
import config from '../config/config';
import enq from 'enquirer';
const { prompt } = enq;

export function loadEnvOptions(cmd: Command) {
  cmd.option('-k, --api-key <key>', 'OpenAI API key').hook('preAction', async (thisCmd, actionCmd) => {
    const opts = thisCmd.opts();

    try {
      if (opts.apiKey) {
        // Anthropic key can also be added in the future.
        await config.set('openaiKey', opts.apiKey);
      } else {
        // If the key is not provided via CLI, it prompts the user interactively and saves it to the config.
        const existing = await config.get('openaiKey');
        if (!existing) {
          const answer = await prompt<{ key: string }>([
            {
              type: 'input',
              name: 'key',
              message: 'Enter your OpenAI API key:',
            },
          ]);
          await config.set('openaiKey', answer.key);
        }
      }
    } catch (error) {
      throw error;
    }
  });
}
