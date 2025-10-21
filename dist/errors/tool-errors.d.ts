import { ZAIError, ErrorSuggestion, ErrorContext } from './base-errors.js';
export declare class FileOperationError extends ZAIError {
    constructor(message: string, context: ErrorContext, suggestions?: ErrorSuggestion[]);
}
export declare class FileNotFoundError extends FileOperationError {
    constructor(filePath: string, operation?: string);
}
export declare class FilePermissionError extends FileOperationError {
    constructor(filePath: string, operation: string);
}
export declare class FileAlreadyExistsError extends FileOperationError {
    constructor(filePath: string);
}
export declare class ToolExecutionError extends ZAIError {
    constructor(toolName: string, message: string, context?: ErrorContext, cause?: Error);
}
export declare class BashCommandError extends ZAIError {
    constructor(command: string, exitCode: number, stderr: string, context?: ErrorContext);
}
export declare class DirectoryNotFoundError extends FileOperationError {
    constructor(dirPath: string, operation?: string);
}
export declare class InvalidLineNumberError extends FileOperationError {
    constructor(filePath: string, lineNumber: number, totalLines: number, operation?: string);
}
