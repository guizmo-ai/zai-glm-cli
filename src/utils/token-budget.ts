/**
 * Token Budget Manager
 * Tracks and manages token usage with warnings and limits
 */

export interface TokenBudgetConfig {
  maxTokens?: number;
  warnAt?: number; // Percentage (0-100)
  sessionLimit?: number;
  autoStop?: boolean; // Stop when budget exceeded
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
  timestamp: Date;
}

export class TokenBudgetManager {
  private static instance: TokenBudgetManager;
  private config: Required<TokenBudgetConfig>;
  private sessionUsage: TokenUsage[];
  private totalUsed: number = 0;
  private warningShown: boolean = false;

  private constructor(config: TokenBudgetConfig = {}) {
    this.config = {
      maxTokens: config.maxTokens || 100000, // Default: 100K tokens
      warnAt: config.warnAt || 80, // Default: warn at 80%
      sessionLimit: config.sessionLimit || 0, // 0 = unlimited
      autoStop: config.autoStop || false,
    };
    this.sessionUsage = [];
  }

  static getInstance(config?: TokenBudgetConfig): TokenBudgetManager {
    if (!TokenBudgetManager.instance) {
      TokenBudgetManager.instance = new TokenBudgetManager(config);
    }
    return TokenBudgetManager.instance;
  }

  /**
   * Configure budget settings
   */
  configure(config: Partial<TokenBudgetConfig>): void {
    this.config = { ...this.config, ...config };
    this.warningShown = false; // Reset warning
  }

  /**
   * Record token usage
   */
  recordUsage(prompt: number, completion: number): void {
    const usage: TokenUsage = {
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
  isBudgetExceeded(): boolean {
    if (this.config.maxTokens === 0) return false;
    return this.totalUsed >= this.config.maxTokens;
  }

  /**
   * Check if warning threshold is reached
   */
  shouldWarn(): boolean {
    if (this.config.maxTokens === 0) return false;
    if (this.warningShown) return false;

    const percentage = (this.totalUsed / this.config.maxTokens) * 100;
    return percentage >= this.config.warnAt;
  }

  /**
   * Mark warning as shown
   */
  markWarningShown(): void {
    this.warningShown = true;
  }

  /**
   * Get warning message
   */
  getWarningMessage(): string {
    const percentage = Math.round((this.totalUsed / this.config.maxTokens) * 100);
    const remaining = this.config.maxTokens - this.totalUsed;

    return `⚠️  Token budget warning: ${percentage}% used (${this.totalUsed.toLocaleString()}/${this.config.maxTokens.toLocaleString()} tokens)\n` +
           `${remaining.toLocaleString()} tokens remaining`;
  }

  /**
   * Get budget exceeded message
   */
  getBudgetExceededMessage(): string {
    return `❌ Token budget exceeded: ${this.totalUsed.toLocaleString()}/${this.config.maxTokens.toLocaleString()} tokens used\n` +
           `Please increase budget with --token-budget or reset session`;
  }

  /**
   * Get current usage summary
   */
  getUsageSummary(): {
    total: number;
    budget: number;
    remaining: number;
    percentage: number;
    count: number;
  } {
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
  getStatistics(): {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    averagePerRequest: number;
    requestCount: number;
  } {
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
  reset(): void {
    this.sessionUsage = [];
    this.totalUsed = 0;
    this.warningShown = false;
  }

  /**
   * Check if can proceed with estimated tokens
   */
  canProceed(estimatedTokens: number): {
    allowed: boolean;
    message?: string;
  } {
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
  exportUsage(): {
    config: Required<TokenBudgetConfig>;
    usage: TokenUsage[];
    statistics: ReturnType<typeof this.getStatistics>;
    summary: ReturnType<typeof this.getUsageSummary>;
  } {
    return {
      config: this.config,
      usage: [...this.sessionUsage],
      statistics: this.getStatistics(),
      summary: this.getUsageSummary(),
    };
  }
}

// Export singleton getter
export function getTokenBudget(config?: TokenBudgetConfig): TokenBudgetManager {
  return TokenBudgetManager.getInstance(config);
}
