/**
 * Token Budget Manager
 * Tracks and manages token usage with warnings and limits
 */
export interface TokenBudgetConfig {
    maxTokens?: number;
    warnAt?: number;
    sessionLimit?: number;
    autoStop?: boolean;
}
export interface TokenUsage {
    prompt: number;
    completion: number;
    total: number;
    timestamp: Date;
}
export declare class TokenBudgetManager {
    private static instance;
    private config;
    private sessionUsage;
    private totalUsed;
    private warningShown;
    private constructor();
    static getInstance(config?: TokenBudgetConfig): TokenBudgetManager;
    /**
     * Configure budget settings
     */
    configure(config: Partial<TokenBudgetConfig>): void;
    /**
     * Record token usage
     */
    recordUsage(prompt: number, completion: number): void;
    /**
     * Check if budget is exceeded
     */
    isBudgetExceeded(): boolean;
    /**
     * Check if warning threshold is reached
     */
    shouldWarn(): boolean;
    /**
     * Mark warning as shown
     */
    markWarningShown(): void;
    /**
     * Get warning message
     */
    getWarningMessage(): string;
    /**
     * Get budget exceeded message
     */
    getBudgetExceededMessage(): string;
    /**
     * Get current usage summary
     */
    getUsageSummary(): {
        total: number;
        budget: number;
        remaining: number;
        percentage: number;
        count: number;
    };
    /**
     * Get detailed statistics
     */
    getStatistics(): {
        totalPromptTokens: number;
        totalCompletionTokens: number;
        totalTokens: number;
        averagePerRequest: number;
        requestCount: number;
    };
    /**
     * Reset session usage
     */
    reset(): void;
    /**
     * Check if can proceed with estimated tokens
     */
    canProceed(estimatedTokens: number): {
        allowed: boolean;
        message?: string;
    };
    /**
     * Export usage data
     */
    exportUsage(): {
        config: Required<TokenBudgetConfig>;
        usage: TokenUsage[];
        statistics: ReturnType<typeof this.getStatistics>;
        summary: ReturnType<typeof this.getUsageSummary>;
    };
}
export declare function getTokenBudget(config?: TokenBudgetConfig): TokenBudgetManager;
