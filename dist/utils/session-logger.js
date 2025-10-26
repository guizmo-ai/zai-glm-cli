/**
 * Session Logger
 * Tracks errors and session state for better debugging
 */
import fs from "fs";
import path from "path";
import os from "os";
export class SessionLogger {
    static instance;
    sessionErrors = [];
    logDir;
    currentSessionFile;
    constructor() {
        // Create log directory in user's home
        this.logDir = path.join(os.homedir(), ".zai-cli", "logs");
        try {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        catch (error) {
            console.error("Failed to create log directory:", error);
        }
        // Create session file
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        this.currentSessionFile = path.join(this.logDir, `session-${timestamp}.log`);
    }
    static getInstance() {
        if (!SessionLogger.instance) {
            SessionLogger.instance = new SessionLogger();
        }
        return SessionLogger.instance;
    }
    /**
     * Log an error with context
     */
    logError(type, message, details, error) {
        const sessionError = {
            timestamp: new Date(),
            type,
            message,
            details,
            stack: error?.stack,
        };
        this.sessionErrors.push(sessionError);
        // Write to file
        this.writeToFile(sessionError);
    }
    /**
     * Get last error
     */
    getLastError() {
        return this.sessionErrors[this.sessionErrors.length - 1] || null;
    }
    /**
     * Get all errors from current session
     */
    getAllErrors() {
        return [...this.sessionErrors];
    }
    /**
     * Get formatted error report
     */
    getErrorReport() {
        const lastError = this.getLastError();
        if (!lastError) {
            return "No errors in current session.";
        }
        let report = `\n=== Last Session Error ===\n`;
        report += `Time: ${lastError.timestamp.toISOString()}\n`;
        report += `Type: ${lastError.type}\n`;
        report += `Message: ${lastError.message}\n`;
        if (lastError.details) {
            report += `\nDetails:\n${JSON.stringify(lastError.details, null, 2)}\n`;
        }
        if (lastError.stack) {
            report += `\nStack Trace:\n${lastError.stack}\n`;
        }
        report += `\nFull logs: ${this.currentSessionFile}\n`;
        report += `=========================\n`;
        return report;
    }
    /**
     * Get recovery suggestions based on error type
     */
    getRecoverySuggestions(error) {
        const err = error || this.getLastError();
        if (!err)
            return [];
        const suggestions = [];
        switch (err.type) {
            case "api_error":
                suggestions.push("Check your API key and network connection");
                suggestions.push("Verify Z.ai API status at https://z.ai");
                suggestions.push("Try switching to a different model");
                break;
            case "tool_error":
                suggestions.push("Check if the file/path exists");
                suggestions.push("Verify you have necessary permissions");
                suggestions.push("Try running the operation manually to debug");
                break;
            case "stream_error":
                suggestions.push("The API stream was interrupted");
                suggestions.push("Try your request again");
                suggestions.push("Check your network stability");
                break;
            default:
                suggestions.push("Try restarting the CLI");
                suggestions.push("Check the logs for more details");
                break;
        }
        return suggestions;
    }
    /**
     * Clear current session errors
     */
    clearErrors() {
        this.sessionErrors = [];
    }
    /**
     * Write error to log file
     */
    writeToFile(error) {
        try {
            const logEntry = `[${error.timestamp.toISOString()}] ${error.type.toUpperCase()}: ${error.message}\n`;
            const detailsEntry = error.details
                ? `Details: ${JSON.stringify(error.details, null, 2)}\n`
                : "";
            const stackEntry = error.stack ? `Stack: ${error.stack}\n` : "";
            fs.appendFileSync(this.currentSessionFile, logEntry + detailsEntry + stackEntry + "\n");
        }
        catch (writeError) {
            console.error("Failed to write to log file:", writeError);
        }
    }
}
// Export singleton
export const sessionLogger = SessionLogger.getInstance();
//# sourceMappingURL=session-logger.js.map