# Checkly Playwright AI Debugger

Playwright AI Debugger is a CLI tool to help debug Playwright test failures at scale using LLMs. It analyzes Playwright trace files and generates human-readable insights and an interactive agent to quickly identify root causes.

***Note: If you want to help, see the Contributions section below and choose what features you would like to take on.***

## How it works

**Usage Flow:**
1. Run the CLI by givig it the ZIP trace files that Playwright generated.
2. It returns a list of results for each test with analyses of what went wrong, why and what to do about it.
3. They can be read in terminal, but for better UX, a HTML page is generated to more easily read them.
4. User has the ability to enter AI Agent mode where he directly interacts with a certain test and get more debugging info in natural language.
5. Can loop with a chat-like interface on the same test or choose others to interact with.


```
Usage: ai-debugger [options] <zipFiles...>

Arguments:
  zipFiles              ZipFiles with the trace logs from Playwright

Options:
  --api-key             OpenAI API Key
```


## How to run it
1. Get deps and build
```bash
yarn && yarn build
```

If the terminal doesn't see `ai-debugger`, `chmod +x dist/index.js` can be tried.

***Note: You will be required for an OpenAI API Key. One can be obtained at: https://platform.openai.com/account/api-keys***

## Contributions
**There are a couple of things that need to be done to be able to use this CLI in a more scalable way:**
1. Most traces will exceed the context window of the LLM. LLMs with bigger context windows can be used, but a strategy to chunk the traces and get responses on them should be implemented.
2. It needs the option to be given a folder with multiple zips, rather than giving them one by one.
3. Though the error handling is ok, it should be improved for edge cases, especially if the traces might be corrupted (that happens sometimes with Playwright).
4. Retry mechanisms with exponential backoff for transient errors (e.g., network issues when calling the LLM API).
5. If the amount of tests to be analyzed is very high, they need to be added to a queue and provided to the LLMs sequentially so that
we stay below the LLM's rate limit. (OpenAI's is relatively high, but for other providers it can be lower).
6. Add a one-shot or two-shot example to the system prompt with failed playwright tests (traces) and what would be a desirable output from the LLM.
7. For future: let's use the ink library with React rendering for better UI in the terminal.
8. Persist the results from previous analyses and have them accessible from the CLI (if the user wants to revisit them).
9. Some optimization algorithms should be implemented to check if some trace contents are not needed (like in network.trace). The purpose for this is only to minimize the context window for the LLMs and make it cheaper to make runs at scale.
10. Better normalization should be implemented (the current one is trivial) so that it could be easier to work with traces (group, filter), depending on future features.
