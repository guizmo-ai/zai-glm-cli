/**
 * Task Orchestrator
 * Manages agent tasks, execution, and results
 */
import { EventEmitter } from 'events';
import { ZaiAgent } from '../agent/zai-agent.js';
import { AgentType, AgentTask, AgentResult, AgentConfig } from './agent-types.js';
export declare class TaskOrchestrator extends EventEmitter {
    private static instance;
    private tasks;
    private runningTasks;
    private maxParallelTasks;
    private constructor();
    static getInstance(): TaskOrchestrator;
    /**
     * Create a new agent task
     */
    createTask(type: AgentType, description: string, prompt: string, config?: Partial<AgentConfig>): AgentTask;
    /**
     * Execute a task with a specialized agent
     */
    executeTask(taskId: string, agent: ZaiAgent, config?: Partial<AgentConfig>): Promise<AgentResult>;
    /**
     * Execute multiple tasks in parallel
     */
    executeParallel(taskIds: string[], agent: ZaiAgent, config?: Partial<AgentConfig>): Promise<Map<string, AgentResult>>;
    /**
     * Execute tasks sequentially
     */
    executeSequential(taskIds: string[], agent: ZaiAgent, config?: Partial<AgentConfig>): Promise<Map<string, AgentResult>>;
    /**
     * Build enhanced prompt with agent capabilities
     */
    private buildAgentPrompt;
    /**
     * Get task by ID
     */
    getTask(taskId: string): AgentTask | undefined;
    /**
     * Get all tasks
     */
    getAllTasks(): AgentTask[];
    /**
     * Get tasks by status
     */
    getTasksByStatus(status: AgentTask['status']): AgentTask[];
    /**
     * Get tasks by type
     */
    getTasksByType(type: AgentType): AgentTask[];
    /**
     * Cancel a pending task
     */
    cancelTask(taskId: string): boolean;
    /**
     * Clear completed tasks
     */
    clearCompleted(): number;
    /**
     * Get task statistics
     */
    getStatistics(): {
        total: number;
        pending: number;
        running: number;
        completed: number;
        failed: number;
        byType: Record<AgentType, number>;
    };
    /**
     * Set max parallel tasks
     */
    setMaxParallelTasks(max: number): void;
}
export declare function getTaskOrchestrator(): TaskOrchestrator;
