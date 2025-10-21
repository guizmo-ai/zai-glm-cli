import { ZAIError, ErrorContext } from './base-errors.js';
export declare class APIError extends ZAIError {
    constructor(message: string, statusCode?: number, context?: ErrorContext);
}
export declare class NetworkError extends ZAIError {
    constructor(message: string, cause?: Error);
}
export declare class ModelNotFoundError extends APIError {
    constructor(modelName: string);
}
export declare class RateLimitError extends APIError {
    constructor(message: string, retryAfter?: number);
}
export declare class AuthenticationError extends APIError {
    constructor(message: string);
}
