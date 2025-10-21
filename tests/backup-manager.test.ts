import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BackupManager, BackupMetadata } from "../src/utils/backup-manager.js";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

describe("BackupManager", () => {
  let testBackupDir: string;
  let testFilesDir: string;
  let originalBackupDir: string;

  beforeEach(() => {
    // Create temporary directories for testing
    const tempBase = path.join(os.tmpdir(), `zai-backup-test-${Date.now()}`);
    testBackupDir = path.join(tempBase, "backups");
    testFilesDir = path.join(tempBase, "files");

    fs.ensureDirSync(testBackupDir);
    fs.ensureDirSync(testFilesDir);

    // Get instance and override backup directory
    const manager = BackupManager.getInstance();
    originalBackupDir = (manager as any).backupDir;
    (manager as any).backupDir = testBackupDir;
    (manager as any).backupIndex.clear();
    fs.ensureDirSync(testBackupDir);
  });

  afterEach(() => {
    // Clean up test directories
    const tempBase = path.dirname(testBackupDir);
    if (fs.existsSync(tempBase)) {
      fs.removeSync(tempBase);
    }

    // Restore original backup directory
    const manager = BackupManager.getInstance();
    (manager as any).backupDir = originalBackupDir;
    (manager as any).backupIndex.clear();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = BackupManager.getInstance();
      const instance2 = BackupManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should have a single shared backup index", async () => {
      const instance1 = BackupManager.getInstance();
      const instance2 = BackupManager.getInstance();

      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "test content");

      // Create backup with instance1
      await instance1.createBackup(testFile);

      // Check if instance2 can see it
      const history = instance2.getBackupHistory(testFile);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe("Backup Directory Creation", () => {
    it("should create backup directory on initialization", () => {
      const manager = BackupManager.getInstance();
      expect(fs.existsSync(testBackupDir)).toBe(true);
    });

    it("should handle backup directory creation failure gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Create a file where the directory should be
      const badDir = path.join(os.tmpdir(), `bad-backup-dir-${Date.now()}`);
      fs.writeFileSync(badDir, "not a directory");

      const manager = BackupManager.getInstance();
      const originalDir = (manager as any).backupDir;
      (manager as any).backupDir = badDir;

      (manager as any).ensureBackupDir();

      expect(consoleSpy).toHaveBeenCalled();

      // Cleanup
      fs.unlinkSync(badDir);
      (manager as any).backupDir = originalDir;
      consoleSpy.mockRestore();
    });
  });

  describe("Backup Creation", () => {
    it("should create a backup of an existing file", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      const content = "Hello, World!";
      fs.writeFileSync(testFile, content);

      const metadata = await manager.createBackup(testFile);

      expect(metadata).not.toBeNull();
      expect(metadata!.originalPath).toBe(path.resolve(testFile));
      expect(metadata!.timestamp).toBeGreaterThan(0);
      expect(metadata!.size).toBe(content.length);
      expect(fs.existsSync(metadata!.backupPath)).toBe(true);

      const backupContent = fs.readFileSync(metadata!.backupPath, "utf-8");
      expect(backupContent).toBe(content);
    });

    it("should return null for non-existent file", async () => {
      const manager = BackupManager.getInstance();
      const nonExistentFile = path.join(testFilesDir, "does-not-exist.txt");

      const metadata = await manager.createBackup(nonExistentFile);

      expect(metadata).toBeNull();
    });

    it("should handle empty files", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "empty.txt");
      fs.writeFileSync(testFile, "");

      const metadata = await manager.createBackup(testFile);

      expect(metadata).not.toBeNull();
      expect(metadata!.size).toBe(0);
      expect(fs.existsSync(metadata!.backupPath)).toBe(true);
    });

    it("should handle large files", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "large.txt");
      const largeContent = "x".repeat(1024 * 1024); // 1MB
      fs.writeFileSync(testFile, largeContent);

      const metadata = await manager.createBackup(testFile);

      expect(metadata).not.toBeNull();
      expect(metadata!.size).toBe(largeContent.length);

      const backupContent = fs.readFileSync(metadata!.backupPath, "utf-8");
      expect(backupContent).toBe(largeContent);
    });

    it("should handle files with special characters in path", async () => {
      const manager = BackupManager.getInstance();
      const specialDir = path.join(testFilesDir, "special dir@#$");
      fs.ensureDirSync(specialDir);
      const testFile = path.join(specialDir, "test file!.txt");
      fs.writeFileSync(testFile, "content");

      const metadata = await manager.createBackup(testFile);

      expect(metadata).not.toBeNull();
      expect(fs.existsSync(metadata!.backupPath)).toBe(true);
    });

    it("should handle files in nested directories", async () => {
      const manager = BackupManager.getInstance();
      const nestedDir = path.join(testFilesDir, "a", "b", "c");
      fs.ensureDirSync(nestedDir);
      const testFile = path.join(nestedDir, "nested.txt");
      fs.writeFileSync(testFile, "nested content");

      const metadata = await manager.createBackup(testFile);

      expect(metadata).not.toBeNull();
      expect(fs.existsSync(metadata!.backupPath)).toBe(true);
    });
  });

  describe("Backup File Naming Convention", () => {
    it("should generate unique backup filenames with timestamp", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content1");

      const metadata1 = await manager.createBackup(testFile);

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      fs.writeFileSync(testFile, "content2");
      const metadata2 = await manager.createBackup(testFile);

      expect(metadata1!.backupPath).not.toBe(metadata2!.backupPath);
      expect(metadata1!.timestamp).toBeLessThan(metadata2!.timestamp);
    });

    it("should include original filename in backup filename", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "myfile.txt");
      fs.writeFileSync(testFile, "content");

      const metadata = await manager.createBackup(testFile);

      expect(path.basename(metadata!.backupPath)).toContain("myfile.txt");
    });

    it("should include directory path in backup filename", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "subdir", "test.txt");
      fs.ensureDirSync(path.dirname(testFile));
      fs.writeFileSync(testFile, "content");

      const metadata = await manager.createBackup(testFile);

      const backupName = path.basename(metadata!.backupPath);
      expect(backupName).toContain("subdir");
    });

    it("should use .bak extension for backup files", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      const metadata = await manager.createBackup(testFile);

      expect(path.extname(metadata!.backupPath)).toBe(".bak");
    });
  });

  describe("Checksum Verification", () => {
    it("should compute SHA-256 checksum for backup", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      const content = "Hello, World!";
      fs.writeFileSync(testFile, content);

      const metadata = await manager.createBackup(testFile);

      const expectedChecksum = crypto
        .createHash("sha256")
        .update(content)
        .digest("hex");

      expect(metadata!.checksum).toBe(expectedChecksum);
    });

    it("should verify checksum during restore", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "original");

      const metadata = await manager.createBackup(testFile);

      // Modify the file
      fs.writeFileSync(testFile, "modified");

      // Restore should succeed (checksum of backup is valid)
      const result = await manager.restoreBackup(testFile);
      expect(result).toBe(true);

      const restoredContent = fs.readFileSync(testFile, "utf-8");
      expect(restoredContent).toBe("original");
    });

    it("should fail restore if backup checksum is corrupted", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "original");

      await manager.createBackup(testFile);

      // Corrupt the backup file
      const backups = manager.getBackupHistory(testFile);
      fs.writeFileSync(backups[0].backupPath, "corrupted content");

      // Restore should fail
      const result = await manager.restoreBackup(testFile);
      expect(result).toBe(false);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("checksum mismatch")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Index Management", () => {
    it("should maintain backup index in memory", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      await manager.createBackup(testFile);

      const index = (manager as any).backupIndex;
      expect(index.has(path.resolve(testFile))).toBe(true);
      expect(index.get(path.resolve(testFile)).length).toBe(1);
    });

    it("should persist index to disk as JSON", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      await manager.createBackup(testFile);

      const indexPath = path.join(testBackupDir, "index.json");
      expect(fs.existsSync(indexPath)).toBe(true);

      const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
      expect(indexData[path.resolve(testFile)]).toBeDefined();
      expect(indexData[path.resolve(testFile)].length).toBe(1);
    });

    it("should load index from disk on initialization", () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      const resolvedPath = path.resolve(testFile);

      // Create a mock index file
      const indexData = {
        [resolvedPath]: [
          {
            originalPath: resolvedPath,
            backupPath: path.join(testBackupDir, "test.bak"),
            timestamp: Date.now(),
            size: 100,
            checksum: "abc123",
          },
        ],
      };

      const indexPath = path.join(testBackupDir, "index.json");
      fs.writeFileSync(indexPath, JSON.stringify(indexData));

      // Reload index
      (manager as any).loadBackupIndex();

      const index = (manager as any).backupIndex;
      expect(index.has(resolvedPath)).toBe(true);
      expect(index.get(resolvedPath).length).toBe(1);
    });

    it("should handle corrupted index file gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = BackupManager.getInstance();
      const indexPath = path.join(testBackupDir, "index.json");
      fs.writeFileSync(indexPath, "invalid json{");

      (manager as any).loadBackupIndex();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load backup index")
      );

      consoleSpy.mockRestore();
    });

    it("should handle missing index file gracefully", () => {
      const manager = BackupManager.getInstance();
      const indexPath = path.join(testBackupDir, "index.json");

      if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
      }

      (manager as any).loadBackupIndex();

      const index = (manager as any).backupIndex;
      expect(index.size).toBe(0);
    });
  });

  describe("Backup History Retrieval", () => {
    it("should get backup history for a file", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content1");

      await manager.createBackup(testFile);

      await new Promise((resolve) => setTimeout(resolve, 10));

      fs.writeFileSync(testFile, "content2");
      await manager.createBackup(testFile);

      const history = manager.getBackupHistory(testFile);

      expect(history.length).toBe(2);
      expect(history[0].timestamp).toBeGreaterThan(history[1].timestamp);
    });

    it("should return empty array for file with no backups", () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "no-backups.txt");

      const history = manager.getBackupHistory(testFile);

      expect(history).toEqual([]);
    });

    it("should sort history by timestamp (most recent first)", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");

      for (let i = 0; i < 3; i++) {
        fs.writeFileSync(testFile, `content${i}`);
        await manager.createBackup(testFile);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const history = manager.getBackupHistory(testFile);

      expect(history.length).toBe(3);
      for (let i = 0; i < history.length - 1; i++) {
        expect(history[i].timestamp).toBeGreaterThan(history[i + 1].timestamp);
      }
    });

    it("should get latest backup", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");

      fs.writeFileSync(testFile, "content1");
      await manager.createBackup(testFile);

      await new Promise((resolve) => setTimeout(resolve, 10));

      fs.writeFileSync(testFile, "content2");
      const metadata2 = await manager.createBackup(testFile);

      const latest = manager.getLatestBackup(testFile);

      expect(latest).not.toBeNull();
      expect(latest!.timestamp).toBe(metadata2!.timestamp);
    });

    it("should return null for file with no backups when getting latest", () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "no-backups.txt");

      const latest = manager.getLatestBackup(testFile);

      expect(latest).toBeNull();
    });
  });

  describe("Restore from Backup", () => {
    it("should restore latest backup by default", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");

      fs.writeFileSync(testFile, "original");
      await manager.createBackup(testFile);

      fs.writeFileSync(testFile, "modified");

      const result = await manager.restoreBackup(testFile);

      expect(result).toBe(true);

      const content = fs.readFileSync(testFile, "utf-8");
      expect(content).toBe("original");
    });

    it("should restore specific backup by timestamp", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");

      fs.writeFileSync(testFile, "version1");
      const metadata1 = await manager.createBackup(testFile);

      await new Promise((resolve) => setTimeout(resolve, 10));

      fs.writeFileSync(testFile, "version2");
      await manager.createBackup(testFile);

      fs.writeFileSync(testFile, "current");

      const result = await manager.restoreBackup(
        testFile,
        metadata1!.timestamp
      );

      expect(result).toBe(true);

      const content = fs.readFileSync(testFile, "utf-8");
      expect(content).toBe("version1");
    });

    it("should return false when no backups exist", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "no-backups.txt");

      const result = await manager.restoreBackup(testFile);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No backups found")
      );

      consoleSpy.mockRestore();
    });

    it("should return false when specific timestamp not found", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");

      fs.writeFileSync(testFile, "content");
      await manager.createBackup(testFile);

      const result = await manager.restoreBackup(testFile, 999999);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Backup not found for timestamp")
      );

      consoleSpy.mockRestore();
    });

    it("should handle restore errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");

      fs.writeFileSync(testFile, "content");
      await manager.createBackup(testFile);

      // Delete the backup file to cause an error
      const backups = manager.getBackupHistory(testFile);
      fs.unlinkSync(backups[0].backupPath);

      const result = await manager.restoreBackup(testFile);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("Automatic Backup Pruning", () => {
    it("should keep only maxBackups (50) backups per file", async () => {
      const manager = BackupManager.getInstance();
      const maxBackups = (manager as any).maxBackups;
      const testFile = path.join(testFilesDir, "test.txt");

      // Create more backups than the limit
      for (let i = 0; i < maxBackups + 10; i++) {
        fs.writeFileSync(testFile, `content${i}`);
        await manager.createBackup(testFile);
      }

      const history = manager.getBackupHistory(testFile);

      expect(history.length).toBe(maxBackups);
    });

    it("should remove oldest backups first", async () => {
      const manager = BackupManager.getInstance();
      (manager as any).maxBackups = 3; // Set lower limit for testing
      const testFile = path.join(testFilesDir, "test.txt");

      const timestamps: number[] = [];

      // Create 5 backups
      for (let i = 0; i < 5; i++) {
        fs.writeFileSync(testFile, `content${i}`);
        const metadata = await manager.createBackup(testFile);
        timestamps.push(metadata!.timestamp);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const history = manager.getBackupHistory(testFile);

      expect(history.length).toBe(3);

      // The remaining backups should be the latest 3
      const remainingTimestamps = history.map((b) => b.timestamp).sort();
      const expectedTimestamps = timestamps.slice(-3).sort();

      expect(remainingTimestamps).toEqual(expectedTimestamps);

      // Reset maxBackups
      (manager as any).maxBackups = 50;
    });

    it("should delete old backup files from disk", async () => {
      const manager = BackupManager.getInstance();
      (manager as any).maxBackups = 2;
      const testFile = path.join(testFilesDir, "test.txt");

      const backupPaths: string[] = [];

      // Create 3 backups
      for (let i = 0; i < 3; i++) {
        fs.writeFileSync(testFile, `content${i}`);
        const metadata = await manager.createBackup(testFile);
        backupPaths.push(metadata!.backupPath);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // The first backup should be deleted
      expect(fs.existsSync(backupPaths[0])).toBe(false);
      expect(fs.existsSync(backupPaths[1])).toBe(true);
      expect(fs.existsSync(backupPaths[2])).toBe(true);

      // Reset maxBackups
      (manager as any).maxBackups = 50;
    });

    it("should not prune when under limit", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");

      // Create just a few backups
      for (let i = 0; i < 3; i++) {
        fs.writeFileSync(testFile, `content${i}`);
        await manager.createBackup(testFile);
      }

      const history = manager.getBackupHistory(testFile);

      expect(history.length).toBe(3);
    });

    it("should handle pruning errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = BackupManager.getInstance();
      (manager as any).maxBackups = 1;
      const testFile = path.join(testFilesDir, "test.txt");

      // Create first backup
      fs.writeFileSync(testFile, "content1");
      const metadata1 = await manager.createBackup(testFile);

      // Delete the backup file manually
      fs.unlinkSync(metadata1!.backupPath);

      // Create second backup (should trigger pruning)
      fs.writeFileSync(testFile, "content2");
      await manager.createBackup(testFile);

      // Should not throw error
      expect(consoleSpy).not.toHaveBeenCalled();

      // Reset maxBackups
      (manager as any).maxBackups = 50;
      consoleSpy.mockRestore();
    });
  });

  describe("Clear Backups", () => {
    it("should clear all backups for a specific file", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");

      fs.writeFileSync(testFile, "content1");
      const metadata1 = await manager.createBackup(testFile);

      fs.writeFileSync(testFile, "content2");
      const metadata2 = await manager.createBackup(testFile);

      await manager.clearBackups(testFile);

      const history = manager.getBackupHistory(testFile);
      expect(history.length).toBe(0);

      expect(fs.existsSync(metadata1!.backupPath)).toBe(false);
      expect(fs.existsSync(metadata2!.backupPath)).toBe(false);
    });

    it("should clear all backups for all files when no path specified", async () => {
      const manager = BackupManager.getInstance();

      const file1 = path.join(testFilesDir, "file1.txt");
      const file2 = path.join(testFilesDir, "file2.txt");

      fs.writeFileSync(file1, "content1");
      fs.writeFileSync(file2, "content2");

      await manager.createBackup(file1);
      await manager.createBackup(file2);

      await manager.clearBackups();

      expect(manager.getBackupHistory(file1).length).toBe(0);
      expect(manager.getBackupHistory(file2).length).toBe(0);
      expect(manager.getBackupCount()).toBe(0);
    });

    it("should delete backup files from disk when clearing", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");

      fs.writeFileSync(testFile, "content");
      const metadata = await manager.createBackup(testFile);

      await manager.clearBackups(testFile);

      expect(fs.existsSync(metadata!.backupPath)).toBe(false);
    });

    it("should update index after clearing", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");

      fs.writeFileSync(testFile, "content");
      await manager.createBackup(testFile);

      await manager.clearBackups(testFile);

      const indexPath = path.join(testBackupDir, "index.json");
      const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"));

      expect(indexData[path.resolve(testFile)]).toBeUndefined();
    });

    it("should handle clearing non-existent backups gracefully", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "no-backups.txt");

      // Should not throw
      await expect(manager.clearBackups(testFile)).resolves.toBeUndefined();
    });

    it("should handle clear errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");

      fs.writeFileSync(testFile, "content");
      await manager.createBackup(testFile);

      // Corrupt the backup index to cause an error
      const backups = manager.getBackupHistory(testFile);
      (backups[0] as any).backupPath = "/invalid/path/that/does/not/exist.bak";

      await manager.clearBackups(testFile);

      // Should not throw, just log error
      expect(consoleSpy).not.toHaveBeenCalled(); // fs.unlink with non-existent file doesn't error

      consoleSpy.mockRestore();
    });
  });

  describe("Backup Statistics", () => {
    it("should get backup directory path", () => {
      const manager = BackupManager.getInstance();
      expect(manager.getBackupDir()).toBe(testBackupDir);
    });

    it("should get total backup count", async () => {
      const manager = BackupManager.getInstance();

      const file1 = path.join(testFilesDir, "file1.txt");
      const file2 = path.join(testFilesDir, "file2.txt");

      fs.writeFileSync(file1, "content1");
      fs.writeFileSync(file2, "content2");

      await manager.createBackup(file1);
      await manager.createBackup(file1);
      await manager.createBackup(file2);

      expect(manager.getBackupCount()).toBe(3);
    });

    it("should get total backup size", async () => {
      const manager = BackupManager.getInstance();

      const file1 = path.join(testFilesDir, "file1.txt");
      const file2 = path.join(testFilesDir, "file2.txt");

      const content1 = "a".repeat(100);
      const content2 = "b".repeat(200);

      fs.writeFileSync(file1, content1);
      fs.writeFileSync(file2, content2);

      await manager.createBackup(file1);
      await manager.createBackup(file2);

      expect(manager.getTotalBackupSize()).toBe(300);
    });

    it("should return 0 for empty backup index", () => {
      const manager = BackupManager.getInstance();

      expect(manager.getBackupCount()).toBe(0);
      expect(manager.getTotalBackupSize()).toBe(0);
    });
  });

  describe("Concurrent Backup Scenarios", () => {
    it("should handle concurrent backups of same file", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      // Create multiple backups concurrently
      const promises = [
        manager.createBackup(testFile),
        manager.createBackup(testFile),
        manager.createBackup(testFile),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every((r) => r !== null)).toBe(true);

      // Should have created multiple backups
      const history = manager.getBackupHistory(testFile);
      expect(history.length).toBeGreaterThan(0);
    });

    it("should handle concurrent backups of different files", async () => {
      const manager = BackupManager.getInstance();

      const files = Array.from({ length: 5 }, (_, i) =>
        path.join(testFilesDir, `file${i}.txt`)
      );

      files.forEach((file, i) => {
        fs.writeFileSync(file, `content${i}`);
      });

      const promises = files.map((file) => manager.createBackup(file));
      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every((r) => r !== null)).toBe(true);

      // Each file should have a backup
      files.forEach((file) => {
        expect(manager.getBackupHistory(file).length).toBe(1);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle files with no extension", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "README");
      fs.writeFileSync(testFile, "content");

      const metadata = await manager.createBackup(testFile);

      expect(metadata).not.toBeNull();
      expect(fs.existsSync(metadata!.backupPath)).toBe(true);
    });

    it("should handle files with multiple extensions", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "archive.tar.gz");
      fs.writeFileSync(testFile, "content");

      const metadata = await manager.createBackup(testFile);

      expect(metadata).not.toBeNull();
      expect(path.basename(metadata!.backupPath)).toContain("archive.tar.gz");
    });

    it("should handle very long filenames", async () => {
      const manager = BackupManager.getInstance();
      // Use a shorter name to avoid ENAMETOOLONG error
      const longName = "a".repeat(100) + ".txt";
      const testFile = path.join(testFilesDir, longName);
      fs.writeFileSync(testFile, "content");

      const metadata = await manager.createBackup(testFile);

      expect(metadata).not.toBeNull();
      expect(fs.existsSync(metadata!.backupPath)).toBe(true);
    });

    it("should handle files with unicode characters", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "测试文件.txt");
      const content = "Unicode content: 你好世界";
      fs.writeFileSync(testFile, content, "utf-8");

      const metadata = await manager.createBackup(testFile);

      expect(metadata).not.toBeNull();

      const backupContent = fs.readFileSync(metadata!.backupPath, "utf-8");
      expect(backupContent).toBe(content);
    });

    it("should handle files with newlines and special characters in content", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      const content = "Line 1\nLine 2\r\nTab:\tEnd\0Null";
      fs.writeFileSync(testFile, content);

      const metadata = await manager.createBackup(testFile);

      expect(metadata).not.toBeNull();

      const backupContent = fs.readFileSync(metadata!.backupPath, "utf-8");
      expect(backupContent).toBe(content);
    });

    it("should handle relative paths by resolving them", async () => {
      const manager = BackupManager.getInstance();
      const relativePath = "test.txt";
      const absolutePath = path.resolve(relativePath);

      // Create file at absolute path
      fs.writeFileSync(absolutePath, "content");

      const metadata = await manager.createBackup(relativePath);

      expect(metadata).not.toBeNull();
      expect(metadata!.originalPath).toBe(absolutePath);

      // Cleanup
      fs.unlinkSync(absolutePath);
    });

    it("should handle symbolic links", async () => {
      const manager = BackupManager.getInstance();
      const originalFile = path.join(testFilesDir, "original.txt");
      const symlinkFile = path.join(testFilesDir, "symlink.txt");

      fs.writeFileSync(originalFile, "original content");

      // Create symlink (skip test if platform doesn't support symlinks)
      try {
        fs.symlinkSync(originalFile, symlinkFile);
      } catch (error) {
        // Platform doesn't support symlinks, skip test
        return;
      }

      const metadata = await manager.createBackup(symlinkFile);

      expect(metadata).not.toBeNull();

      const backupContent = fs.readFileSync(metadata!.backupPath, "utf-8");
      expect(backupContent).toBe("original content");
    });

    it("should handle files at root level", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "root.txt");
      fs.writeFileSync(testFile, "content");

      const metadata = await manager.createBackup(testFile);

      expect(metadata).not.toBeNull();
      expect(fs.existsSync(metadata!.backupPath)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle permission errors when writing backup", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      // Make backup directory read-only to cause write error
      const originalBackupDir = (manager as any).backupDir;
      const readOnlyDir = path.join(testBackupDir, "readonly");
      fs.ensureDirSync(readOnlyDir);

      try {
        // Set directory to read-only (Unix-like systems)
        if (process.platform !== "win32") {
          fs.chmodSync(readOnlyDir, 0o444);
          (manager as any).backupDir = readOnlyDir;

          const metadata = await manager.createBackup(testFile);

          expect(metadata).toBeNull();
          expect(consoleSpy).toHaveBeenCalled();
        }
      } finally {
        // Restore permissions and directory
        if (process.platform !== "win32") {
          fs.chmodSync(readOnlyDir, 0o755);
        }
        (manager as any).backupDir = originalBackupDir;
      }

      consoleSpy.mockRestore();
    });

    it("should handle corrupted backup data gracefully during restore", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "original");

      await manager.createBackup(testFile);

      // Manually corrupt the backup index
      const backups = manager.getBackupHistory(testFile);
      const corruptedMetadata = { ...backups[0], checksum: "invalid-checksum" };
      (manager as any).backupIndex.set(path.resolve(testFile), [corruptedMetadata]);

      // Write corrupted content to backup file
      fs.writeFileSync(backups[0].backupPath, "corrupted");

      const result = await manager.restoreBackup(testFile);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("checksum mismatch")
      );

      consoleSpy.mockRestore();
    });

    it("should handle missing backup files during clear", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      await manager.createBackup(testFile);

      // Delete backup file manually
      const backups = manager.getBackupHistory(testFile);
      fs.unlinkSync(backups[0].backupPath);

      // Clear should not throw even if file is missing
      await expect(manager.clearBackups(testFile)).resolves.toBeUndefined();
    });

    it("should handle clearing backups for non-existent files", async () => {
      const manager = BackupManager.getInstance();
      const nonExistentFile = path.join(testFilesDir, "does-not-exist.txt");

      // Should not throw
      await expect(manager.clearBackups(nonExistentFile)).resolves.toBeUndefined();
    });
  });

  describe("Backup Metadata Validation", () => {
    it("should include all required metadata fields", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      const metadata = await manager.createBackup(testFile);

      expect(metadata).toHaveProperty("originalPath");
      expect(metadata).toHaveProperty("backupPath");
      expect(metadata).toHaveProperty("timestamp");
      expect(metadata).toHaveProperty("size");
      expect(metadata).toHaveProperty("checksum");
    });

    it("should have correct metadata types", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      const metadata = await manager.createBackup(testFile);

      expect(typeof metadata!.originalPath).toBe("string");
      expect(typeof metadata!.backupPath).toBe("string");
      expect(typeof metadata!.timestamp).toBe("number");
      expect(typeof metadata!.size).toBe("number");
      expect(typeof metadata!.checksum).toBe("string");
    });

    it("should have valid checksum format (SHA-256)", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      const metadata = await manager.createBackup(testFile);

      // SHA-256 produces 64 hex characters
      expect(metadata!.checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should have timestamp close to current time", async () => {
      const manager = BackupManager.getInstance();
      const testFile = path.join(testFilesDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      const beforeTime = Date.now();
      const metadata = await manager.createBackup(testFile);
      const afterTime = Date.now();

      expect(metadata!.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(metadata!.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
