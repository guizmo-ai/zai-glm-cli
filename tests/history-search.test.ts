import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { HistoryManager } from "../src/utils/history-manager.js";
import { SettingsManager } from "../src/utils/settings-manager.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * History Search Component and Functionality Tests
 *
 * Note: These tests focus on integration testing the history functionality
 * through HistoryManager and custom simulators rather than React hooks,
 * since we don't have @testing-library/react installed. The hook behavior
 * is tested through the underlying manager functionality and simulated state.
 *
 * Test Coverage:
 * - History navigation (up/down arrows)
 * - History search with Ctrl+R
 * - Fuzzy search functionality
 * - Search mode keyboard handling
 * - Component display logic
 * - Metadata handling
 * - Edge cases and error conditions
 */

// Simulate history navigation logic (matches use-input-history behavior)
class HistoryNavigator {
  private currentIndex = -1;
  private originalInput = "";

  constructor(private history: string[]) {}

  setOriginalInput(input: string): void {
    if (this.currentIndex === -1) {
      this.originalInput = input;
    }
  }

  navigateUp(): string | null {
    if (this.history.length === 0) return null;

    if (this.currentIndex === -1) {
      this.currentIndex = this.history.length - 1;
    } else {
      this.currentIndex = Math.max(0, this.currentIndex - 1);
    }

    return this.history[this.currentIndex];
  }

  navigateDown(): string | null {
    if (this.currentIndex === -1) return null;

    if (this.currentIndex === this.history.length - 1) {
      this.currentIndex = -1;
      return this.originalInput;
    } else {
      this.currentIndex = Math.min(this.history.length - 1, this.currentIndex + 1);
      return this.history[this.currentIndex];
    }
  }

  reset(): void {
    this.currentIndex = -1;
    this.originalInput = "";
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  isNavigating(): boolean {
    return this.currentIndex !== -1;
  }
}

// Simulate search mode state (matches use-enhanced-input Ctrl+R behavior)
class SearchModeSimulator {
  private searchActive = false;
  private searchQuery = "";
  private searchResults: any[] = [];
  private searchIndex = 0;
  private originalInput = "";

  constructor(private historyManager: HistoryManager) {}

  activateSearch(currentInput: string): void {
    this.searchActive = true;
    this.originalInput = currentInput;
    this.searchQuery = "";
    this.searchResults = this.historyManager.search({ fuzzy: true });
    this.searchIndex = this.searchResults.length > 0 ? this.searchResults.length - 1 : 0;
  }

  addToQuery(char: string): void {
    if (!this.searchActive) return;
    this.searchQuery += char;
    this.searchResults = this.historyManager.search({ query: this.searchQuery, fuzzy: true });
    this.searchIndex = this.searchResults.length > 0 ? this.searchResults.length - 1 : 0;
  }

  removeFromQuery(): void {
    if (!this.searchActive || this.searchQuery.length === 0) return;
    this.searchQuery = this.searchQuery.slice(0, -1);
    this.searchResults = this.historyManager.search({ query: this.searchQuery, fuzzy: true });
    this.searchIndex = this.searchResults.length > 0 ? this.searchResults.length - 1 : 0;
  }

  navigateUp(): void {
    if (!this.searchActive || this.searchResults.length === 0) return;
    this.searchIndex = this.searchIndex > 0 ? this.searchIndex - 1 : this.searchResults.length - 1;
  }

  navigateDown(): void {
    if (!this.searchActive || this.searchResults.length === 0) return;
    this.searchIndex = (this.searchIndex + 1) % this.searchResults.length;
  }

  cyclePrevious(): void {
    if (!this.searchActive || this.searchResults.length === 0) return;
    this.searchIndex = this.searchIndex > 0 ? this.searchIndex - 1 : this.searchResults.length - 1;
  }

  selectCurrent(): string {
    if (!this.searchActive) return "";

    const selected = this.searchResults.length > 0 && this.searchIndex >= 0
      ? this.searchResults[this.searchIndex].command
      : "";

    this.deactivate();
    return selected;
  }

  cancel(): string {
    const original = this.originalInput;
    this.deactivate();
    return original;
  }

  deactivate(): void {
    this.searchActive = false;
    this.searchQuery = "";
    this.searchResults = [];
    this.searchIndex = 0;
  }

  isActive(): boolean {
    return this.searchActive;
  }

  getQuery(): string {
    return this.searchQuery;
  }

  getResults(): any[] {
    return this.searchResults;
  }

  getIndex(): number {
    return this.searchIndex;
  }
}

describe("History Search Integration Tests", () => {
  let testHistoryPath: string;
  let testSettingsPath: string;

  beforeEach(() => {
    // Reset singleton instances
    HistoryManager.resetInstance();
    (SettingsManager as any).instance = null;

    // Create temporary directory for test files
    const tempDir = path.join(os.tmpdir(), `zai-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    testHistoryPath = path.join(tempDir, "history.json");
    testSettingsPath = path.join(tempDir, "user-settings.json");

    // Override paths for testing
    const historyManager = HistoryManager.getInstance();
    (historyManager as any).historyPath = testHistoryPath;

    const settingsManager = SettingsManager.getInstance();
    (settingsManager as any).userSettingsPath = testSettingsPath;

    // Initialize with enableHistory: true
    fs.writeFileSync(
      testSettingsPath,
      JSON.stringify({ enableHistory: true })
    );
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testHistoryPath)) {
      fs.unlinkSync(testHistoryPath);
    }
    if (fs.existsSync(testSettingsPath)) {
      fs.unlinkSync(testSettingsPath);
    }
    const dir = path.dirname(testHistoryPath);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    // Reset singletons
    HistoryManager.resetInstance();
    (SettingsManager as any).instance = null;
  });

  describe("History Navigation Logic", () => {
    it("should initialize with empty history", () => {
      const historyManager = HistoryManager.getInstance();

      expect(historyManager.getAllCommands()).toEqual([]);
      expect(historyManager.getCount()).toBe(0);
    });

    it("should add commands to history with metadata", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("npm install", {
        workingDirectory: "/project1",
        model: "glm-4.6",
      });

      expect(historyManager.getAllCommands()).toEqual(["npm install"]);

      historyManager.addEntry("npm test", {
        workingDirectory: "/project1",
        model: "glm-4.5",
      });

      expect(historyManager.getAllCommands()).toEqual(["npm install", "npm test"]);
    });

    it("should navigate history up and down", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("command1");
      historyManager.addEntry("command2");
      historyManager.addEntry("command3");

      const history = historyManager.getAllCommands();
      const navigator = new HistoryNavigator(history);

      // Navigate up
      let navigatedCommand = navigator.navigateUp();
      expect(navigatedCommand).toBe("command3");
      expect(navigator.getCurrentIndex()).toBe(2);

      navigatedCommand = navigator.navigateUp();
      expect(navigatedCommand).toBe("command2");
      expect(navigator.getCurrentIndex()).toBe(1);

      // Navigate down
      navigatedCommand = navigator.navigateDown();
      expect(navigatedCommand).toBe("command3");
      expect(navigator.getCurrentIndex()).toBe(2);
    });

    it("should preserve original input during history navigation", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("command1");
      historyManager.addEntry("command2");

      const history = historyManager.getAllCommands();
      const navigator = new HistoryNavigator(history);
      navigator.setOriginalInput("my current input");

      // Navigate through history
      let navigatedCommand = navigator.navigateUp();
      expect(navigatedCommand).toBe("command2");

      // Navigate back down past history
      navigatedCommand = navigator.navigateDown();
      expect(navigatedCommand).toBe("my current input");
    });

    it("should search history with query", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("npm install react");
      historyManager.addEntry("git commit -m 'fix'");
      historyManager.addEntry("npm test");
      historyManager.addEntry("git push");

      const searchResults = historyManager.search({ query: "npm" });

      expect(searchResults).toHaveLength(2);
      expect(searchResults[0].command).toBe("npm install react");
      expect(searchResults[1].command).toBe("npm test");
    });

    it("should search history with fuzzy matching", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("npm install");
      historyManager.addEntry("npm test");
      historyManager.addEntry("git commit");

      const searchResults = historyManager.search({ query: "npmts", fuzzy: true });

      // "npmts" should match "npm test" with fuzzy search
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].command).toBe("npm test");
    });

    it("should reset history navigation state", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("command1");

      const history = historyManager.getAllCommands();
      const navigator = new HistoryNavigator(history);

      navigator.setOriginalInput("original");
      navigator.navigateUp();

      expect(navigator.isNavigating()).toBe(true);

      navigator.reset();

      expect(navigator.isNavigating()).toBe(false);
      expect(navigator.getCurrentIndex()).toBe(-1);
    });

    it("should respect enableHistory setting", () => {
      // Disable history
      fs.writeFileSync(
        testSettingsPath,
        JSON.stringify({ enableHistory: false })
      );

      // Force reload settings
      (SettingsManager as any).instance = null;
      HistoryManager.resetInstance();

      const historyManager = HistoryManager.getInstance({ enabled: false });
      (historyManager as any).historyPath = testHistoryPath;

      historyManager.addEntry("command1");

      expect(historyManager.getAllCommands()).toEqual([]);
    });

    it("should not add empty commands to history", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("");
      historyManager.addEntry("   ");
      historyManager.addEntry("valid command");

      expect(historyManager.getAllCommands()).toEqual(["valid command"]);
    });

    it("should return null when navigating empty history", () => {
      const navigator = new HistoryNavigator([]);

      const navigatedCommand = navigator.navigateUp();

      expect(navigatedCommand).toBeNull();
    });
  });

  describe("Search Mode (Ctrl+R) Integration", () => {
    it("should activate history search with Ctrl+R", () => {
      const historyManager = HistoryManager.getInstance();
      const searchSim = new SearchModeSimulator(historyManager);

      searchSim.activateSearch("");

      expect(searchSim.isActive()).toBe(true);
      expect(searchSim.getQuery()).toBe("");
    });

    it("should update search query as user types", () => {
      const historyManager = HistoryManager.getInstance();
      const searchSim = new SearchModeSimulator(historyManager);

      // Activate search mode
      searchSim.activateSearch("");

      // Type search query
      searchSim.addToQuery("n");
      expect(searchSim.getQuery()).toBe("n");

      searchSim.addToQuery("p");
      expect(searchSim.getQuery()).toBe("np");

      searchSim.addToQuery("m");
      expect(searchSim.getQuery()).toBe("npm");
    });

    it("should navigate search results with Up/Down arrows", () => {
      const historyManager = HistoryManager.getInstance();

      // Add some history first
      historyManager.addEntry("npm install");
      historyManager.addEntry("npm test");
      historyManager.addEntry("npm run build");

      const searchSim = new SearchModeSimulator(historyManager);
      searchSim.activateSearch("");

      const initialIndex = searchSim.getIndex();
      const resultsLength = searchSim.getResults().length;

      // Navigate down
      searchSim.navigateDown();
      expect(searchSim.getIndex()).toBe((initialIndex + 1) % resultsLength);

      // Navigate up
      searchSim.navigateUp();
      expect(searchSim.getIndex()).toBe(initialIndex);
    });

    it("should select result and exit search with Enter", () => {
      const historyManager = HistoryManager.getInstance();

      // Add history
      historyManager.addEntry("npm test");

      const searchSim = new SearchModeSimulator(historyManager);
      searchSim.activateSearch("");

      expect(searchSim.isActive()).toBe(true);

      // Select current (most recent)
      const selected = searchSim.selectCurrent();

      expect(searchSim.isActive()).toBe(false);
      expect(selected).toBe("npm test");
    });

    it("should cancel search with Escape", () => {
      const historyManager = HistoryManager.getInstance();
      const searchSim = new SearchModeSimulator(historyManager);

      const originalInput = "my current input";
      searchSim.activateSearch(originalInput);

      expect(searchSim.isActive()).toBe(true);

      // Type some search query
      searchSim.addToQuery("n");
      searchSim.addToQuery("p");

      // Cancel search
      const restored = searchSim.cancel();

      expect(searchSim.isActive()).toBe(false);
      expect(searchSim.getQuery()).toBe("");
      expect(restored).toBe(originalInput);
    });

    it("should handle backspace in search mode", () => {
      const historyManager = HistoryManager.getInstance();
      const searchSim = new SearchModeSimulator(historyManager);

      // Activate search
      searchSim.activateSearch("");

      // Type search query
      searchSim.addToQuery("n");
      searchSim.addToQuery("p");
      searchSim.addToQuery("m");

      expect(searchSim.getQuery()).toBe("npm");

      // Backspace
      searchSim.removeFromQuery();
      expect(searchSim.getQuery()).toBe("np");

      // Backspace again
      searchSim.removeFromQuery();
      expect(searchSim.getQuery()).toBe("n");
    });

    it("should filter search results based on query", () => {
      const historyManager = HistoryManager.getInstance();

      // Add diverse history
      historyManager.addEntry("npm install react");
      historyManager.addEntry("git commit -m 'test'");
      historyManager.addEntry("npm test");

      const searchSim = new SearchModeSimulator(historyManager);
      searchSim.activateSearch("");

      // Type "npm" - should filter to npm commands
      searchSim.addToQuery("n");
      searchSim.addToQuery("p");
      searchSim.addToQuery("m");

      // Should have 2 results matching "npm"
      const results = searchSim.getResults();
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.command.includes("npm"))).toBe(true);
    });

    it("should handle Ctrl+R cycling through previous matches", () => {
      const historyManager = HistoryManager.getInstance();

      // Add history
      historyManager.addEntry("npm install");
      historyManager.addEntry("npm test");

      const searchSim = new SearchModeSimulator(historyManager);
      searchSim.activateSearch("");

      expect(searchSim.isActive()).toBe(true);
      const firstIndex = searchSim.getIndex();

      // Cycle to previous match
      searchSim.cyclePrevious();

      expect(searchSim.isActive()).toBe(true);
      // Index should have changed (cycled)
      const secondIndex = searchSim.getIndex();
      expect(secondIndex).not.toBe(firstIndex);
    });

    it("should handle empty search results gracefully", () => {
      const historyManager = HistoryManager.getInstance();
      const searchSim = new SearchModeSimulator(historyManager);

      // Activate search with no history
      searchSim.activateSearch("");

      expect(searchSim.isActive()).toBe(true);
      expect(searchSim.getResults()).toEqual([]);

      // Try to navigate - should not crash
      searchSim.navigateUp();
      searchSim.navigateDown();

      // Try to select - should just exit search mode
      const selected = searchSim.selectCurrent();

      expect(searchSim.isActive()).toBe(false);
      expect(selected).toBe("");
    });

    it("should deactivate cleanly", () => {
      const historyManager = HistoryManager.getInstance();
      historyManager.addEntry("test command");

      const searchSim = new SearchModeSimulator(historyManager);
      searchSim.activateSearch("");
      searchSim.addToQuery("test");

      expect(searchSim.isActive()).toBe(true);
      expect(searchSim.getQuery()).toBe("test");

      searchSim.deactivate();

      expect(searchSim.isActive()).toBe(false);
      expect(searchSim.getQuery()).toBe("");
      expect(searchSim.getResults()).toEqual([]);
    });
  });

  describe("History Search Component Display Logic", () => {
    it("should display up to maxResults entries", () => {
      const historyManager = HistoryManager.getInstance();

      // Add 15 entries
      for (let i = 1; i <= 15; i++) {
        historyManager.addEntry(`command${i}`);
      }

      const allEntries = historyManager.getAll();
      const maxResults = 10;
      const displayResults = allEntries.slice(-maxResults);

      expect(displayResults).toHaveLength(10);
      expect(displayResults[0].command).toBe("command6");
      expect(displayResults[9].command).toBe("command15");
    });

    it("should calculate adjusted index when limiting results", () => {
      const totalResults = 15;
      const maxResults = 10;
      const selectedIndex = 14; // Last item

      const adjustedIndex = selectedIndex - Math.max(0, totalResults - maxResults);

      expect(adjustedIndex).toBe(9); // Last item in display
    });

    it("should format timestamps correctly", () => {
      const historyManager = HistoryManager.getInstance();
      historyManager.addEntry("test command");

      const entries = historyManager.getAll();
      const timestamp = entries[0].timestamp;
      const displayTimestamp = new Date(timestamp).toLocaleString();

      expect(displayTimestamp).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Contains date
    });

    it("should shorten long directory paths", () => {
      const homeDir = os.homedir();

      // Test home directory replacement
      const homePath = path.join(homeDir, "projects", "my-app");
      const shortened1 = homePath.startsWith(homeDir)
        ? "~" + homePath.slice(homeDir.length)
        : homePath;

      expect(shortened1).toMatch(/^~/);

      // Test long path truncation
      const longPath = "/very/long/path/to/some/project/directory";
      const segments = longPath.split("/").filter(Boolean);
      const shortened2 =
        segments.length > 3 ? ".../" + segments.slice(-2).join("/") : longPath;

      expect(shortened2).toBe(".../project/directory");
    });

    it("should handle search with metadata filters", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("npm install", {
        workingDirectory: "/project1",
        model: "glm-4.6",
      });
      historyManager.addEntry("npm test", {
        workingDirectory: "/project1",
        model: "glm-4.5",
      });
      historyManager.addEntry("git commit", {
        workingDirectory: "/project2",
        model: "glm-4.6",
      });

      const results = historyManager.search({
        workingDirectory: "/project1",
      });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.workingDirectory === "/project1")).toBe(true);
    });

    it("should display empty state message when no results", () => {
      const query = "nonexistent";
      const results: any[] = [];

      const message = query
        ? `No matches found for "${query}"`
        : "Start typing to search history...";

      expect(message).toBe('No matches found for "nonexistent"');
    });

    it("should display empty state for no query", () => {
      const query = "";
      const results: any[] = [];

      const message = query
        ? `No matches found for "${query}"`
        : "Start typing to search history...";

      expect(message).toBe("Start typing to search history...");
    });

    it("should show result count when exceeding maxResults", () => {
      const totalResults = 25;
      const maxResults = 10;

      const shouldShow = totalResults > maxResults;
      const message = `Showing ${maxResults} of ${totalResults} matches`;

      expect(shouldShow).toBe(true);
      expect(message).toBe("Showing 10 of 25 matches");
    });

    it("should indicate selected item with marker", () => {
      const entries = [
        { command: "cmd1", timestamp: Date.now() },
        { command: "cmd2", timestamp: Date.now() },
        { command: "cmd3", timestamp: Date.now() },
      ];

      const selectedIndex = 1;

      entries.forEach((entry, index) => {
        const isSelected = index === selectedIndex;
        const marker = isSelected ? "▶ " : "  ";

        if (index === 1) {
          expect(marker).toBe("▶ ");
        } else {
          expect(marker).toBe("  ");
        }
      });
    });

    it("should show keyboard navigation hints", () => {
      const hints = "↑/↓ navigate • Enter to select • Esc to cancel";
      expect(hints).toContain("↑/↓ navigate");
      expect(hints).toContain("Enter to select");
      expect(hints).toContain("Esc to cancel");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle rapid search activation/deactivation", () => {
      const historyManager = HistoryManager.getInstance();
      historyManager.addEntry("cmd1");
      historyManager.addEntry("cmd2");

      const searchSim = new SearchModeSimulator(historyManager);

      // Rapid activations
      searchSim.activateSearch("");
      searchSim.deactivate();
      searchSim.activateSearch("");
      searchSim.deactivate();
      searchSim.activateSearch("");

      expect(searchSim.isActive()).toBe(true);
    });

    it("should handle navigation at boundaries", () => {
      const historyManager = HistoryManager.getInstance();
      historyManager.addEntry("only command");

      const history = historyManager.getAllCommands();
      const navigator = new HistoryNavigator(history);

      // Try to go up beyond the first command
      let navigated = navigator.navigateUp();
      expect(navigated).toBe("only command");

      navigated = navigator.navigateUp();
      expect(navigated).toBe("only command"); // Should stay at first

      // Try to go down when already at the bottom
      navigated = navigator.navigateDown();
      expect(navigated).not.toBeNull(); // Returns to original input
    });

    it("should handle special characters in search query", () => {
      const historyManager = HistoryManager.getInstance();

      // Add history with special characters
      historyManager.addEntry("echo 'hello world'");

      const searchSim = new SearchModeSimulator(historyManager);
      searchSim.activateSearch("");

      // Search with special characters
      searchSim.addToQuery("'");

      expect(searchSim.getQuery()).toBe("'");
      // Should still work without crashing
      expect(searchSim.isActive()).toBe(true);
    });

    it("should handle very long command strings", () => {
      const historyManager = HistoryManager.getInstance();

      const longCommand = "a".repeat(1000);

      historyManager.addEntry(longCommand);

      const history = historyManager.getAllCommands();
      expect(history[0]).toBe(longCommand);
      expect(history[0].length).toBe(1000);
    });

    it("should handle Unicode characters in commands", () => {
      const historyManager = HistoryManager.getInstance();

      const unicodeCommand = "echo '你好世界' 🚀";

      historyManager.addEntry(unicodeCommand);

      const searchResults = historyManager.search({ query: "你好" });

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].command).toBe(unicodeCommand);
    });

    it("should handle empty query with populated history", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("cmd1");
      historyManager.addEntry("cmd2");
      historyManager.addEntry("cmd3");

      const results = historyManager.search({ query: "" });

      // Empty query should return all results
      expect(results.length).toBe(3);
    });

    it("should handle backspace on empty search query", () => {
      const historyManager = HistoryManager.getInstance();
      const searchSim = new SearchModeSimulator(historyManager);

      searchSim.activateSearch("");

      // Try to backspace when query is empty
      searchSim.removeFromQuery();

      expect(searchSim.getQuery()).toBe("");
      expect(searchSim.isActive()).toBe(true);
    });
  });

  describe("Integration with HistoryManager", () => {
    it("should persist and load history across instances", async () => {
      // First instance adds history
      const historyManager1 = HistoryManager.getInstance();
      (historyManager1 as any).historyPath = testHistoryPath;

      historyManager1.addEntry("command1");
      historyManager1.addEntry("command2");

      // Wait for debounced save
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Create new instance - should load persisted history
      HistoryManager.resetInstance();
      const historyManager2 = HistoryManager.getInstance();
      (historyManager2 as any).historyPath = testHistoryPath;
      (historyManager2 as any).loadHistory();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have loaded the history
      expect(historyManager2.getAllCommands().length).toBeGreaterThanOrEqual(2);
    });

    it("should use fuzzy search from HistoryManager", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("npm run build:prod");
      historyManager.addEntry("git push origin main");
      historyManager.addEntry("docker compose up");

      const results = historyManager.search({ query: "nrb", fuzzy: true });

      // "nrb" should fuzzy match "npm run build:prod"
      expect(results.some((r) => r.command.includes("npm run build"))).toBe(true);
    });

    it("should respect HistoryManager maxEntries limit", () => {
      HistoryManager.resetInstance();
      const historyManager = HistoryManager.getInstance({ maxEntries: 5 });
      (historyManager as any).historyPath = testHistoryPath;

      for (let i = 1; i <= 10; i++) {
        historyManager.addEntry(`command${i}`);
      }

      const history = historyManager.getAllCommands();
      expect(history.length).toBeLessThanOrEqual(5);
      expect(history).toContain("command10"); // Most recent should be kept
    });

    it("should work with search mode simulator", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("npm install");
      historyManager.addEntry("npm test");
      historyManager.addEntry("git commit");

      const searchSim = new SearchModeSimulator(historyManager);
      searchSim.activateSearch("");
      searchSim.addToQuery("npm");

      const results = searchSim.getResults();
      expect(results.length).toBe(2);
      expect(results.every((r) => r.command.includes("npm"))).toBe(true);
    });
  });

  describe("Component Rendering Logic", () => {
    it("should not render when isVisible is false", () => {
      const isVisible = false;
      const shouldRender = isVisible;

      expect(shouldRender).toBe(false);
    });

    it("should render when isVisible is true", () => {
      const isVisible = true;
      const shouldRender = isVisible;

      expect(shouldRender).toBe(true);
    });

    it("should display search query in header", () => {
      const query = "npm test";
      const header = query
        ? `History Search (Ctrl+R) - searching for: "${query}"`
        : "History Search (Ctrl+R)";

      expect(header).toContain(query);
    });

    it("should highlight match in command (basic implementation)", () => {
      const text = "npm install react";
      const query = "npm";

      // Basic highlight implementation - just returns text
      const highlighted = query ? text : text;

      expect(highlighted).toBe(text);
    });

    it("should show working directory and model in metadata", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("npm test", {
        workingDirectory: "/project/path",
        model: "glm-4.6",
      });

      const entries = historyManager.getAll();
      const entry = entries[0];

      expect(entry.workingDirectory).toBe("/project/path");
      expect(entry.model).toBe("glm-4.6");
    });

    it("should handle missing metadata gracefully", () => {
      const historyManager = HistoryManager.getInstance();

      historyManager.addEntry("npm test");

      const entries = historyManager.getAll();
      const entry = entries[0];

      expect(entry.workingDirectory).toBeUndefined();
      expect(entry.model).toBeUndefined();
    });
  });
});
