/**
 * Agent System Types
 * Defines specialized agents for different tasks
 */
export type AgentType = 'general-purpose' | 'code-reviewer' | 'test-writer' | 'documentation' | 'refactoring' | 'debugging' | 'security-audit' | 'performance-optimizer' | 'explore' | 'plan';
export interface AgentCapability {
    name: string;
    description: string;
    tools: string[];
    model?: string;
    systemPrompt: string;
    maxRounds?: number;
}
export interface AgentTask {
    id: string;
    type: AgentType;
    description: string;
    prompt: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: AgentResult;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    parentTaskId?: string;
}
export interface AgentResult {
    success: boolean;
    output: string;
    metadata?: {
        tokensUsed?: number;
        toolsUsed?: string[];
        duration?: number;
        filesModified?: string[];
        [key: string]: any;
    };
}
export interface AgentConfig {
    type: AgentType;
    model?: string;
    maxRounds?: number;
    tools?: string[];
    customSystemPrompt?: string;
}
export declare const AGENT_CAPABILITIES: Record<AgentType, AgentCapability>;
