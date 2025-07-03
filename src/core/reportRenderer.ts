import fs from 'fs';
import path from 'path';
import { DebuggingReportResponse } from '../types';
import { Logger } from '../services/LoggingService';
import chalk from 'chalk';

export class ReportRenderer {
  async render(results: DebuggingReportResponse[]): Promise<string> {
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'report-template.html');
    const template = fs.readFileSync(templatePath, 'utf-8');

    const injected = template.replace(
      'window.__DEBUG_RESULTS__ = [];',
      `window.__DEBUG_RESULTS__ = ${JSON.stringify(results, null, 2)};`
    );

    const outputPath = path.join(__dirname, '..', '..', 'debug-reports', `debug-report-${Date.now()}.html`);
    fs.writeFileSync(outputPath, injected);

    Logger.info(chalk.green.bold(`📄 Web report written to file:/${outputPath}\n`));
    return outputPath;
  }
}
