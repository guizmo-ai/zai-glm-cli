import { ToolResult, AgentState } from '../types/index.js';
export declare class Agent {
    private textEditor;
    private bash;
    private state;
    constructor();
    processCommand(input: string): Promise<ToolResult>;
    private parseViewCommand;
    private parseStrReplaceCommand;
    private parseCreateCommand;
    private parseInsertCommand;
    private getHelp;
    getCurrentState(): AgentState;
}
