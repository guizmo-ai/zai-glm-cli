import { ToolResult } from "../types/index.js";
export interface BatchEditOperation {
    type: "search-replace" | "insert" | "delete" | "rename-symbol";
    files?: string[];
    pattern?: string;
    searchType?: "text" | "files";
    includePattern?: string;
    excludePattern?: string;
    params: BatchEditParams;
}
export interface BatchEditParams {
    search?: string;
    replace?: string;
    regex?: boolean;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    content?: string;
    position?: "start" | "end" | {
        line: number;
        character: number;
    };
    startLine?: number;
    endLine?: number;
    oldName?: string;
    newName?: string;
}
export interface BatchEditResult {
    file: string;
    success: boolean;
    changes?: number;
    error?: string;
    preview?: string;
}
export declare class BatchEditorTool {
    private textEditor;
    private search;
    private confirmationService;
    private maxConcurrency;
    constructor();
    batchEdit(operation: BatchEditOperation): Promise<ToolResult>;
    private resolveFiles;
    private parseSearchResults;
    private previewChanges;
    private requestConfirmation;
    private executeBatchOperation;
    private processFile;
    private applyOperation;
    private applySearchReplace;
    private applyInsert;
    private applyDelete;
    private applyRenameSymbol;
    private countChanges;
    private generatePreview;
    private chunkArray;
    private formatResults;
}
