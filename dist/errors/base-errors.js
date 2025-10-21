export class ZAIError extends Error {
    code;
    recoverable;
    suggestions;
    context;
    timestamp;
    constructor(message, code, options = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.recoverable = options.recoverable ?? false;
        this.suggestions = options.suggestions ?? [];
        this.context = options.context ?? {};
        this.timestamp = new Date();
        if (options.cause) {
            this.cause = options.cause;
        }
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            recoverable: this.recoverable,
            suggestions: this.suggestions,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack,
        };
    }
    formatForUser() {
        let output = `❌ ${this.message}\n`;
        if (Object.keys(this.context).length > 0) {
            output += `\n📍 Context:\n`;
            for (const [key, value] of Object.entries(this.context)) {
                output += `  ${key}: ${value}\n`;
            }
        }
        if (this.suggestions.length > 0) {
            output += `\n💡 Suggestions:\n`;
            this.suggestions.forEach((suggestion, idx) => {
                output += `  ${idx + 1}. ${suggestion.action}\n`;
                output += `     ${suggestion.description}\n`;
                if (suggestion.command) {
                    output += `     Command: ${suggestion.command}\n`;
                }
            });
        }
        return output;
    }
}
//# sourceMappingURL=base-errors.js.map