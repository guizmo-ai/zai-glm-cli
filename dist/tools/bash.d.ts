import { ToolResult } from '../types/index.js';
export declare class BashTool {
    private currentDirectory;
    private confirmationService;
    private readonly READ_ONLY_COMMANDS;
    private isDestructiveCommand;
    execute(command: string, timeout?: number): Promise<ToolResult>;
    getCurrentDirectory(): string;
    listFiles(directory?: string): Promise<ToolResult>;
    findFiles(pattern: string, directory?: string): Promise<ToolResult>;
    grep(pattern: string, files?: string): Promise<ToolResult>;
}
