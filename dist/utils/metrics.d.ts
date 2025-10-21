export interface TaskMetrics {
    taskId: string;
    timestamp: Date;
    userMessage: string;
    toolRoundsUsed: number;
    totalToolCalls: number;
    firstAttemptSuccess: boolean;
    errorsEncountered: number;
    userCorrectionsNeeded: number;
    taskCompleted: boolean;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    startTime: Date;
    endTime: Date;
    durationMs: number;
    toolsUsed: Record<string, number>;
}
export declare class MetricsCollector {
    private metrics;
    private currentTask;
    private metricsDir;
    private metricsFile;
    constructor();
    private ensureMetricsDirectory;
    private loadMetrics;
    private saveMetrics;
    startTask(userMessage: string): string;
    recordToolRound(): void;
    recordToolCall(toolName: string, success: boolean): void;
    recordTokens(input: number, output: number): void;
    recordUserCorrection(): void;
    endTask(completed: boolean): void;
    getCurrentTask(): Partial<TaskMetrics> | null;
    getMetrics(): TaskMetrics[];
    getRecentMetrics(count?: number): TaskMetrics[];
    getAverageMetrics(): {
        avgToolRounds: number;
        avgToolCalls: number;
        firstAttemptSuccessRate: number;
        avgErrors: number;
        avgTokens: number;
        avgDurationMs: number;
        avgDurationSeconds: number;
        completionRate: number;
        totalTasks: number;
    };
    getToolUsageStats(): Record<string, {
        count: number;
        percentage: number;
        avgPerTask: number;
    }>;
    getPerformanceTrends(windowSize?: number): {
        recent: any;
        previous: any;
        improvement: {
            toolRounds: number;
            errors: number;
            duration: number;
            successRate: number;
        };
    };
    exportMetrics(filePath?: string): string;
    clearMetrics(): void;
    generateReport(): string;
}
export declare function getMetricsCollector(): MetricsCollector;
export declare function resetMetricsCollector(): void;
