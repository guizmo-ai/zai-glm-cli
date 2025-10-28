/**
 * Task Tool - Allows GLM to spawn specialized agents
 * This tool enables GLM to delegate complex tasks to specialized agents
 * without polluting the main context
 */
import { ToolResult } from '../types/index.js';
import { AgentType } from '../agents/agent-types.js';
import { ZaiAgent } from '../agent/zai-agent.js';
export interface TaskToolParams {
    agent_type: AgentType;
    task_description: string;
    thoroughness?: 'quick' | 'medium' | 'thorough';
}
export declare class TaskTool {
    private parentAgent;
    /**
     * Set the parent agent (used for spawning sub-agents)
     */
    setParentAgent(agent: ZaiAgent): void;
    /**
     * Execute a task with a specialized agent
     */
    execute(params: TaskToolParams): Promise<ToolResult>;
    /**
     * Build system prompt based on thoroughness level
     */
    private buildSystemPrompt;
    /**
     * Get max rounds based on thoroughness
     */
    private getThoroughnessRounds;
    /**
     * Summarize agent result for main context
     * This prevents context pollution by only returning key findings
     */
    private summarizeResult;
    /**
     * Get tool definition for GLM
     */
    static getToolDefinition(): {
        type: "function";
        function: {
            name: string;
            description: string;
            parameters: {
                type: "object";
                properties: {
                    agent_type: {
                        type: string;
                        enum: string[];
                        description: string;
                    };
                    task_description: {
                        type: string;
                        description: string;
                    };
                    thoroughness: {
                        type: string;
                        enum: string[];
                        description: string;
                        default: string;
                    };
                };
                required: string[];
            };
        };
    };
}
export declare function getTaskTool(): TaskTool;
