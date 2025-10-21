import { ZAIError, ErrorContext } from './base-errors.js';
export declare class ValidationError extends ZAIError {
    constructor(message: string, field: string, value: any, context?: ErrorContext);
}
export declare class ConfigurationError extends ZAIError {
    constructor(message: string, configKey: string, expectedValue?: string);
}
export declare class MissingParameterError extends ValidationError {
    constructor(parameterName: string, toolName?: string);
}
export declare class InvalidParameterError extends ValidationError {
    constructor(parameterName: string, providedValue: any, expectedType: string, toolName?: string);
}
export declare class RangeError extends ValidationError {
    constructor(parameterName: string, value: number, min?: number, max?: number);
}
