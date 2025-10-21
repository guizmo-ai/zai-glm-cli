import { ZAIError } from './base-errors.js';
export class APIError extends ZAIError {
    constructor(message, statusCode, context = {}) {
        const suggestions = [];
        if (statusCode === 401 || statusCode === 403) {
            suggestions.push({
                action: 'Check your API key',
                description: 'Your API key may be invalid or expired',
            });
            suggestions.push({
                action: 'Verify API key configuration',
                description: 'Ensure the API key is correctly set in your environment',
                command: 'bash echo $ZAI_API_KEY',
            });
        }
        else if (statusCode === 429) {
            suggestions.push({
                action: 'Wait before retrying',
                description: 'You have hit the rate limit',
            });
            suggestions.push({
                action: 'Check rate limit status',
                description: 'Review your API usage and limits',
            });
        }
        else if (statusCode && statusCode >= 500) {
            suggestions.push({
                action: 'Retry the request',
                description: 'The API server may be experiencing issues',
            });
            suggestions.push({
                action: 'Check API status',
                description: 'Visit the API status page to check for outages',
            });
        }
        else if (statusCode === 400) {
            suggestions.push({
                action: 'Review request parameters',
                description: 'Check that all required parameters are valid',
            });
        }
        super(message, 'API_ERROR', {
            recoverable: statusCode ? statusCode < 500 : false,
            suggestions,
            context: { statusCode, ...context },
        });
    }
}
export class NetworkError extends ZAIError {
    constructor(message, cause) {
        super(message, 'NETWORK_ERROR', {
            recoverable: true,
            cause,
            suggestions: [
                {
                    action: 'Check your internet connection',
                    description: 'Ensure you are connected to the internet',
                },
                {
                    action: 'Retry the operation',
                    description: 'Network issues may be temporary',
                },
                {
                    action: 'Check firewall settings',
                    description: 'Your firewall may be blocking the connection',
                },
                {
                    action: 'Test network connectivity',
                    description: 'Verify you can reach external services',
                    command: 'bash ping -c 3 8.8.8.8',
                },
            ],
        });
    }
}
export class ModelNotFoundError extends APIError {
    constructor(modelName) {
        super(`Model not found: ${modelName}`, 404, { model: modelName });
        this.suggestions.unshift({
            action: 'Use a valid model name',
            description: 'Check the list of available models for your API',
        });
    }
}
export class RateLimitError extends APIError {
    constructor(message, retryAfter) {
        super(message, 429, { retryAfter });
        if (retryAfter) {
            this.suggestions.unshift({
                action: `Wait ${retryAfter} seconds`,
                description: 'Rate limit will reset after this time',
            });
        }
    }
}
export class AuthenticationError extends APIError {
    constructor(message) {
        super(message, 401);
        this.suggestions.unshift({
            action: 'Set your API key',
            description: 'Configure your ZAI_API_KEY environment variable',
            command: 'export ZAI_API_KEY="your-api-key"',
        });
    }
}
//# sourceMappingURL=api-errors.js.map