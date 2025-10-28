/**
 * Task Orchestrator
 * Manages agent tasks, execution, and results
 */

import { EventEmitter } from 'events';
import { ZaiAgent } from '../agent/zai-agent.js';
import {
  AgentType,
  AgentTask,
  AgentResult,
  AgentConfig,
  AGENT_CAPABILITIES,
} from './agent-types.js';
import { v4 as uuidv4 } from 'uuid';

export class TaskOrchestrator extends EventEmitter {
  private static instance: TaskOrchestrator;
  private tasks: Map<string, AgentTask> = new Map();
  private runningTasks: Set<string> = new Set();
  private maxParallelTasks: number = 3;

  private constructor() {
    super();
  }

  static getInstance(): TaskOrchestrator {
    if (!TaskOrchestrator.instance) {
      TaskOrchestrator.instance = new TaskOrchestrator();
    }
    return TaskOrchestrator.instance;
  }

  /**
   * Create a new agent task
   */
  createTask(
    type: AgentType,
    description: string,
    prompt: string,
    config?: Partial<AgentConfig>
  ): AgentTask {
    const task: AgentTask = {
      id: uuidv4(),
      type,
      description,
      prompt,
      status: 'pending',
      createdAt: new Date(),
    };

    this.tasks.set(task.id, task);
    this.emit('task:created', task);
    return task;
  }

  /**
   * Execute a task with a specialized agent
   */
  async executeTask(
    taskId: string,
    agent: ZaiAgent,
    config?: Partial<AgentConfig>
  ): Promise<AgentResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'pending') {
      throw new Error(`Task ${taskId} is not in pending state`);
    }

    // Wait if too many tasks are running
    while (this.runningTasks.size >= this.maxParallelTasks) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    task.status = 'running';
    task.startedAt = new Date();
    this.runningTasks.add(taskId);
    this.emit('task:started', task);

    try {
      const capability = AGENT_CAPABILITIES[task.type];

      // Build enhanced prompt with agent system prompt
      const enhancedPrompt = this.buildAgentPrompt(
        task.prompt,
        capability,
        config
      );

      // Execute with agent
      const startTime = Date.now();
      const chatEntries = await agent.processUserMessage(enhancedPrompt);
      const duration = Date.now() - startTime;

      // Extract result from chat entries
      const output = chatEntries
        .filter((entry) => entry.type === 'assistant')
        .map((entry) => entry.content)
        .join('\n\n');

      const toolsUsed = chatEntries
        .filter((entry) => entry.type === 'tool_result' && entry.toolCall)
        .map((entry) => entry.toolCall?.function.name)
        .filter((name): name is string => !!name);

      const result: AgentResult = {
        success: true,
        output,
        metadata: {
          duration,
          toolsUsed: [...new Set(toolsUsed)],
          // Could add more metadata here
        },
      };

      task.result = result;
      task.status = 'completed';
      task.completedAt = new Date();
      this.emit('task:completed', task);

      return result;
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();
      this.emit('task:failed', task);

      return {
        success: false,
        output: '',
        metadata: { error: error.message },
      };
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeParallel(
    taskIds: string[],
    agent: ZaiAgent,
    config?: Partial<AgentConfig>
  ): Promise<Map<string, AgentResult>> {
    const results = new Map<string, AgentResult>();

    const promises = taskIds.map(async (taskId) => {
      const result = await this.executeTask(taskId, agent, config);
      results.set(taskId, result);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Execute tasks sequentially
   */
  async executeSequential(
    taskIds: string[],
    agent: ZaiAgent,
    config?: Partial<AgentConfig>
  ): Promise<Map<string, AgentResult>> {
    const results = new Map<string, AgentResult>();

    for (const taskId of taskIds) {
      const result = await this.executeTask(taskId, agent, config);
      results.set(taskId, result);

      // Stop if a task fails
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Build enhanced prompt with agent capabilities
   */
  private buildAgentPrompt(
    userPrompt: string,
    capability: typeof AGENT_CAPABILITIES[AgentType],
    config?: Partial<AgentConfig>
  ): string {
    const systemPrompt = config?.customSystemPrompt || capability.systemPrompt;

    return `${systemPrompt}

TASK:
${userPrompt}

Available tools: ${capability.tools.join(', ')}

Please complete this task using the available tools. Be thorough and provide clear explanations.`;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: AgentTask['status']): AgentTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === status);
  }

  /**
   * Get tasks by type
   */
  getTasksByType(type: AgentType): AgentTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.type === type);
  }

  /**
   * Cancel a pending task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return false;
    }

    task.status = 'failed';
    task.error = 'Task cancelled by user';
    task.completedAt = new Date();
    this.emit('task:cancelled', task);
    return true;
  }

  /**
   * Clear completed tasks
   */
  clearCompleted(): number {
    const completed = this.getTasksByStatus('completed');
    completed.forEach((task) => this.tasks.delete(task.id));
    return completed.length;
  }

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
  } {
    const all = this.getAllTasks();
    const byType: Record<string, number> = {};

    all.forEach((task) => {
      byType[task.type] = (byType[task.type] || 0) + 1;
    });

    return {
      total: all.length,
      pending: this.getTasksByStatus('pending').length,
      running: this.getTasksByStatus('running').length,
      completed: this.getTasksByStatus('completed').length,
      failed: this.getTasksByStatus('failed').length,
      byType: byType as Record<AgentType, number>,
    };
  }

  /**
   * Set max parallel tasks
   */
  setMaxParallelTasks(max: number): void {
    this.maxParallelTasks = Math.max(1, Math.min(max, 10));
  }
}

// Export singleton getter
export function getTaskOrchestrator(): TaskOrchestrator {
  return TaskOrchestrator.getInstance();
}
