export declare class TokenCounter {
    private encoder;
    constructor(model?: string);
    /**
     * Count tokens in a string
     */
    countTokens(text: string): number;
    /**
     * Count tokens in messages array (for chat completions)
     */
    countMessageTokens(messages: Array<{
        role: string;
        content: string | null;
        [key: string]: any;
    }>): number;
    /**
     * Estimate tokens for streaming content
     * This is an approximation since we don't have the full response yet
     */
    estimateStreamingTokens(accumulatedContent: string): number;
    /**
     * Clean up resources
     */
    dispose(): void;
}
/**
 * Format token count for display (e.g., 1.2k for 1200)
 */
export declare function formatTokenCount(count: number): string;
/**
 * Create a token counter instance
 */
export declare function createTokenCounter(model?: string): TokenCounter;
