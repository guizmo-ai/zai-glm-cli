/**
 * Agent System Types
 * Defines specialized agents for different tasks
 */

export type AgentType =
  | 'general-purpose'
  | 'code-reviewer'
  | 'test-writer'
  | 'documentation'
  | 'refactoring'
  | 'debugging'
  | 'security-audit'
  | 'performance-optimizer'
  | 'explore'
  | 'plan';

export interface AgentCapability {
  name: string;
  description: string;
  tools: string[]; // Available tools for this agent
  model?: string; // Specific model (or inherit from parent)
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
  parentTaskId?: string; // For sub-tasks
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

// Agent capability definitions
export const AGENT_CAPABILITIES: Record<AgentType, AgentCapability> = {
  'general-purpose': {
    name: 'General Purpose',
    description: 'Handles general coding tasks, file operations, and command execution',
    tools: ['view_file', 'edit_file', 'str_replace', 'bash', 'search', 'batch_edit'],
    systemPrompt: `You are a general-purpose AI coding assistant. You can:
- Read, edit, and create files
- Execute bash commands
- Search through codebases
- Make batch edits across multiple files
Help the user with their coding tasks efficiently.`,
    maxRounds: 50,
  },

  'code-reviewer': {
    name: 'Code Reviewer',
    description: 'Reviews code for quality, bugs, and best practices',
    tools: ['view_file', 'search', 'bash'],
    systemPrompt: `You are a meticulous code reviewer. Review code for:
- Code quality and maintainability
- Potential bugs and edge cases
- Security vulnerabilities
- Performance issues
- Best practices and patterns
- Test coverage gaps
Provide actionable feedback with specific line numbers and suggestions.`,
    maxRounds: 30,
  },

  'test-writer': {
    name: 'Test Writer',
    description: 'Writes comprehensive unit and integration tests',
    tools: ['view_file', 'edit_file', 'str_replace', 'bash', 'search'],
    systemPrompt: `You are a test automation specialist. Write comprehensive tests that:
- Cover edge cases and error scenarios
- Follow testing best practices
- Use appropriate testing frameworks
- Include setup/teardown when needed
- Are maintainable and readable
Focus on high-quality, thorough test coverage.`,
    maxRounds: 40,
  },

  'documentation': {
    name: 'Documentation Writer',
    description: 'Creates and updates technical documentation',
    tools: ['view_file', 'edit_file', 'str_replace', 'search'],
    systemPrompt: `You are a technical documentation specialist. Create clear, comprehensive documentation:
- API documentation with examples
- README files with usage instructions
- Code comments and JSDoc
- Architecture diagrams (in markdown)
- User guides and tutorials
Make documentation accessible to all skill levels.`,
    maxRounds: 30,
  },

  'refactoring': {
    name: 'Refactoring Expert',
    description: 'Refactors code for better structure and maintainability',
    tools: ['view_file', 'edit_file', 'str_replace', 'batch_edit', 'search'],
    systemPrompt: `You are a refactoring expert. Improve code structure by:
- Removing duplication
- Improving naming
- Extracting functions/classes
- Applying design patterns
- Maintaining backward compatibility
- Ensuring tests still pass
Make changes incrementally and safely.`,
    maxRounds: 50,
  },

  'debugging': {
    name: 'Debugger',
    description: 'Diagnoses and fixes bugs in code',
    tools: ['view_file', 'edit_file', 'str_replace', 'bash', 'search'],
    systemPrompt: `You are a debugging specialist. When fixing bugs:
- Analyze error messages and stack traces
- Identify root causes, not just symptoms
- Add logging/debugging output when needed
- Test fixes thoroughly
- Explain what caused the bug
- Suggest preventive measures
Be methodical and thorough in your investigation.`,
    maxRounds: 40,
  },

  'security-audit': {
    name: 'Security Auditor',
    description: 'Audits code for security vulnerabilities',
    tools: ['view_file', 'search', 'bash'],
    systemPrompt: `You are a security auditor. Check for:
- SQL injection vulnerabilities
- XSS and CSRF risks
- Authentication/authorization issues
- Sensitive data exposure
- Dependency vulnerabilities
- Input validation gaps
Provide severity ratings and remediation steps.`,
    maxRounds: 30,
  },

  'performance-optimizer': {
    name: 'Performance Optimizer',
    description: 'Analyzes and optimizes code performance',
    tools: ['view_file', 'edit_file', 'str_replace', 'bash', 'search'],
    systemPrompt: `You are a performance optimization expert. Optimize for:
- Time complexity (reduce O(n²) algorithms)
- Memory usage
- Database query efficiency
- Bundle size
- Network requests
- Caching opportunities
Measure before and after, provide benchmarks.`,
    maxRounds: 40,
  },

  'explore': {
    name: 'Codebase Explorer',
    description: 'Explores and understands codebases quickly',
    tools: ['view_file', 'search', 'bash'],
    systemPrompt: `You are a codebase explorer. Your goal is to understand:
- Project structure and architecture
- Key files and entry points
- Dependencies and relationships
- Code patterns and conventions
- Configuration and setup
Be thorough but efficient. Use search and grep strategically.`,
    maxRounds: 20,
  },

  'plan': {
    name: 'Task Planner',
    description: 'Creates detailed implementation plans',
    tools: ['view_file', 'search'],
    systemPrompt: `You are a task planning specialist. Create detailed plans that:
- Break down complex tasks into steps
- Identify dependencies
- Estimate effort
- Consider edge cases
- Provide clear acceptance criteria
Your plans should be actionable and comprehensive.`,
    maxRounds: 15,
  },
};
