export interface DiffHunk {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: DiffLine[];
}
export interface DiffLine {
    type: "add" | "del" | "context";
    content: string;
    oldLineNumber?: number;
    newLineNumber?: number;
}
export interface DiffResult {
    hunks: DiffHunk[];
    additions: number;
    deletions: number;
    summary: string;
}
export declare class DiffGenerator {
    private static readonly CONTEXT_LINES;
    /**
     * Generate a structured diff between old and new content
     */
    static generateDiff(oldContent: string, newContent: string, filename?: string): DiffResult;
    /**
     * Generate a unified diff string (traditional format)
     */
    static generateUnifiedDiff(oldContent: string, newContent: string, filename?: string): string;
    /**
     * Generate a summary string for the diff
     */
    private static generateSummary;
    /**
     * Convert DiffResult to traditional unified diff format
     */
    static toUnifiedFormat(diff: DiffResult, filename: string): string;
    /**
     * Check if two contents are identical
     */
    static areIdentical(oldContent: string, newContent: string): boolean;
    /**
     * Count the number of changed lines (additions + deletions)
     */
    static countChangedLines(diff: DiffResult): number;
    /**
     * Get a preview of changes (first N lines of diff)
     */
    static getPreview(diff: DiffResult, maxLines?: number): string;
    /**
     * Generate line-by-line changes (without context)
     */
    static getChangedLines(diff: DiffResult): DiffLine[];
    /**
     * Check if the diff contains only additions (no deletions)
     */
    static isAddOnly(diff: DiffResult): boolean;
    /**
     * Check if the diff contains only deletions (no additions)
     */
    static isDeleteOnly(diff: DiffResult): boolean;
    /**
     * Generate a colored diff string for terminal display
     */
    static generateColoredDiff(diff: DiffResult, filename: string): string;
}
