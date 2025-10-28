/**
 * Task Tool - Allows GLM to spawn specialized agents
 * This tool enables GLM to delegate complex tasks to specialized agents
 * without polluting the main context
 */

import { ToolResult } from '../types/index.js';
import { getTaskOrchestrator } from '../agents/task-orchestrator.js';
import { AgentType, AGENT_CAPABILITIES } from '../agents/agent-types.js';
import { ZaiAgent } from '../agent/zai-agent.js';

export interface TaskToolParams {
  agent_type: AgentType;
  task_description: string;
  thoroughness?: 'quick' | 'medium' | 'thorough';
}

export class TaskTool {
  private parentAgent: ZaiAgent | null = null;

  /**
   * Set the parent agent (used for spawning sub-agents)
   */
  setParentAgent(agent: ZaiAgent): void {
    this.parentAgent = agent;
  }

  /**
   * Execute a task with a specialized agent
   */
  async execute(params: TaskToolParams): Promise<ToolResult> {
    try {
      const { agent_type, task_description, thoroughness = 'medium' } = params;

      // Validate agent type
      if (!AGENT_CAPABILITIES[agent_type]) {
        return {
          success: false,
          error: `Unknown agent type: ${agent_type}. Available types: ${Object.keys(AGENT_CAPABILITIES).join(', ')}`,
        };
      }

      if (!this.parentAgent) {
        return {
          success: false,
          error: 'Parent agent not set. Cannot spawn sub-agent.',
        };
      }

      const capability = AGENT_CAPABILITIES[agent_type];

      // Notify parent agent that we're starting the sub-agent
      this.parentAgent.addAgentActivity(agent_type, capability.name, 'starting');

      // Create a new isolated agent for this task
      const subAgent = new ZaiAgent(
        this.parentAgent.getClient().apiKey,
        this.parentAgent.getClient().baseURL,
        this.parentAgent.getClient().model,
        this.getThoroughnessRounds(thoroughness)
      );

      // Create task
      const orchestrator = getTaskOrchestrator();
      const task = orchestrator.createTask(
        agent_type,
        task_description,
        task_description
      );

      // Notify parent that agent is now running
      this.parentAgent.addAgentActivity(agent_type, capability.name, 'running', task.id);

      // Execute task with sub-agent
      const startTime = Date.now();
      const result = await orchestrator.executeTask(task.id, subAgent, {
        type: agent_type,
        customSystemPrompt: this.buildSystemPrompt(capability, thoroughness),
      });
      const duration = Date.now() - startTime;

      if (!result.success) {
        // Notify parent that agent failed
        const errorMessage = result.metadata?.error || 'Task execution failed';
        this.parentAgent.addAgentActivity(agent_type, capability.name, 'failed', task.id, duration, errorMessage);

        return {
          success: false,
          error: errorMessage,
          output: result.output,
        };
      }

      // Notify parent that agent completed successfully
      this.parentAgent.addAgentActivity(agent_type, capability.name, 'completed', task.id, duration);

      // Return summarized result (not full context)
      const summary = this.summarizeResult(result.output, task_description, capability.name);

      return {
        success: true,
        output: summary,
        metadata: {
          agent_type,
          task_id: task.id,
          duration,
          tools_used: result.metadata?.toolsUsed,
          thoroughness,
        },
      };
    } catch (error: any) {
      // Notify parent that agent failed with error
      const errorMessage = `Task tool error: ${error.message}`;
      if (this.parentAgent) {
        const capability = AGENT_CAPABILITIES[params.agent_type];
        if (capability) {
          this.parentAgent.addAgentActivity(params.agent_type, capability.name, 'failed', undefined, undefined, errorMessage);
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Build system prompt based on thoroughness level
   */
  private buildSystemPrompt(capability: typeof AGENT_CAPABILITIES[AgentType], thoroughness: string): string {
    const basePrompt = capability.systemPrompt;

    const thoroughnessInstructions: Record<string, string> = {
      quick: '\n\nIMPORTANT: Be concise and focus on the most critical aspects. Limit to 2-3 key points.',
      medium: '\n\nIMPORTANT: Provide balanced coverage. Include main points with supporting details.',
      thorough: '\n\nIMPORTANT: Be comprehensive and detailed. Cover all aspects thoroughly with examples.',
    };

    return basePrompt + (thoroughnessInstructions[thoroughness] || thoroughnessInstructions.medium);
  }

  /**
   * Get max rounds based on thoroughness
   */
  private getThoroughnessRounds(thoroughness: string): number {
    const rounds: Record<string, number> = {
      quick: 10,
      medium: 25,
      thorough: 50,
    };
    return rounds[thoroughness] || 25;
  }

  /**
   * Summarize agent result for main context
   * This prevents context pollution by only returning key findings
   */
  private summarizeResult(output: string, taskDescription: string, agentName: string): string {
    // Extract key points (first 1000 chars + last 500 chars as summary)
    const maxLength = 1500;

    if (output.length <= maxLength) {
      return `${agentName} Result for "${taskDescription}":\n\n${output}`;
    }

    const start = output.substring(0, 1000);
    const end = output.substring(output.length - 500);

    return `${agentName} Result for "${taskDescription}":\n\n${start}\n\n[... ${output.length - 1500} characters omitted for brevity ...]\n\n${end}\n\n✓ Full details available in task logs (use /tasks to view)`;
  }

  /**
   * Get tool definition for GLM
   */
  static getToolDefinition() {
    return {
      type: 'function' as const,
      function: {
        name: 'launch_agent',
        description: `Launch a specialized agent to handle complex tasks autonomously. Use this when:
- A task requires specialized expertise (code review, testing, documentation, etc.)
- You need to explore a large codebase without polluting the main context
- A task would take many rounds and benefit from isolated execution
- You want to delegate work to an expert agent

The agent will work independently and return only a summary, keeping the main conversation focused.

Available agent types:
- code-reviewer: Review code for quality, bugs, security, and best practices
- test-writer: Write comprehensive unit and integration tests
- documentation: Create technical documentation, README, API docs
- refactoring: Refactor code for better structure and maintainability
- debugging: Diagnose and fix bugs systematically
- security-audit: Audit code for security vulnerabilities
- performance-optimizer: Analyze and optimize code performance
- explore: Explore codebase to understand architecture and patterns
- plan: Create detailed implementation plans for complex features

Example: If user asks "review the auth module", use code-reviewer agent.`,
        parameters: {
          type: 'object' as const,
          properties: {
            agent_type: {
              type: 'string',
              enum: Object.keys(AGENT_CAPABILITIES),
              description: 'Type of specialized agent to use',
            },
            task_description: {
              type: 'string',
              description: 'Clear description of what the agent should do. Be specific about files, scope, and objectives.',
            },
            thoroughness: {
              type: 'string',
              enum: ['quick', 'medium', 'thorough'],
              description: 'Level of thoroughness: quick (2-3 key points), medium (balanced), thorough (comprehensive)',
              default: 'medium',
            },
          },
          required: ['agent_type', 'task_description'],
        },
      },
    };
  }
}

// Export singleton
let taskToolInstance: TaskTool | null = null;

export function getTaskTool(): TaskTool {
  if (!taskToolInstance) {
    taskToolInstance = new TaskTool();
  }
  return taskToolInstance;
}
