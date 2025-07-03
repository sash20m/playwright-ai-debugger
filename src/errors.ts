export class CliError extends Error {
  public exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}

export class ParseError extends CliError {
  constructor(message: string) {
    super(`Parse error: ${message}`, 2);
  }
}

export class ValidationError extends CliError {
  constructor(message: string) {
    super(`Invalid input: ${message}`, 3);
  }
}
