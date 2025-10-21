import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { HistoryManager, HistoryEntry } from "../src/utils/history-manager.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("HistoryManager", () => {
  let testHistoryPath: string;
  let originalHistoryPath: string;

  beforeEach(() => {
    // Reset singleton instance before each test
    HistoryManager.resetInstance();

    // Create a temporary directory for test history
    const tempDir = path.join(os.tmpdir(), `zai-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    testHistoryPath = path.join(tempDir, "history.json");

    // Temporarily override the home directory for testing
    const manager = HistoryManager.getInstance();
    originalHistoryPath = (manager as any).historyPath;
    (manager as any).historyPath = testHistoryPath;

    // Clear any history that was loaded from default location
    (manager as any).history = [];
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testHistoryPath)) {
      fs.unlinkSync(testHistoryPath);
      const dir = path.dirname(testHistoryPath);
      if (fs.existsSync(dir)) {
        fs.rmdirSync(dir);
      }
    }

    // Reset singleton instance
    HistoryManager.resetInstance();
  });

  describe("Basic Operations", () => {
    it("should initialize with empty history", () => {
      const manager = HistoryManager.getInstance();
      expect(manager.getCount()).toBe(0);
      expect(manager.getAllCommands()).toEqual([]);
    });

    it("should add entries to history", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("command1");
      manager.addEntry("command2");

      expect(manager.getCount()).toBe(2);
      expect(manager.getAllCommands()).toEqual(["command1", "command2"]);
    });

    it("should deduplicate consecutive identical commands by default", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("command1");
      manager.addEntry("command1");
      manager.addEntry("command2");
      manager.addEntry("command2");

      expect(manager.getCount()).toBe(2);
      expect(manager.getAllCommands()).toEqual(["command1", "command2"]);
    });

    it("should not deduplicate non-consecutive commands", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("command1");
      manager.addEntry("command2");
      manager.addEntry("command1");

      expect(manager.getCount()).toBe(3);
      expect(manager.getAllCommands()).toEqual([
        "command1",
        "command2",
        "command1",
      ]);
    });

    it("should trim leading/trailing whitespace", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("  command1  ");

      expect(manager.getAllCommands()).toEqual(["command1"]);
    });

    it("should ignore empty commands", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("");
      manager.addEntry("   ");
      manager.addEntry("command1");

      expect(manager.getCount()).toBe(1);
      expect(manager.getAllCommands()).toEqual(["command1"]);
    });
  });

  describe("Metadata", () => {
    it("should store command with metadata", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("command1", {
        workingDirectory: "/home/user/project",
        model: "glm-4.6",
      });

      const entries = manager.getAll();
      expect(entries).toHaveLength(1);
      expect(entries[0].command).toBe("command1");
      expect(entries[0].workingDirectory).toBe("/home/user/project");
      expect(entries[0].model).toBe("glm-4.6");
      expect(entries[0].timestamp).toBeGreaterThan(0);
    });
  });

  describe("Search", () => {
    beforeEach(() => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("npm install", {
        workingDirectory: "/project1",
        model: "glm-4.6",
      });
      manager.addEntry("npm test", {
        workingDirectory: "/project1",
        model: "glm-4.5",
      });
      manager.addEntry("git commit -m 'fix'", {
        workingDirectory: "/project2",
        model: "glm-4.6",
      });
      manager.addEntry("git push", {
        workingDirectory: "/project2",
        model: "glm-4.6",
      });
    });

    it("should search by substring", () => {
      const manager = HistoryManager.getInstance();
      const results = manager.search({ query: "npm" });

      expect(results).toHaveLength(2);
      expect(results[0].command).toBe("npm install");
      expect(results[1].command).toBe("npm test");
    });

    it("should search by fuzzy match", () => {
      const manager = HistoryManager.getInstance();
      const results = manager.search({ query: "npmts", fuzzy: true });

      // "npmts" should only match "npm test" and not "npm install"
      expect(results).toHaveLength(1);
      expect(results[0].command).toBe("npm test");
    });

    it("should filter by working directory", () => {
      const manager = HistoryManager.getInstance();
      const results = manager.search({ workingDirectory: "/project2" });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.workingDirectory === "/project2")).toBe(
        true
      );
    });

    it("should limit results", () => {
      const manager = HistoryManager.getInstance();
      const results = manager.search({ limit: 2 });

      expect(results).toHaveLength(2);
    });

    it("should return all results when no query", () => {
      const manager = HistoryManager.getInstance();
      const results = manager.search({});

      expect(results).toHaveLength(4);
    });
  });

  describe("Persistence", () => {
    it("should persist history to disk", async () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("command1");

      // Wait for debounced save
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(fs.existsSync(testHistoryPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(testHistoryPath, "utf-8"));
      expect(content).toHaveLength(1);
      expect(content[0].command).toBe("command1");
    });

    it("should load history from disk", async () => {
      // Create history file
      const historyData: HistoryEntry[] = [
        {
          command: "command1",
          timestamp: Date.now(),
          workingDirectory: "/test",
          model: "glm-4.6",
        },
        {
          command: "command2",
          timestamp: Date.now(),
        },
      ];

      fs.mkdirSync(path.dirname(testHistoryPath), { recursive: true });
      fs.writeFileSync(testHistoryPath, JSON.stringify(historyData));

      // Reset and create new instance to load from disk
      HistoryManager.resetInstance();
      const manager = HistoryManager.getInstance();
      (manager as any).historyPath = testHistoryPath;
      (manager as any).loadHistory();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(manager.getCount()).toBe(2);
      expect(manager.getAllCommands()).toEqual(["command1", "command2"]);

      const entries = manager.getAll();
      expect(entries[0].workingDirectory).toBe("/test");
      expect(entries[0].model).toBe("glm-4.6");
    });
  });

  describe("Configuration", () => {
    it("should respect maxEntries limit", () => {
      const manager = HistoryManager.getInstance({ maxEntries: 3 });

      manager.addEntry("command1");
      manager.addEntry("command2");
      manager.addEntry("command3");
      manager.addEntry("command4");

      expect(manager.getCount()).toBe(3);
      expect(manager.getAllCommands()).toEqual([
        "command2",
        "command3",
        "command4",
      ]);
    });

    it("should disable deduplication when configured", () => {
      const manager = HistoryManager.getInstance({
        deduplicateConsecutive: false,
      });

      manager.addEntry("command1");
      manager.addEntry("command1");

      expect(manager.getCount()).toBe(2);
    });

    it("should not save when disabled", async () => {
      const manager = HistoryManager.getInstance({ enabled: false });
      manager.addEntry("command1");

      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(fs.existsSync(testHistoryPath)).toBe(false);
      expect(manager.getCount()).toBe(0);
    });

    it("should clear history when disabled via updateConfig", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("command1");

      expect(manager.getCount()).toBe(1);

      manager.updateConfig({ enabled: false });

      expect(manager.getCount()).toBe(0);
    });
  });

  describe("Clear and Reset", () => {
    it("should clear all history", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("command1");
      manager.addEntry("command2");

      manager.clear();

      expect(manager.getCount()).toBe(0);
      expect(manager.getAllCommands()).toEqual([]);
    });
  });

  describe("Recent Entries", () => {
    it("should get recent entries", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("command1");
      manager.addEntry("command2");
      manager.addEntry("command3");

      const recent = manager.getRecentCommands(2);

      expect(recent).toEqual(["command2", "command3"]);
    });

    it("should return all if count exceeds history size", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("command1");

      const recent = manager.getRecentCommands(10);

      expect(recent).toEqual(["command1"]);
    });
  });

  describe("Import/Export", () => {
    it("should export history to file", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("command1", { model: "glm-4.6" });
      manager.addEntry("command2");

      const exportPath = path.join(
        path.dirname(testHistoryPath),
        "export.json"
      );
      manager.exportToFile(exportPath);

      expect(fs.existsSync(exportPath)).toBe(true);

      const exported = JSON.parse(fs.readFileSync(exportPath, "utf-8"));
      expect(exported.totalEntries).toBe(2);
      expect(exported.entries).toHaveLength(2);
      expect(exported.exportDate).toBeDefined();

      // Clean up
      fs.unlinkSync(exportPath);
    });

    it("should import history from file (append)", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("existing");

      const importData = {
        exportDate: new Date().toISOString(),
        totalEntries: 2,
        entries: [
          { command: "imported1", timestamp: Date.now() },
          { command: "imported2", timestamp: Date.now() },
        ],
      };

      const importPath = path.join(
        path.dirname(testHistoryPath),
        "import.json"
      );
      fs.writeFileSync(importPath, JSON.stringify(importData));

      manager.importFromFile(importPath, true);

      expect(manager.getCount()).toBe(3);
      expect(manager.getAllCommands()).toEqual([
        "existing",
        "imported1",
        "imported2",
      ]);

      // Clean up
      fs.unlinkSync(importPath);
    });

    it("should import history from file (replace)", () => {
      const manager = HistoryManager.getInstance();
      manager.addEntry("existing");

      const importData = [
        { command: "imported1", timestamp: Date.now() },
        { command: "imported2", timestamp: Date.now() },
      ];

      const importPath = path.join(
        path.dirname(testHistoryPath),
        "import.json"
      );
      fs.writeFileSync(importPath, JSON.stringify(importData));

      manager.importFromFile(importPath, false);

      expect(manager.getCount()).toBe(2);
      expect(manager.getAllCommands()).toEqual(["imported1", "imported2"]);

      // Clean up
      fs.unlinkSync(importPath);
    });
  });

  describe("Edge Cases", () => {
    it("should handle corrupted history file gracefully", () => {
      fs.mkdirSync(path.dirname(testHistoryPath), { recursive: true });
      fs.writeFileSync(testHistoryPath, "invalid json{");

      HistoryManager.resetInstance();
      const manager = HistoryManager.getInstance();
      (manager as any).historyPath = testHistoryPath;
      (manager as any).loadHistory();

      expect(manager.getCount()).toBe(0);
    });

    it("should handle invalid entries in history file", () => {
      const invalidData = [
        { command: "valid", timestamp: Date.now() },
        { invalid: "entry" }, // Missing required fields
        { command: "also valid", timestamp: Date.now() },
      ];

      fs.mkdirSync(path.dirname(testHistoryPath), { recursive: true });
      fs.writeFileSync(testHistoryPath, JSON.stringify(invalidData));

      HistoryManager.resetInstance();
      const manager = HistoryManager.getInstance();
      (manager as any).historyPath = testHistoryPath;
      (manager as any).loadHistory();

      expect(manager.getCount()).toBe(2);
      expect(manager.getAllCommands()).toEqual(["valid", "also valid"]);
    });
  });
});
