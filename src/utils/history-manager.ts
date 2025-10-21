import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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
 * Default history configuration
 */
const DEFAULT_CONFIG: HistoryConfig = {
  maxEntries: 1000,
  deduplicateConsecutive: true,
  enabled: true,
};

/**
 * Manages persistent command history storage and retrieval
 * History is stored in ~/.zai/history.json
 */
export class HistoryManager {
  private static instance: HistoryManager;
  private historyPath: string;
  private history: HistoryEntry[] = [];
  private config: HistoryConfig;
  private saveTimeout: NodeJS.Timeout | null = null;

  private constructor(config: Partial<HistoryConfig> = {}) {
    this.historyPath = path.join(os.homedir(), ".zai", "history.json");
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadHistory();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<HistoryConfig>): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager(config);
    } else if (config) {
      // Update config if instance already exists
      HistoryManager.instance.updateConfig(config);
    }
    return HistoryManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    if (HistoryManager.instance?.saveTimeout) {
      clearTimeout(HistoryManager.instance.saveTimeout);
    }
    HistoryManager.instance = null as any;
  }

  /**
   * Ensure directory exists for history file
   */
  private ensureDirectoryExists(): void {
    const dir = path.dirname(this.historyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Load history from disk
   */
  private loadHistory(): void {
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
      } else {
        this.history = [];
      }
    } catch (error) {
      console.warn(
        "Failed to load history:",
        error instanceof Error ? error.message : "Unknown error"
      );
      this.history = [];
    }
  }

  /**
   * Save history to disk with debouncing
   */
  private saveHistory(): void {
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

        fs.writeFileSync(
          this.historyPath,
          JSON.stringify(historyToSave, null, 2),
          { mode: 0o600 }
        );
      } catch (error) {
        console.error(
          "Failed to save history:",
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }, 500); // 500ms debounce
  }

  /**
   * Add a command to history
   */
  public addEntry(
    command: string,
    metadata?: { workingDirectory?: string; model?: string }
  ): void {
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

    const entry: HistoryEntry = {
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
  public getAll(): HistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get history as simple string array (for backward compatibility)
   */
  public getAllCommands(): string[] {
    return this.history.map((entry) => entry.command);
  }

  /**
   * Search history with various filters
   */
  public search(options: HistorySearchOptions = {}): HistoryEntry[] {
    let results = [...this.history];

    // Filter by working directory
    if (options.workingDirectory) {
      results = results.filter(
        (entry) => entry.workingDirectory === options.workingDirectory
      );
    }

    // Filter by date range
    if (options.startDate) {
      results = results.filter(
        (entry) => entry.timestamp >= options.startDate!.getTime()
      );
    }
    if (options.endDate) {
      results = results.filter(
        (entry) => entry.timestamp <= options.endDate!.getTime()
      );
    }

    // Filter by query
    if (options.query) {
      const query = options.query.toLowerCase();
      if (options.fuzzy) {
        // Fuzzy search: check if all characters in query appear in order
        results = results.filter((entry) =>
          this.fuzzyMatch(entry.command.toLowerCase(), query)
        );
      } else {
        // Simple substring search
        results = results.filter((entry) =>
          entry.command.toLowerCase().includes(query)
        );
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
  private fuzzyMatch(text: string, query: string): boolean {
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
  public clear(): void {
    this.history = [];
    this.saveHistory();
  }

  /**
   * Get the most recent N entries
   */
  public getRecent(count: number): HistoryEntry[] {
    return this.history.slice(-count);
  }

  /**
   * Get the most recent N commands as strings
   */
  public getRecentCommands(count: number): string[] {
    return this.getRecent(count).map((entry) => entry.command);
  }

  /**
   * Get history count
   */
  public getCount(): number {
    return this.history.length;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<HistoryConfig>): void {
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
  public getConfig(): HistoryConfig {
    return { ...this.config };
  }

  /**
   * Export history to a file
   */
  public exportToFile(filePath: string): void {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        totalEntries: this.history.length,
        entries: this.history,
      };

      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), {
        mode: 0o600,
      });
    } catch (error) {
      throw new Error(
        `Failed to export history: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Import history from a file
   */
  public importFromFile(filePath: string, append: boolean = true): void {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);

      let importedEntries: HistoryEntry[] = [];

      // Support both raw array and export format
      if (Array.isArray(data)) {
        importedEntries = data;
      } else if (data.entries && Array.isArray(data.entries)) {
        importedEntries = data.entries;
      } else {
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
      } else {
        this.history = importedEntries;
      }

      // Trim to max entries
      if (this.history.length > this.config.maxEntries) {
        this.history = this.history.slice(-this.config.maxEntries);
      }

      this.saveHistory();
    } catch (error) {
      throw new Error(
        `Failed to import history: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get path to history file
   */
  public getHistoryPath(): string {
    return this.historyPath;
  }
}

/**
 * Convenience function to get the singleton instance
 */
export function getHistoryManager(): HistoryManager {
  return HistoryManager.getInstance();
}
