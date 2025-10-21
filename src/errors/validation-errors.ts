import { ZAIError, ErrorContext } from './base-errors.js';

export class ValidationError extends ZAIError {
  constructor(
    message: string,
    field: string,
    value: any,
    context: ErrorContext = {}
  ) {
    super(message, 'VALIDATION_ERROR', {
      recoverable: true,
      context: { field, value, ...context },
      suggestions: [
        {
          action: 'Check the parameter format',
          description: `Verify that '${field}' has the correct format`,
        },
        {
          action: 'Review expected value type',
          description: `Ensure '${field}' matches the expected data type`,
        },
      ],
    });
  }
}

export class ConfigurationError extends ZAIError {
  constructor(message: string, configKey: string, expectedValue?: string) {
    const suggestions = [
      {
        action: 'Check your configuration',
        description: `Review the '${configKey}' setting in your config`,
      },
      {
        action: 'Reset to defaults',
        description: 'Try resetting configuration to default values',
      },
    ];

    if (expectedValue) {
      suggestions.unshift({
        action: 'Set the correct value',
        description: `Expected value: ${expectedValue}`,
      });
    }

    super(message, 'CONFIGURATION_ERROR', {
      recoverable: true,
      context: { configKey, expectedValue },
      suggestions,
    });
  }
}

export class MissingParameterError extends ValidationError {
  constructor(parameterName: string, toolName?: string) {
    const message = toolName
      ? `Missing required parameter '${parameterName}' for tool '${toolName}'`
      : `Missing required parameter: ${parameterName}`;

    const suggestions = [
      {
        action: 'Provide the required parameter',
        description: `Supply a value for '${parameterName}'`,
      },
      {
        action: 'Check tool documentation',
        description: 'Review the required parameters for this operation',
      },
    ];

    super(
      message,
      parameterName,
      undefined,
      toolName ? { tool: toolName } : {}
    );

    // Override suggestions by creating a new object with updated suggestions
    Object.defineProperty(this, 'suggestions', { value: suggestions, writable: false, enumerable: true });
  }
}

export class InvalidParameterError extends ValidationError {
  constructor(
    parameterName: string,
    providedValue: any,
    expectedType: string,
    toolName?: string
  ) {
    const message = `Invalid parameter '${parameterName}': expected ${expectedType}, got ${typeof providedValue}`;

    const suggestions = [
      {
        action: 'Correct the parameter type',
        description: `Provide a ${expectedType} value for '${parameterName}'`,
      },
      {
        action: 'Review the parameter value',
        description: `Current value: ${JSON.stringify(providedValue)}`,
      },
    ];

    super(message, parameterName, providedValue, toolName ? { tool: toolName } : {});

    // Override suggestions
    Object.defineProperty(this, 'suggestions', { value: suggestions, writable: false, enumerable: true });
  }
}

export class RangeError extends ValidationError {
  constructor(
    parameterName: string,
    value: number,
    min?: number,
    max?: number
  ) {
    let message = `Value ${value} for '${parameterName}' is out of range`;
    if (min !== undefined && max !== undefined) {
      message += ` (expected: ${min}-${max})`;
    } else if (min !== undefined) {
      message += ` (expected: >= ${min})`;
    } else if (max !== undefined) {
      message += ` (expected: <= ${max})`;
    }

    const suggestions = [
      {
        action: 'Use a value within the valid range',
        description: min !== undefined && max !== undefined
          ? `Provide a value between ${min} and ${max}`
          : min !== undefined
          ? `Provide a value >= ${min}`
          : `Provide a value <= ${max}`,
      },
    ];

    super(message, parameterName, value, { min, max });

    // Override suggestions
    Object.defineProperty(this, 'suggestions', { value: suggestions, writable: false, enumerable: true });
  }
}
