import { ZAIError } from '../errors/base-errors.js';
export class ErrorHandler {
    /**
     * Handles an error and returns a user-friendly formatted string
     * @param error - The error to handle
     * @returns Formatted error message for display to user
     */
    static handle(error) {
        if (error instanceof ZAIError) {
            return error.formatForUser();
        }
        // Handle standard errors
        return `❌ An unexpected error occurred: ${error.message}`;
    }
    /**
     * Determines if an error is recoverable and should be retried
     * @param error - The error to check
     * @returns True if the error is recoverable
     */
    static shouldRetry(error) {
        if (error instanceof ZAIError) {
            return error.recoverable;
        }
        return false;
    }
    /**
     * Wraps an async operation with retry logic
     * @param operation - The async operation to execute
     * @param maxRetries - Maximum number of retry attempts
     * @param delayMs - Initial delay in milliseconds between retries
     * @returns The result of the operation
     * @throws The last error if all retries fail
     */
    static async withRetry(operation, maxRetries = 3, delayMs = 1000) {
        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (!this.shouldRetry(lastError) || attempt === maxRetries - 1) {
                    throw lastError;
                }
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
            }
        }
        throw lastError;
    }
    /**
     * Wraps an operation in a try-catch and returns a formatted error string if it fails
     * @param operation - The operation to execute
     * @returns The result or an error string
     */
    static async safely(operation) {
        try {
            return await operation();
        }
        catch (error) {
            return { error: this.handle(error) };
        }
    }
    /**
     * Logs an error with full context (for debugging)
     * @param error - The error to log
     */
    static log(error) {
        if (error instanceof ZAIError) {
            console.error(`[${error.code}] ${error.name}:`, error.message);
            console.error('Context:', error.context);
            if (error.suggestions.length > 0) {
                console.error('Suggestions:', error.suggestions);
            }
            if (error.stack) {
                console.error('Stack:', error.stack);
            }
        }
        else {
            console.error('Error:', error.message);
            if (error.stack) {
                console.error('Stack:', error.stack);
            }
        }
    }
    /**
     * Extracts a simple error message for ToolResult
     * @param error - The error to extract message from
     * @returns Simple error message
     */
    static toSimpleMessage(error) {
        if (error instanceof ZAIError) {
            // Return just the message without formatting
            return error.message;
        }
        return error.message;
    }
}
//# sourceMappingURL=error-handler.js.map