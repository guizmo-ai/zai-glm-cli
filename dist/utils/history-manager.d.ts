/**
 * Represents a single history entry
 */
export interface HistoryEntry {
    command: string;
    timestamp: number;
    workingDirectory?: string;
    model?: string;
}
/**
 * Options for searching history
 */
export interface HistorySearchOptions {
    query?: string;
    fuzzy?: boolean;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    workingDirectory?: string;
}
/**
 * Configuration for history manager
 */
export interface HistoryConfig {
    maxEntries: number;
    deduplicateConsecutive: boolean;
    enabled: boolean;
}
/**
 * Manages persistent command history storage and retrieval
 * History is stored in ~/.zai/history.json
 */
export declare class HistoryManager {
    private static instance;
    private historyPath;
    private history;
    private config;
    private saveTimeout;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(config?: Partial<HistoryConfig>): HistoryManager;
    /**
     * Reset the singleton instance (useful for testing)
     */
    static resetInstance(): void;
    /**
     * Ensure directory exists for history file
     */
    private ensureDirectoryExists;
    /**
     * Load history from disk
     */
    private loadHistory;
    /**
     * Save history to disk with debouncing
     */
    private saveHistory;
    /**
     * Add a command to history
     */
    addEntry(command: string, metadata?: {
        workingDirectory?: string;
        model?: string;
    }): void;
    /**
     * Get all history entries
     */
    getAll(): HistoryEntry[];
    /**
     * Get history as simple string array (for backward compatibility)
     */
    getAllCommands(): string[];
    /**
     * Search history with various filters
     */
    search(options?: HistorySearchOptions): HistoryEntry[];
    /**
     * Fuzzy match implementation
     * Checks if all characters in query appear in order in the text
     */
    private fuzzyMatch;
    /**
     * Clear all history
     */
    clear(): void;
    /**
     * Get the most recent N entries
     */
    getRecent(count: number): HistoryEntry[];
    /**
     * Get the most recent N commands as strings
     */
    getRecentCommands(count: number): string[];
    /**
     * Get history count
     */
    getCount(): number;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<HistoryConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): HistoryConfig;
    /**
     * Export history to a file
     */
    exportToFile(filePath: string): void;
    /**
     * Import history from a file
     */
    importFromFile(filePath: string, append?: boolean): void;
    /**
     * Get path to history file
     */
    getHistoryPath(): string;
}
/**
 * Convenience function to get the singleton instance
 */
export declare function getHistoryManager(): HistoryManager;
