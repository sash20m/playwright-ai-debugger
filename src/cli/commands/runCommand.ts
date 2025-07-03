/**
 * CLI command for running the AI Debugger on Playwright trace zip files.
 *
 * Handles parsing, normalization, AI analysis, and interactive reporting for debugging failed Playwright tests.
 */
import chalk from 'chalk';
import fs from 'fs';
import * as path from 'path';
import ora from 'ora';
import boxen from 'boxen';
import { AIDebugger } from '../../core/aiDebugger';
import { ZipParser } from '../../utils/parser/ZipParser';
import { ReportRenderer } from '../../core/reportRenderer';
import { TraceFileParser } from '../../utils/parser/TraceFileParser';
import { TraceNormalizer } from '../../utils/normalization/traceTraceNormalizer';
import { TestTraceNormalizer } from '../../utils/normalization/testTraceNormalizer';
import { DebuggingReportResponse, FailedPlaywrightTest, TraceFiles } from '../../types';
import { TraceStacksNormalizer } from '../../utils/normalization/traceStacksNormalizer';
import { TraceNetworksNormalizer } from '../../utils/normalization/traceNetworksNormalizer';

import enq from 'enquirer';
import { CliError, ValidationError } from '../../errors';
import { ModelMessage } from 'ai';
const { prompt } = enq;

/**
 * Main command for running AI debugging on Playwright trace zip files.
 */
export class DebugCommand {
  private debuggingResults: DebuggingReportResponse[] = [];
  private failedPlaywrightTests: FailedPlaywrightTest[] = [];
  /**
   * @param aiDebugger The AI debugger instance
   * @param parser Trace file parser instance
   * @param HTMLRenderer Report renderer instance
   */
  constructor(
    private aiDebugger: AIDebugger,
    private parser: TraceFileParser,
    private HTMLRenderer: ReportRenderer
  ) {}

  static async build() {
    const aiDebugger = await AIDebugger.build();
    return new DebugCommand(aiDebugger, new TraceFileParser(), new ReportRenderer());
  }

  /**
   * Main action for the CLI: parses, analyzes, and reports on the provided trace zip files.
   * @param zipPaths Array of trace zip file paths
   */
  async action(zipPaths: string[]) {
    // Parses the zip files and adds their content to this.failedPlaywrightTests.
    try {
      for (const zip of zipPaths) {
        if (!zip.endsWith('.zip')) {
          throw new ValidationError(`Trace file must be .zip: received "${zip}"`);
        }
        if (!(await fs.promises.stat(zip).catch(() => null))) {
          throw new ValidationError(`File does not exist: "${zip}"`);
        }

        const folderURI = await ZipParser.unzipToTemp(zip);
        const folder = path.basename(folderURI);
        const traces = await this.parser.parse(folderURI);

        this.failedPlaywrightTests.push({
          folder,
          traces: this.normalizeTraces(traces),
        });
      }
    } catch (error) {
      throw error;
    }

    // Runs the failed test traces on the AI debugger
    const debuggingResults = await this.runAIAnalysisOnTests(this.failedPlaywrightTests);
    this.debuggingResults = debuggingResults;

    // Nice UI to get to understand and quickly understand what's wrong with each test
    // and what can be done to fix it.
    await this.printDebuggingResults(debuggingResults);

    // For easier reading, the results of the debugger and injected into a HTML template
    // that can be opened locally.
    await this.HTMLRenderer.render(debuggingResults);

    // -----------------
    // After the initial analyses, user is provided a menu to interact with the AI based on the traces/debug results.
    await this.menu();
  }

  /**
   * Displays the interactive menu for further actions after analysis.
   */
  private async menu() {
    const response: { menuKey: string } = await prompt([
      {
        type: 'input',
        name: 'menuKey',
        message: chalk.bold('Menu:') + ' [AI Interactive Agent = 1] [Exit = 2]',
      },
    ]);

    // Exits the cli
    if (response.menuKey === '2' || !/^\d+$/.test(response.menuKey)) {
      return;
    }

    if (response.menuKey === '1') {
      try {
        await this.startAgentMode();
      } catch (error) {
        throw new CliError('Error running the AI agent on the debug result.' + error);
      }
    }
  }

  /**
   * Starts the interactive agent mode for asking questions about debugging results.
   */
  private async startAgentMode() {
    while (true) {
      // User can chose one of the analyzed traces to interact with.
      const { resultNr }: { resultNr: string } = await prompt([
        {
          type: 'input',
          name: 'resultNr',
          message: 'Choose one of the debugging reports to interact with (eg. 3):',
        },
      ]);

      if (parseInt(resultNr) < 1 || parseInt(resultNr) > this.debuggingResults.length || !/^\d+$/.test(resultNr)) {
        console.log(chalk.red.bold('The picked results is not valid or non-existent, choose again!\n'));
        continue;
      }

      const messagesHistory: ModelMessage[] = [];
      while (true) {
        const { question }: { question: string } = await prompt([
          {
            type: 'input',
            name: 'question',
            message: 'Question:',
          },
        ]);

        // The payload to be sent to the AI (the question, the already debugged trace, and the original traces (we need them to
        // be able to ask all kinds of questions))
        const payload = {
          messagesHistory: [...messagesHistory], // to not send the original array
          question,
          debuggingAnalysis: JSON.stringify(this.debuggingResults[parseInt(resultNr) - 1]),
          traces: this.failedPlaywrightTests[parseInt(resultNr) - 1].traces,
        };

        try {
          const stream = await this.aiDebugger.runAgentOnAnalysis(payload);

          process.stdout.write(chalk.cyan('💡 '));
          let answer = '';
          for await (const chunk of stream) {
            process.stdout.write(chalk.whiteBright(chunk));
            answer += chunk;
          }
          console.log('\n');

          // Keeping memory of the conversation
          messagesHistory.push({ role: 'user', content: question });
          messagesHistory.push({ role: 'assistant', content: answer });
        } catch (error) {
          throw new Error('Error running the AI agent on the debug result.' + error);
        }

        // User can continue to interact based on that trace, ask a question on another one or exit.
        const response: { menuKey: string } = await prompt([
          {
            type: 'input',
            name: 'menuKey',
            message: 'Menu: [Ask follow-up question = 1] [Ask another question = 2] [Exit = 3]',
          },
        ]);

        // Exits
        if (response.menuKey === '3' || !/^\d+$/.test(resultNr)) {
          return;
        }

        // Continues the loop with the next question
        if (response.menuKey === '1') {
          continue;
        }

        //  Can choose another debug result (trace) to interact with
        if (response.menuKey === '2') {
          break;
        }
      }
    }
  }

  /**
   * Runs AI analysis on all failed Playwright tests and collects results.
   * @param failedPlaywrightTests Array of failed test objects with traces
   * @returns {Promise< DebuggingReportResponse[]>}
   */
  private async runAIAnalysisOnTests(
    failedPlaywrightTests: FailedPlaywrightTest[]
  ): Promise<DebuggingReportResponse[]> {
    let successCount = 0;
    const errorCount = 0;
    const debuggingResults: DebuggingReportResponse[] = [];
    const spinner = ora('Starting Analysis...\n').start();

    // Runs the analyses in parallel
    await Promise.all(
      failedPlaywrightTests.map(async failedTest => {
        const response = await this.aiDebugger.runDebuggingAnalysis(failedTest.traces);
        debuggingResults.push({ ...response, folder: failedTest.folder });
        successCount++;
      })
    );

    spinner.succeed('AI Debugger analysis complete.');

    return debuggingResults;
  }

  /**
   * Normalizes all trace files for LLM consumption.
   * @param traces The raw trace files
   * @returns {TraceFiles} The normalized trace files
   */
  private normalizeTraces(traces: TraceFiles): TraceFiles {
    const testTraceNormalized = new TestTraceNormalizer(traces.testTrace);
    const formattedTest = testTraceNormalized.formatForLLMConsumption();

    const traceTraceNormalized = new TraceNormalizer(traces.traceTrace);
    const formattedTrace = traceTraceNormalized.formatForLLMConsumption();

    const stacksTraceNormalized = new TraceStacksNormalizer(traces.traceStacks);
    const formattedStacks = stacksTraceNormalized.formatForLLMConsumption();

    const networkTraceNormalized = new TraceNetworksNormalizer(traces.traceNetwork);
    const formattedNetwork = networkTraceNormalized.formatForLLMConsumption();

    return {
      testTrace: formattedTest,
      traceTrace: formattedTrace,
      traceStacks: formattedStacks,
      traceNetwork: formattedNetwork,
    };
  }

  /**
   * Prints the debugging results to the console in a formatted box.
   * @param debuggingResult Array of debugging report responses
   * @param successCount Number of successful analyses
   * @param errorCount Number of failed analyses
   */
  private async printDebuggingResults(debuggingResult: DebuggingReportResponse[]) {
    debuggingResult.forEach((result, index) => {
      let output = '';

      output += `${chalk.cyan.bold('ID: ')} ${chalk.yellow(index + 1)}\n`;
      if (result?.folder) {
        output += `${chalk.cyan.bold('Project: ')} ${chalk.yellow(result.folder)}\n`;
      }

      output += `${chalk.cyan.bold('File:')} ${result.filePath}\n`;
      output += `${chalk.cyan.bold('Location:')} line ${chalk.yellow(result.line)}, col ${chalk.yellow(result.column)}\n`;
      if (result?.function) {
        output += `${chalk.cyan.bold('Function: ')} ${chalk.yellow(result.function)}\n`;
      }

      output += `${chalk.cyan.bold('Description:')} ${result.description}\n`;
      output += `${chalk.cyan.bold('Impact:')} ${result.issueImpact}\n`;
      output += `${chalk.cyan.bold('Fix:')} ${result.recommendedFix}\n`;
      output += `${chalk.cyan.bold('Causal Chain:')} ${result.causalChain}\n`;

      // Creates the colored container in the terminal to show the results
      console.log(
        boxen(output, {
          title: `Result ${index + 1}`,
          titleAlignment: 'center',
          padding: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        })
      );
    });
  }
}
