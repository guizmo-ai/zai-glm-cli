import { ToolResult, EditorCommand } from "../types/index.js";
export declare class TextEditorTool {
    private editHistory;
    private confirmationService;
    private backupManager;
    view(filePath: string, viewRange?: [number, number]): Promise<ToolResult>;
    strReplace(filePath: string, oldStr: string, newStr: string, replaceAll?: boolean): Promise<ToolResult>;
    create(filePath: string, content: string): Promise<ToolResult>;
    replaceLines(filePath: string, startLine: number, endLine: number, newContent: string): Promise<ToolResult>;
    insert(filePath: string, insertLine: number, content: string): Promise<ToolResult>;
    undoEdit(): Promise<ToolResult>;
    private findFuzzyMatch;
    private normalizeForComparison;
    private isSimilarStructure;
    private generateDiff;
    getEditHistory(): EditorCommand[];
    private createBackupAndWrite;
    restoreFromBackup(filePath: string): Promise<ToolResult>;
    getBackupHistory(filePath: string): ToolResult;
}
