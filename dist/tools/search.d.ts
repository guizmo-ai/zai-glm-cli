import { ToolResult } from "../types/index.js";
export interface SearchResult {
    file: string;
    line: number;
    column: number;
    text: string;
    match: string;
}
export interface FileSearchResult {
    path: string;
    name: string;
    score: number;
}
export interface UnifiedSearchResult {
    type: "text" | "file";
    file: string;
    line?: number;
    column?: number;
    text?: string;
    match?: string;
    score?: number;
}
export declare class SearchTool {
    private confirmationService;
    private currentDirectory;
    /**
     * Unified search method that can search for text content or find files
     */
    search(query: string, options?: {
        searchType?: "text" | "files" | "both";
        includePattern?: string;
        excludePattern?: string;
        caseSensitive?: boolean;
        wholeWord?: boolean;
        regex?: boolean;
        maxResults?: number;
        fileTypes?: string[];
        excludeFiles?: string[];
        includeHidden?: boolean;
    }): Promise<ToolResult>;
    /**
     * Execute ripgrep command with specified options
     */
    private executeRipgrep;
    /**
     * Parse ripgrep JSON output into SearchResult objects
     */
    private parseRipgrepOutput;
    /**
     * Find files by pattern using a simple file walking approach
     */
    private findFilesByPattern;
    /**
     * Calculate fuzzy match score for file names
     */
    private calculateFileScore;
    /**
     * Format unified search results for display
     */
    private formatUnifiedResults;
    /**
     * Update current working directory
     */
    setCurrentDirectory(directory: string): void;
    /**
     * Get current working directory
     */
    getCurrentDirectory(): string;
}
