import { ZAIError } from '../errors/base-errors.js';
export declare class ErrorHandler {
    /**
     * Handles an error and returns a user-friendly formatted string
     * @param error - The error to handle
     * @returns Formatted error message for display to user
     */
    static handle(error: Error | ZAIError): string;
    /**
     * Determines if an error is recoverable and should be retried
     * @param error - The error to check
     * @returns True if the error is recoverable
     */
    static shouldRetry(error: Error | ZAIError): boolean;
    /**
     * Wraps an async operation with retry logic
     * @param operation - The async operation to execute
     * @param maxRetries - Maximum number of retry attempts
     * @param delayMs - Initial delay in milliseconds between retries
     * @returns The result of the operation
     * @throws The last error if all retries fail
     */
    static withRetry<T>(operation: () => Promise<T>, maxRetries?: number, delayMs?: number): Promise<T>;
    /**
     * Wraps an operation in a try-catch and returns a formatted error string if it fails
     * @param operation - The operation to execute
     * @returns The result or an error string
     */
    static safely<T>(operation: () => Promise<T>): Promise<T | {
        error: string;
    }>;
    /**
     * Logs an error with full context (for debugging)
     * @param error - The error to log
     */
    static log(error: Error | ZAIError): void;
    /**
     * Extracts a simple error message for ToolResult
     * @param error - The error to extract message from
     * @returns Simple error message
     */
    static toSimpleMessage(error: Error | ZAIError): string;
}
