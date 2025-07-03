import { CliError } from '../errors';
import { DebuggingReportResponse, TraceFiles } from '../types';
import { z } from 'zod';
import { generateObject, ModelMessage, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import config from '../config/config';

const responseSchema = z.object({
  filePath: z.string(),
  line: z.number(),
  column: z.number(),
  function: z.string(),
  description: z.string(),
  issueImpact: z.string(),
  recommendedFix: z.string(),
  causalChain: z.string(),
});

export class AIDebugger {
  private model: any;
  constructor(model: any) {
    this.model = model;
  }

  static async build(): Promise<any> {
    const openai = createOpenAI({
      apiKey: (await config.get('openaiKey')) || '',
    });
    const model = openai('gpt-4o-mini');
    return new AIDebugger(model);
  }

  async runDebuggingAnalysis(traces: TraceFiles): Promise<DebuggingReportResponse> {
    const filesMessage = this.formatTraceFilesForLLMConsumption(traces);
    const systemMessage = DEBUG_REPORT_INSTRUCTIONS;

    try {
      const response = await generateObject({
        model: this.model,
        schema: responseSchema,
        messages: [{ role: 'user', content: filesMessage }],
        system: systemMessage,
      });

      return response.object;
    } catch (error) {
      return Promise.reject(error as CliError);
    }
  }

  async *runAgentOnAnalysis({
    messagesHistory = [],
    question,
    debuggingAnalysis,
    traces,
  }: {
    messagesHistory: ModelMessage[];
    question: string;
    debuggingAnalysis: string;
    traces: TraceFiles;
  }): AsyncGenerator<string, void, unknown> {
    const systemMessage = INTERACTIVE_AGENT_INSTRUCTIONS;

    let message = this.formatTraceFilesForLLMConsumption(traces);
    message += `Here's the debugging report on the test: ${debuggingAnalysis} \n`;
    message += `Here is the user's question: ${question}`;

    messagesHistory.push({ role: 'user', content: message });

    const { textStream } = streamText({
      model: this.model,
      messages: messagesHistory,
      system: systemMessage,
    });

    for await (const chunk of textStream) {
      yield chunk;
    }
  }

  formatTraceFilesForLLMConsumption({ testTrace, traceTrace, traceStacks, traceNetwork }: TraceFiles) {
    const filesInstruction = `
    <files> 
    Here are the trace files:
    <file name="test.trace">${testTrace}</file>
    
    <file name="trace.trace">${traceTrace}</file>
    
    <file name="trace.stack">${traceStacks}</file>
    
    <file name="trace.network">${traceNetwork}</file>
    
    </files>`;

    return filesInstruction;
  }
}

export const INTERACTIVE_AGENT_INSTRUCTIONS = `
You are a Playwright test debugger. You will be given Playwright trace files for a failed test and your goal is to answer questions
from the user about the failed test and provide deeper insights into the issue. Keep the following ideas in the back of your mind as you respond: 
- What failed ?
- Why it failed (the root cause) ?
- What's the impact of the failure ?
- What needs to be done to fix the issue ?

<task_instructions>   
You are given these trace files:   
1. The most important file that needs to guide you is testTrace, it shows a high level Playwright driver calls.
As you use it as the main trace file, you'll find the fail log with usually the type="error" or with an error object with an message. Errors can occur at expect() part of the Playwright test
or any time during the test, thus the messaging might very - it will either be a description from the test the user wrote, or an automatic description from a Playwright call.
VERY IMPORTANT!!!: In multiple log lines where errors are present, you will find the path to the file that contains the failed test along with the line at which it failed.

Think about it and review it step by step to understand well the Playwright test fail.

2. You are also given the traceTrace file to be used in a complementary manner. The traceTrace records all the Playwright calls (page.goto, page.click, page.fill, page.waitForSelector, frame.evaluate, etc.)
and can be useful in understanding where the test failed in cases where the fail OCCURRED BEFORE the expect() case from the test.
Use traceTrace to take the screencast‐frames, DOM snapshots, console logs, network events and custom metrics around the failure if such logs exist. You will also see here you’ll see the exact callId, its parameters, the error message and the JS stack.
IF it contains logs on where test that failed, use this information to enrich the debugging report by showing where and when the fail occurred.

3. You are given a traceStacks file, which contains the stack of files/functions that were called.
Use test.stack only to confirm the test file/function that failed. You will see the first file paths will be internal Checkly files or other types of internal files,
you can ignore them and focus only on the Playwright test file.

4. You are given the traceNetwork trace. It shows a log of the network calls that were made during the test. 
If the fail involves network requests, use this traceNetwork stack to confirm the fail and enrich the debugging report only if it contains are useful information.

5. Also, you will be given a JSON analysis report on the issue above that you can use for context. It will be in the following format:
{
    filePath: string, // the path to the file that contains the test
    line: number, // the line where the fail occurred
    column: number, // the line where the fail occurred
    function: string, // the function called that resulted in a fail, could be left empty
    description: string, // a well rounded short description of the issue
    issueImpact: string, // a description of the consequences of this fail for the overall app
    recommendedFix: string   // what needs to be addressed and checked to fix the issue or find a solution for it
    causalChain: string // generate a causal graph of what likely led to the failure, based on trace data.
}
</task_instructions>

<notes>
- Double check to correctly identify the test fail and all the related information from it.
- Keep the information relevant. Leave information that doesn't help or speed up the debugging process.
</notes>

`;

export const DEBUG_REPORT_INSTRUCTIONS = `
You are a Playwright test debugger. You will be given Playwright trace files for a failed test and your goal is to 
debug it and create a report with relevant information on: 
- What failed ?
- Why it failed (the root cause) ?
- What's the impact of the failure ?
- What needs to be done to fix the issue ?

<task_instructions>   
You are given these trace files:   
1. The most important file that needs to guide you is testTrace, it shows a high level Playwright driver calls.
As you use it as the main trace file, you'll find the fail log with usually the type="error" or with an error object with an message. Errors can occur at expect() part of the Playwright test
or any time during the test, thus the messaging might very - it will either be a description from the test the user wrote, or an automatic description from a Playwright call.
VERY IMPORTANT!!!: In multiple log lines where errors are present, you will find the path to the file that contains the failed test along with the line at which it failed.

Think about it and review it step by step to understand well the Playwright test fail.

2. You are also given the traceTrace file to be used in a complementary manner. The traceTrace records all the Playwright calls (page.goto, page.click, page.fill, page.waitForSelector, frame.evaluate, etc.)
and can be useful in understanding where the test failed in cases where the fail OCCURRED BEFORE the expect() case from the test.
Use traceTrace to take the screencast‐frames, DOM snapshots, console logs, network events and custom metrics around the failure if such logs exist. You will also see here you’ll see the exact callId, its parameters, the error message and the JS stack.
IF it contains logs on where test that failed, use this information to enrich the debugging report by showing where and when the fail occurred.

3. You are given a traceStacks file, which contains the stack of files/functions that were called.
Use traceStacks only to confirm the test file/function that failed. You will see the first file paths will be internal Checkly files or other types of internal files,
you can ignore them and focus only on the Playwright test file.

4. You are given the traceNetwork trace. It shows a log of the network calls that were made during the test. 
If the fail involves network requests, use this traceNetwork stack to confirm the fail and enrich the debugging report only if it contains are useful information.


Think about and review all of them step by step to understand well the Playwright test fail.
</task_instructions>

<output_format>   
You will output the report in the following JSON format:
{
    filePath: string, // the path to the file that contains the test
    line: number, // the line where the fail occurred
    column: number, // the line where the fail occurred
    function: string, // the function called that resulted in a fail, can be left empty
    description: string, // a well rounded short description of the issue
    issueImpact: string, // a description of the consequences of this fail for the overall app
    recommendedFix: string   // what needs to be addressed and checked to fix the issue or find a solution for it
    causalChain: string // generate a causal graph of what likely led to the failure, based on trace data. Be specific when enumerating the causes. (e.g Click → API fetch to (example.com) → network error → state not updated → missing element → test failure)
}
</output_format>   

<notes>
- Double check to correctly identify the test fail and all the related information from it.
- The JSON report should be concise and to the point. It should contain all the information needed to help the engineers fix the issue.
- Keep the information relevant. Leave information that doesn't help or speed up the debugging process.
- Always OUTPUT JSON FORMAT, leave fields empty if there is no data you can find for them.
</notes>

`;
