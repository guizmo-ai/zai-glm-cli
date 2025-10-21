import * as fs from "fs";
import * as path from "path";
import * as os from "os";
export class MetricsCollector {
    metrics = [];
    currentTask = null;
    metricsDir;
    metricsFile;
    constructor() {
        this.metricsDir = path.join(os.homedir(), ".zai", "metrics");
        this.metricsFile = path.join(this.metricsDir, "task-metrics.json");
        this.ensureMetricsDirectory();
        this.loadMetrics();
    }
    ensureMetricsDirectory() {
        if (!fs.existsSync(this.metricsDir)) {
            fs.mkdirSync(this.metricsDir, { recursive: true });
        }
    }
    loadMetrics() {
        try {
            if (fs.existsSync(this.metricsFile)) {
                const data = fs.readFileSync(this.metricsFile, "utf-8");
                const parsed = JSON.parse(data);
                // Convert date strings back to Date objects
                this.metrics = parsed.map((m) => ({
                    ...m,
                    timestamp: new Date(m.timestamp),
                    startTime: new Date(m.startTime),
                    endTime: new Date(m.endTime),
                }));
            }
        }
        catch (error) {
            console.warn("Could not load metrics:", error);
            this.metrics = [];
        }
    }
    saveMetrics() {
        try {
            fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2), "utf-8");
        }
        catch (error) {
            console.warn("Could not save metrics:", error);
        }
    }
    startTask(userMessage) {
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.currentTask = {
            taskId,
            timestamp: new Date(),
            userMessage,
            startTime: new Date(),
            toolRoundsUsed: 0,
            totalToolCalls: 0,
            errorsEncountered: 0,
            userCorrectionsNeeded: 0,
            inputTokens: 0,
            outputTokens: 0,
            toolsUsed: {},
        };
        return taskId;
    }
    recordToolRound() {
        if (this.currentTask) {
            this.currentTask.toolRoundsUsed = (this.currentTask.toolRoundsUsed || 0) + 1;
        }
    }
    recordToolCall(toolName, success) {
        if (this.currentTask) {
            this.currentTask.totalToolCalls = (this.currentTask.totalToolCalls || 0) + 1;
            // Track tool usage
            if (!this.currentTask.toolsUsed) {
                this.currentTask.toolsUsed = {};
            }
            this.currentTask.toolsUsed[toolName] =
                (this.currentTask.toolsUsed[toolName] || 0) + 1;
            if (!success) {
                this.currentTask.errorsEncountered =
                    (this.currentTask.errorsEncountered || 0) + 1;
            }
            // Track first attempt success
            if (this.currentTask.totalToolCalls === 1) {
                this.currentTask.firstAttemptSuccess = success;
            }
        }
    }
    recordTokens(input, output) {
        if (this.currentTask) {
            this.currentTask.inputTokens = input;
            this.currentTask.outputTokens = output;
            this.currentTask.totalTokens = input + output;
        }
    }
    recordUserCorrection() {
        if (this.currentTask) {
            this.currentTask.userCorrectionsNeeded =
                (this.currentTask.userCorrectionsNeeded || 0) + 1;
        }
    }
    endTask(completed) {
        if (this.currentTask) {
            this.currentTask.endTime = new Date();
            this.currentTask.taskCompleted = completed;
            this.currentTask.durationMs =
                this.currentTask.endTime.getTime() -
                    this.currentTask.startTime.getTime();
            this.metrics.push(this.currentTask);
            this.saveMetrics();
            this.currentTask = null;
        }
    }
    getCurrentTask() {
        return this.currentTask;
    }
    getMetrics() {
        return [...this.metrics];
    }
    getRecentMetrics(count = 10) {
        return [...this.metrics].slice(-count);
    }
    getAverageMetrics() {
        if (this.metrics.length === 0) {
            return {
                avgToolRounds: 0,
                avgToolCalls: 0,
                firstAttemptSuccessRate: 0,
                avgErrors: 0,
                avgTokens: 0,
                avgDurationMs: 0,
                avgDurationSeconds: 0,
                completionRate: 0,
                totalTasks: 0,
            };
        }
        const sum = this.metrics.reduce((acc, m) => ({
            toolRounds: acc.toolRounds + m.toolRoundsUsed,
            toolCalls: acc.toolCalls + m.totalToolCalls,
            firstSuccess: acc.firstSuccess + (m.firstAttemptSuccess ? 1 : 0),
            errors: acc.errors + m.errorsEncountered,
            tokens: acc.tokens + m.totalTokens,
            duration: acc.duration + m.durationMs,
            completed: acc.completed + (m.taskCompleted ? 1 : 0),
        }), {
            toolRounds: 0,
            toolCalls: 0,
            firstSuccess: 0,
            errors: 0,
            tokens: 0,
            duration: 0,
            completed: 0,
        });
        const count = this.metrics.length;
        return {
            avgToolRounds: sum.toolRounds / count,
            avgToolCalls: sum.toolCalls / count,
            firstAttemptSuccessRate: (sum.firstSuccess / count) * 100,
            avgErrors: sum.errors / count,
            avgTokens: sum.tokens / count,
            avgDurationMs: sum.duration / count,
            avgDurationSeconds: sum.duration / count / 1000,
            completionRate: (sum.completed / count) * 100,
            totalTasks: count,
        };
    }
    getToolUsageStats() {
        const toolStats = {};
        let totalToolCalls = 0;
        this.metrics.forEach((m) => {
            Object.entries(m.toolsUsed).forEach(([tool, count]) => {
                toolStats[tool] = (toolStats[tool] || 0) + count;
                totalToolCalls += count;
            });
        });
        const result = {};
        Object.entries(toolStats).forEach(([tool, count]) => {
            result[tool] = {
                count,
                percentage: (count / totalToolCalls) * 100,
                avgPerTask: count / this.metrics.length,
            };
        });
        return result;
    }
    getPerformanceTrends(windowSize = 10) {
        if (this.metrics.length < windowSize * 2) {
            return {
                recent: this.getAverageMetrics(),
                previous: this.getAverageMetrics(),
                improvement: {
                    toolRounds: 0,
                    errors: 0,
                    duration: 0,
                    successRate: 0,
                },
            };
        }
        const recentMetrics = this.metrics.slice(-windowSize);
        const previousMetrics = this.metrics.slice(-windowSize * 2, -windowSize);
        const calculateAvg = (metrics) => {
            const sum = metrics.reduce((acc, m) => ({
                toolRounds: acc.toolRounds + m.toolRoundsUsed,
                errors: acc.errors + m.errorsEncountered,
                duration: acc.duration + m.durationMs,
                firstSuccess: acc.firstSuccess + (m.firstAttemptSuccess ? 1 : 0),
            }), { toolRounds: 0, errors: 0, duration: 0, firstSuccess: 0 });
            return {
                avgToolRounds: sum.toolRounds / metrics.length,
                avgErrors: sum.errors / metrics.length,
                avgDuration: sum.duration / metrics.length,
                successRate: (sum.firstSuccess / metrics.length) * 100,
            };
        };
        const recent = calculateAvg(recentMetrics);
        const previous = calculateAvg(previousMetrics);
        return {
            recent,
            previous,
            improvement: {
                toolRounds: ((previous.avgToolRounds - recent.avgToolRounds) /
                    previous.avgToolRounds) *
                    100,
                errors: ((previous.avgErrors - recent.avgErrors) / previous.avgErrors) * 100,
                duration: ((previous.avgDuration - recent.avgDuration) / previous.avgDuration) *
                    100,
                successRate: recent.successRate - previous.successRate,
            },
        };
    }
    exportMetrics(filePath) {
        const exportPath = filePath || path.join(this.metricsDir, `metrics-export-${Date.now()}.json`);
        const data = {
            exportDate: new Date().toISOString(),
            summary: this.getAverageMetrics(),
            toolUsage: this.getToolUsageStats(),
            trends: this.getPerformanceTrends(),
            tasks: this.metrics,
        };
        fs.writeFileSync(exportPath, JSON.stringify(data, null, 2), "utf-8");
        return exportPath;
    }
    clearMetrics() {
        this.metrics = [];
        this.saveMetrics();
    }
    generateReport() {
        const avg = this.getAverageMetrics();
        const toolUsage = this.getToolUsageStats();
        const trends = this.getPerformanceTrends();
        let report = "=== ZAI CLI Metrics Report ===\n\n";
        // Summary
        report += "SUMMARY:\n";
        report += `Total Tasks: ${avg.totalTasks}\n`;
        report += `Completion Rate: ${avg.completionRate.toFixed(1)}%\n`;
        report += `First Attempt Success Rate: ${avg.firstAttemptSuccessRate.toFixed(1)}%\n\n`;
        // Performance
        report += "PERFORMANCE:\n";
        report += `Average Tool Rounds: ${avg.avgToolRounds.toFixed(2)}\n`;
        report += `Average Tool Calls: ${avg.avgToolCalls.toFixed(2)}\n`;
        report += `Average Errors: ${avg.avgErrors.toFixed(2)}\n`;
        report += `Average Duration: ${avg.avgDurationSeconds.toFixed(2)}s\n\n`;
        // Cost
        report += "COST:\n";
        report += `Average Tokens per Task: ${avg.avgTokens.toFixed(0)}\n`;
        report += `Total Tokens Used: ${(avg.avgTokens * avg.totalTasks).toFixed(0)}\n\n`;
        // Tool Usage
        report += "TOOL USAGE:\n";
        const sortedTools = Object.entries(toolUsage).sort(([, a], [, b]) => b.count - a.count);
        sortedTools.forEach(([tool, stats]) => {
            report += `  ${tool}: ${stats.count} calls (${stats.percentage.toFixed(1)}%, avg ${stats.avgPerTask.toFixed(2)}/task)\n`;
        });
        // Trends
        if (trends.recent !== trends.previous) {
            report += "\nPERFORMANCE TRENDS (recent vs previous):\n";
            report += `  Tool Rounds: ${trends.improvement.toolRounds > 0 ? "↓" : "↑"} ${Math.abs(trends.improvement.toolRounds).toFixed(1)}%\n`;
            report += `  Errors: ${trends.improvement.errors > 0 ? "↓" : "↑"} ${Math.abs(trends.improvement.errors).toFixed(1)}%\n`;
            report += `  Duration: ${trends.improvement.duration > 0 ? "↓" : "↑"} ${Math.abs(trends.improvement.duration).toFixed(1)}%\n`;
            report += `  Success Rate: ${trends.improvement.successRate > 0 ? "↑" : "↓"} ${Math.abs(trends.improvement.successRate).toFixed(1)}%\n`;
        }
        return report;
    }
}
// Singleton instance
let metricsCollector = null;
export function getMetricsCollector() {
    if (!metricsCollector) {
        metricsCollector = new MetricsCollector();
    }
    return metricsCollector;
}
export function resetMetricsCollector() {
    metricsCollector = null;
}
//# sourceMappingURL=metrics.js.map