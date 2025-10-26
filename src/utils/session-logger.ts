/**
 * Session Logger
 * Tracks errors and session state for better debugging
 */

import fs from "fs";
import path from "path";
import os from "os";

export interface SessionError {
  timestamp: Date;
  type: "api_error" | "tool_error" | "stream_error" | "unknown";
  message: string;
  details?: any;
  stack?: string;
}

export class SessionLogger {
  private static instance: SessionLogger;
  private sessionErrors: SessionError[] = [];
  private logDir: string;
  private currentSessionFile: string;

  private constructor() {
    // Create log directory in user's home
    this.logDir = path.join(os.homedir(), ".zai-cli", "logs");
    try {
      fs.mkdirSync(this.logDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create log directory:", error);
    }

    // Create session file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.currentSessionFile = path.join(this.logDir, `session-${timestamp}.log`);
  }

  static getInstance(): SessionLogger {
    if (!SessionLogger.instance) {
      SessionLogger.instance = new SessionLogger();
    }
    return SessionLogger.instance;
  }

  /**
   * Log an error with context
   */
  logError(
    type: SessionError["type"],
    message: string,
    details?: any,
    error?: Error
  ): void {
    const sessionError: SessionError = {
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
  getLastError(): SessionError | null {
    return this.sessionErrors[this.sessionErrors.length - 1] || null;
  }

  /**
   * Get all errors from current session
   */
  getAllErrors(): SessionError[] {
    return [...this.sessionErrors];
  }

  /**
   * Get formatted error report
   */
  getErrorReport(): string {
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
  getRecoverySuggestions(error?: SessionError): string[] {
    const err = error || this.getLastError();
    if (!err) return [];

    const suggestions: string[] = [];

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
  clearErrors(): void {
    this.sessionErrors = [];
  }

  /**
   * Write error to log file
   */
  private writeToFile(error: SessionError): void {
    try {
      const logEntry = `[${error.timestamp.toISOString()}] ${error.type.toUpperCase()}: ${error.message}\n`;
      const detailsEntry = error.details
        ? `Details: ${JSON.stringify(error.details, null, 2)}\n`
        : "";
      const stackEntry = error.stack ? `Stack: ${error.stack}\n` : "";

      fs.appendFileSync(
        this.currentSessionFile,
        logEntry + detailsEntry + stackEntry + "\n"
      );
    } catch (writeError) {
      console.error("Failed to write to log file:", writeError);
    }
  }
}

// Export singleton
export const sessionLogger = SessionLogger.getInstance();
