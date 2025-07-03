#!/usr/bin/env node
import { cli } from './cli/cli';
import { Logger } from './services/LoggingService';

process.on('unhandledRejection', reason => {
  Logger.error(`Unhandled promise rejection: ${reason}`);
  process.exit(1);
});
process.on('uncaughtException', err => {
  Logger.error(`Uncaught exception: ${err.stack || err.message}`);
  process.exit(1);
});

(async () => {
  try {
    const app = await cli();
    app.parseAsync(process.argv);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
