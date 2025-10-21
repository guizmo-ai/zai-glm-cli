import * as fs from "fs-extra";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import * as path from "path";
import * as os from "os";

export interface BackupMetadata {
  originalPath: string;
  backupPath: string;
  timestamp: number;
  size: number;
  checksum: string;
}

export class BackupManager {
  private static instance: BackupManager;
  private backupDir: string;
  private maxBackups: number = 50; // Keep only the last 50 backups
  private backupIndex: Map<string, BackupMetadata[]> = new Map();

  private constructor() {
    this.backupDir = path.join(os.homedir(), ".zai", "backups");
    this.ensureBackupDir();
    this.loadBackupIndex();
  }

  static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  private ensureBackupDir(): void {
    try {
      fs.ensureDirSync(this.backupDir);
    } catch (error: any) {
      console.error(`Failed to create backup directory: ${error.message}`);
    }
  }

  private loadBackupIndex(): void {
    const indexPath = path.join(this.backupDir, "index.json");
    try {
      if (existsSync(indexPath)) {
        const data = readFileSync(indexPath, "utf-8");
        const index = JSON.parse(data);
        this.backupIndex = new Map(Object.entries(index));
      }
    } catch (error: any) {
      console.error(`Failed to load backup index: ${error.message}`);
    }
  }

  private saveBackupIndex(): void {
    const indexPath = path.join(this.backupDir, "index.json");
    try {
      const index = Object.fromEntries(this.backupIndex);
      writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf-8");
    } catch (error: any) {
      console.error(`Failed to save backup index: ${error.message}`);
    }
  }

  private computeChecksum(content: string): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  async createBackup(filePath: string): Promise<BackupMetadata | null> {
    try {
      const resolvedPath = path.resolve(filePath);

      // Check if file exists
      if (!existsSync(resolvedPath)) {
        return null;
      }

      // Read file content
      const content = await fs.readFile(resolvedPath, "utf-8");
      const stats = await fs.stat(resolvedPath);

      // Generate backup filename with timestamp
      const timestamp = Date.now();
      const basename = path.basename(filePath);
      const dirname = path.dirname(filePath).replace(/\//g, "_");
      const backupFilename = `${dirname}_${basename}_${timestamp}.bak`;
      const backupPath = path.join(this.backupDir, backupFilename);

      // Write backup
      await fs.writeFile(backupPath, content, "utf-8");

      // Create metadata
      const metadata: BackupMetadata = {
        originalPath: resolvedPath,
        backupPath,
        timestamp,
        size: stats.size,
        checksum: this.computeChecksum(content),
      };

      // Update index
      const key = resolvedPath;
      if (!this.backupIndex.has(key)) {
        this.backupIndex.set(key, []);
      }
      const backups = this.backupIndex.get(key)!;
      backups.push(metadata);

      // Prune old backups if necessary
      this.pruneOldBackups(key);

      // Save index
      this.saveBackupIndex();

      return metadata;
    } catch (error: any) {
      console.error(`Failed to create backup: ${error.message}`);
      return null;
    }
  }

  private pruneOldBackups(filePath: string): void {
    const backups = this.backupIndex.get(filePath);
    if (!backups || backups.length <= this.maxBackups) {
      return;
    }

    // Sort by timestamp (oldest first)
    backups.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest backups
    const toRemove = backups.splice(0, backups.length - this.maxBackups);
    for (const backup of toRemove) {
      try {
        if (existsSync(backup.backupPath)) {
          unlinkSync(backup.backupPath);
        }
      } catch (error: any) {
        console.error(`Failed to remove old backup: ${error.message}`);
      }
    }
  }

  async restoreBackup(filePath: string, backupTimestamp?: number): Promise<boolean> {
    try {
      const resolvedPath = path.resolve(filePath);
      const backups = this.backupIndex.get(resolvedPath);

      if (!backups || backups.length === 0) {
        console.error(`No backups found for ${filePath}`);
        return false;
      }

      // Get the backup to restore (latest by default)
      let backup: BackupMetadata;
      if (backupTimestamp) {
        const found = backups.find((b) => b.timestamp === backupTimestamp);
        if (!found) {
          console.error(`Backup not found for timestamp ${backupTimestamp}`);
          return false;
        }
        backup = found;
      } else {
        // Get the most recent backup
        backups.sort((a, b) => b.timestamp - a.timestamp);
        backup = backups[0];
      }

      // Read backup content
      const content = await fs.readFile(backup.backupPath, "utf-8");

      // Verify checksum
      const checksum = this.computeChecksum(content);
      if (checksum !== backup.checksum) {
        console.error(`Backup checksum mismatch for ${backup.backupPath}`);
        return false;
      }

      // Restore file
      await fs.writeFile(resolvedPath, content, "utf-8");

      return true;
    } catch (error: any) {
      console.error(`Failed to restore backup: ${error.message}`);
      return false;
    }
  }

  getBackupHistory(filePath: string): BackupMetadata[] {
    const resolvedPath = path.resolve(filePath);
    const backups = this.backupIndex.get(resolvedPath) || [];
    // Sort by timestamp (most recent first)
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }

  getLatestBackup(filePath: string): BackupMetadata | null {
    const history = this.getBackupHistory(filePath);
    return history.length > 0 ? history[0] : null;
  }

  async clearBackups(filePath?: string): Promise<void> {
    try {
      if (filePath) {
        const resolvedPath = path.resolve(filePath);
        const backups = this.backupIndex.get(resolvedPath) || [];
        for (const backup of backups) {
          if (existsSync(backup.backupPath)) {
            await fs.unlink(backup.backupPath);
          }
        }
        this.backupIndex.delete(resolvedPath);
      } else {
        // Clear all backups
        for (const [, backups] of this.backupIndex) {
          for (const backup of backups) {
            if (existsSync(backup.backupPath)) {
              await fs.unlink(backup.backupPath);
            }
          }
        }
        this.backupIndex.clear();
      }
      this.saveBackupIndex();
    } catch (error: any) {
      console.error(`Failed to clear backups: ${error.message}`);
    }
  }

  getBackupDir(): string {
    return this.backupDir;
  }

  getTotalBackupSize(): number {
    let total = 0;
    for (const [, backups] of this.backupIndex) {
      for (const backup of backups) {
        total += backup.size;
      }
    }
    return total;
  }

  getBackupCount(): number {
    let count = 0;
    for (const [, backups] of this.backupIndex) {
      count += backups.length;
    }
    return count;
  }
}
