import * as fs from "fs";
import * as path from "path";
import * as os from "os";
/**
 * Default history configuration
 */
const DEFAULT_CONFIG = {
    maxEntries: 1000,
    deduplicateConsecutive: true,
    enabled: true,
};
/**
 * Manages persistent command history storage and retrieval
 * History is stored in ~/.zai/history.json
 */
export class HistoryManager {
    static instance;
    historyPath;
    history = [];
    config;
    saveTimeout = null;
    constructor(config = {}) {
        this.historyPath = path.join(os.homedir(), ".zai", "history.json");
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.loadHistory();
    }
    /**
     * Get singleton instance
     */
    static getInstance(config) {
        if (!HistoryManager.instance) {
            HistoryManager.instance = new HistoryManager(config);
        }
        else if (config) {
            // Update config if instance already exists
            HistoryManager.instance.updateConfig(config);
        }
        return HistoryManager.instance;
    }
    /**
     * Reset the singleton instance (useful for testing)
     */
    static resetInstance() {
        if (HistoryManager.instance?.saveTimeout) {
            clearTimeout(HistoryManager.instance.saveTimeout);
        }
        HistoryManager.instance = null;
    }
    /**
     * Ensure directory exists for history file
     */
    ensureDirectoryExists() {
        const dir = path.dirname(this.historyPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        }
    }
    /**
     * Load history from disk
     */
    loadHistory() {
        try {
            if (!fs.existsSync(this.historyPath)) {
                this.history = [];
                return;
            }
            const content = fs.readFileSync(this.historyPath, "utf-8");
            const data = JSON.parse(content);
            // Validate and parse history entries
            if (Array.isArray(data)) {
                this.history = data
                    .filter((entry) => entry.command && entry.timestamp)
                    .map((entry) => ({
                    command: entry.command,
                    timestamp: entry.timestamp,
                    workingDirectory: entry.workingDirectory,
                    model: entry.model,
                }));
            }
            else {
                this.history = [];
            }
        }
        catch (error) {
            console.warn("Failed to load history:", error instanceof Error ? error.message : "Unknown error");
            this.history = [];
        }
    }
    /**
     * Save history to disk with debouncing
     */
    saveHistory() {
        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        if (!this.config.enabled) {
            return;
        }
        // Debounce saves to avoid excessive disk writes
        this.saveTimeout = setTimeout(() => {
            if (!this.config.enabled) {
                return;
            }
            try {
                this.ensureDirectoryExists();
                // Trim history to max entries before saving
                const historyToSave = this.history.slice(-this.config.maxEntries);
                fs.writeFileSync(this.historyPath, JSON.stringify(historyToSave, null, 2), { mode: 0o600 });
            }
            catch (error) {
                console.error("Failed to save history:", error instanceof Error ? error.message : "Unknown error");
            }
        }, 500); // 500ms debounce
    }
    /**
     * Add a command to history
     */
    addEntry(command, metadata) {
        if (!this.config.enabled || !command.trim()) {
            return;
        }
        const trimmedCommand = command.trim();
        // Deduplicate consecutive identical commands
        if (this.config.deduplicateConsecutive && this.history.length > 0) {
            const lastEntry = this.history[this.history.length - 1];
            if (lastEntry.command === trimmedCommand) {
                return; // Skip duplicate
            }
        }
        const entry = {
            command: trimmedCommand,
            timestamp: Date.now(),
            workingDirectory: metadata?.workingDirectory,
            model: metadata?.model,
        };
        this.history.push(entry);
        // Keep only the last maxEntries in memory
        if (this.history.length > this.config.maxEntries) {
            this.history = this.history.slice(-this.config.maxEntries);
        }
        this.saveHistory();
    }
    /**
     * Get all history entries
     */
    getAll() {
        return [...this.history];
    }
    /**
     * Get history as simple string array (for backward compatibility)
     */
    getAllCommands() {
        return this.history.map((entry) => entry.command);
    }
    /**
     * Search history with various filters
     */
    search(options = {}) {
        let results = [...this.history];
        // Filter by working directory
        if (options.workingDirectory) {
            results = results.filter((entry) => entry.workingDirectory === options.workingDirectory);
        }
        // Filter by date range
        if (options.startDate) {
            results = results.filter((entry) => entry.timestamp >= options.startDate.getTime());
        }
        if (options.endDate) {
            results = results.filter((entry) => entry.timestamp <= options.endDate.getTime());
        }
        // Filter by query
        if (options.query) {
            const query = options.query.toLowerCase();
            if (options.fuzzy) {
                // Fuzzy search: check if all characters in query appear in order
                results = results.filter((entry) => this.fuzzyMatch(entry.command.toLowerCase(), query));
            }
            else {
                // Simple substring search
                results = results.filter((entry) => entry.command.toLowerCase().includes(query));
            }
        }
        // Limit results
        if (options.limit && options.limit > 0) {
            results = results.slice(-options.limit);
        }
        return results;
    }
    /**
     * Fuzzy match implementation
     * Checks if all characters in query appear in order in the text
     */
    fuzzyMatch(text, query) {
        let queryIndex = 0;
        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
            if (text[i] === query[queryIndex]) {
                queryIndex++;
            }
        }
        return queryIndex === query.length;
    }
    /**
     * Clear all history
     */
    clear() {
        this.history = [];
        this.saveHistory();
    }
    /**
     * Get the most recent N entries
     */
    getRecent(count) {
        return this.history.slice(-count);
    }
    /**
     * Get the most recent N commands as strings
     */
    getRecentCommands(count) {
        return this.getRecent(count).map((entry) => entry.command);
    }
    /**
     * Get history count
     */
    getCount() {
        return this.history.length;
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        // Cancel any pending saves
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        // If history is disabled, clear it
        if (!this.config.enabled) {
            this.clear();
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Export history to a file
     */
    exportToFile(filePath) {
        try {
            const exportData = {
                exportDate: new Date().toISOString(),
                totalEntries: this.history.length,
                entries: this.history,
            };
            fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), {
                mode: 0o600,
            });
        }
        catch (error) {
            throw new Error(`Failed to export history: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Import history from a file
     */
    importFromFile(filePath, append = true) {
        try {
            const content = fs.readFileSync(filePath, "utf-8");
            const data = JSON.parse(content);
            let importedEntries = [];
            // Support both raw array and export format
            if (Array.isArray(data)) {
                importedEntries = data;
            }
            else if (data.entries && Array.isArray(data.entries)) {
                importedEntries = data.entries;
            }
            else {
                throw new Error("Invalid history file format");
            }
            // Validate entries
            importedEntries = importedEntries
                .filter((entry) => entry.command && entry.timestamp)
                .map((entry) => ({
                command: entry.command,
                timestamp: entry.timestamp,
                workingDirectory: entry.workingDirectory,
                model: entry.model,
            }));
            if (append) {
                this.history = [...this.history, ...importedEntries];
            }
            else {
                this.history = importedEntries;
            }
            // Trim to max entries
            if (this.history.length > this.config.maxEntries) {
                this.history = this.history.slice(-this.config.maxEntries);
            }
            this.saveHistory();
        }
        catch (error) {
            throw new Error(`Failed to import history: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Get path to history file
     */
    getHistoryPath() {
        return this.historyPath;
    }
}
/**
 * Convenience function to get the singleton instance
 */
export function getHistoryManager() {
    return HistoryManager.getInstance();
}
//# sourceMappingURL=history-manager.js.map