/**
 * Token Budget Manager
 * Tracks and manages token usage with warnings and limits
 */
export class TokenBudgetManager {
    static instance;
    config;
    sessionUsage;
    totalUsed = 0;
    warningShown = false;
    constructor(config = {}) {
        this.config = {
            maxTokens: config.maxTokens || 100000, // Default: 100K tokens
            warnAt: config.warnAt || 80, // Default: warn at 80%
            sessionLimit: config.sessionLimit || 0, // 0 = unlimited
            autoStop: config.autoStop || false,
        };
        this.sessionUsage = [];
    }
    static getInstance(config) {
        if (!TokenBudgetManager.instance) {
            TokenBudgetManager.instance = new TokenBudgetManager(config);
        }
        return TokenBudgetManager.instance;
    }
    /**
     * Configure budget settings
     */
    configure(config) {
        this.config = { ...this.config, ...config };
        this.warningShown = false; // Reset warning
    }
    /**
     * Record token usage
     */
    recordUsage(prompt, completion) {
        const usage = {
            prompt,
            completion,
            total: prompt + completion,
            timestamp: new Date(),
        };
        this.sessionUsage.push(usage);
        this.totalUsed += usage.total;
    }
    /**
     * Check if budget is exceeded
     */
    isBudgetExceeded() {
        if (this.config.maxTokens === 0)
            return false;
        return this.totalUsed >= this.config.maxTokens;
    }
    /**
     * Check if warning threshold is reached
     */
    shouldWarn() {
        if (this.config.maxTokens === 0)
            return false;
        if (this.warningShown)
            return false;
        const percentage = (this.totalUsed / this.config.maxTokens) * 100;
        return percentage >= this.config.warnAt;
    }
    /**
     * Mark warning as shown
     */
    markWarningShown() {
        this.warningShown = true;
    }
    /**
     * Get warning message
     */
    getWarningMessage() {
        const percentage = Math.round((this.totalUsed / this.config.maxTokens) * 100);
        const remaining = this.config.maxTokens - this.totalUsed;
        return `⚠️  Token budget warning: ${percentage}% used (${this.totalUsed.toLocaleString()}/${this.config.maxTokens.toLocaleString()} tokens)\n` +
            `${remaining.toLocaleString()} tokens remaining`;
    }
    /**
     * Get budget exceeded message
     */
    getBudgetExceededMessage() {
        return `❌ Token budget exceeded: ${this.totalUsed.toLocaleString()}/${this.config.maxTokens.toLocaleString()} tokens used\n` +
            `Please increase budget with --token-budget or reset session`;
    }
    /**
     * Get current usage summary
     */
    getUsageSummary() {
        const remaining = Math.max(0, this.config.maxTokens - this.totalUsed);
        const percentage = this.config.maxTokens > 0
            ? (this.totalUsed / this.config.maxTokens) * 100
            : 0;
        return {
            total: this.totalUsed,
            budget: this.config.maxTokens,
            remaining,
            percentage: Math.round(percentage),
            count: this.sessionUsage.length,
        };
    }
    /**
     * Get detailed statistics
     */
    getStatistics() {
        const totalPromptTokens = this.sessionUsage.reduce((sum, u) => sum + u.prompt, 0);
        const totalCompletionTokens = this.sessionUsage.reduce((sum, u) => sum + u.completion, 0);
        const totalTokens = totalPromptTokens + totalCompletionTokens;
        const averagePerRequest = this.sessionUsage.length > 0
            ? Math.round(totalTokens / this.sessionUsage.length)
            : 0;
        return {
            totalPromptTokens,
            totalCompletionTokens,
            totalTokens,
            averagePerRequest,
            requestCount: this.sessionUsage.length,
        };
    }
    /**
     * Reset session usage
     */
    reset() {
        this.sessionUsage = [];
        this.totalUsed = 0;
        this.warningShown = false;
    }
    /**
     * Check if can proceed with estimated tokens
     */
    canProceed(estimatedTokens) {
        if (this.config.maxTokens === 0) {
            return { allowed: true };
        }
        const wouldExceed = (this.totalUsed + estimatedTokens) > this.config.maxTokens;
        if (wouldExceed) {
            const remaining = this.config.maxTokens - this.totalUsed;
            return {
                allowed: false,
                message: `Request would exceed token budget. Estimated: ${estimatedTokens.toLocaleString()}, Remaining: ${remaining.toLocaleString()}`,
            };
        }
        return { allowed: true };
    }
    /**
     * Export usage data
     */
    exportUsage() {
        return {
            config: this.config,
            usage: [...this.sessionUsage],
            statistics: this.getStatistics(),
            summary: this.getUsageSummary(),
        };
    }
}
// Export singleton getter
export function getTokenBudget(config) {
    return TokenBudgetManager.getInstance(config);
}
//# sourceMappingURL=token-budget.js.map