import { createLogger, format, transports } from 'winston';
import chalk from 'chalk';

export const Logger = createLogger({
  level: process.env.DEBUG ? 'debug' : 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      const levelColor =
        {
          error: chalk.red.bold,
          warn: chalk.yellow.bold,
          info: chalk.blue.bold,
          debug: chalk.magenta.bold,
          verbose: chalk.cyan.bold,
        }[level] || chalk.white.bold;

      return `${chalk.gray(`${typeof timestamp === 'string' ? `[${timestamp.slice(11)}]` : ''}`)} ${levelColor(`${level.toUpperCase()}`)}: ${message}`;
    })
  ),
  transports: [new transports.Console()],
});
