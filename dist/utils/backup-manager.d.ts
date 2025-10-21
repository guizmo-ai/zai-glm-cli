export interface BackupMetadata {
    originalPath: string;
    backupPath: string;
    timestamp: number;
    size: number;
    checksum: string;
}
export declare class BackupManager {
    private static instance;
    private backupDir;
    private maxBackups;
    private backupIndex;
    private constructor();
    static getInstance(): BackupManager;
    private ensureBackupDir;
    private loadBackupIndex;
    private saveBackupIndex;
    private computeChecksum;
    createBackup(filePath: string): Promise<BackupMetadata | null>;
    private pruneOldBackups;
    restoreBackup(filePath: string, backupTimestamp?: number): Promise<boolean>;
    getBackupHistory(filePath: string): BackupMetadata[];
    getLatestBackup(filePath: string): BackupMetadata | null;
    clearBackups(filePath?: string): Promise<void>;
    getBackupDir(): string;
    getTotalBackupSize(): number;
    getBackupCount(): number;
}
