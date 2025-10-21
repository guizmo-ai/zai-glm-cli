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
export declare abstract class ZAIError extends Error {
    readonly code: string;
    readonly recoverable: boolean;
    readonly suggestions: ErrorSuggestion[];
    readonly context: ErrorContext;
    readonly timestamp: Date;
    constructor(message: string, code: string, options?: {
        recoverable?: boolean;
        suggestions?: ErrorSuggestion[];
        context?: ErrorContext;
        cause?: Error;
    });
    toJSON(): {
        name: string;
        message: string;
        code: string;
        recoverable: boolean;
        suggestions: ErrorSuggestion[];
        context: ErrorContext;
        timestamp: Date;
        stack: string;
    };
    formatForUser(): string;
}
