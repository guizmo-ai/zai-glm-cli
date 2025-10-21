export interface ErrorSuggestion {
  action: string;
  description: string;
  command?: string;
}

export interface ErrorContext {
  file?: string;
  line?: number;
  operation?: string;
  [key: string]: any;
}

export abstract class ZAIError extends Error {
  public readonly code: string;
  public readonly recoverable: boolean;
  public readonly suggestions: ErrorSuggestion[];
  public readonly context: ErrorContext;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    options: {
      recoverable?: boolean;
      suggestions?: ErrorSuggestion[];
      context?: ErrorContext;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.recoverable = options.recoverable ?? false;
    this.suggestions = options.suggestions ?? [];
    this.context = options.context ?? {};
    this.timestamp = new Date();

    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      suggestions: this.suggestions,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  formatForUser(): string {
    let output = `❌ ${this.message}\n`;

    if (Object.keys(this.context).length > 0) {
      output += `\n📍 Context:\n`;
      for (const [key, value] of Object.entries(this.context)) {
        output += `  ${key}: ${value}\n`;
      }
    }

    if (this.suggestions.length > 0) {
      output += `\n💡 Suggestions:\n`;
      this.suggestions.forEach((suggestion, idx) => {
        output += `  ${idx + 1}. ${suggestion.action}\n`;
        output += `     ${suggestion.description}\n`;
        if (suggestion.command) {
          output += `     Command: ${suggestion.command}\n`;
        }
      });
    }

    return output;
  }
}
