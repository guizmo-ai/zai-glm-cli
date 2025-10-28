/**
 * Session Logger
 * Tracks errors and session state for better debugging
 */
export interface SessionError {
    timestamp: Date;
    type: "api_error" | "tool_error" | "stream_error" | "unknown";
    message: string;
    details?: any;
    stack?: string;
}
export declare class SessionLogger {
    private static instance;
    private sessionErrors;
    private logDir;
    private currentSessionFile;
    private constructor();
    static getInstance(): SessionLogger;
    /**
     * Log an error with context
     */
    logError(type: SessionError["type"], message: string, details?: any, error?: Error): void;
    /**
     * Get last error
     */
    getLastError(): SessionError | null;
    /**
     * Get all errors from current session
     */
    getAllErrors(): SessionError[];
    /**
     * Get formatted error report
     */
    getErrorReport(): string;
    /**
     * Get recovery suggestions based on error type
     */
    getRecoverySuggestions(error?: SessionError): string[];
    /**
     * Clear current session errors
     */
    clearErrors(): void;
    /**
     * Write error to log file
     */
    private writeToFile;
}
export declare const sessionLogger: SessionLogger;
