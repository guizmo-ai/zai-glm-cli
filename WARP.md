# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**ZAI CLI** is a conversational AI CLI tool powered by Z.ai GLM models with intelligent text editing and tool usage. It's forked from grok-cli and enhanced specifically for the Z.ai GLM ecosystem.

**Key Technologies:**
- TypeScript with ES2022 target
- Node.js 18+ (Bun-compatible)
- React Ink for terminal UI
- Vitest for testing (90+ tests)
- Z.ai GLM models (GLM-4.6, GLM-4.5, GLM-4.5-Air)
- OpenAI SDK for API communication
- Model Context Protocol (MCP) for extensibility

## Development Commands

```bash
# Development
npm run dev              # Run with Bun (preferred)
npm run dev:node         # Run with Node.js/tsx

# Building
npm run build            # TypeScript compilation
npm run build:bun        # Build with Bun

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once (CI mode)
npm run test:ui          # Run tests with UI
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking (without emitting files)

# Installation
npm install              # Standard npm install
npm run install:bun      # Install with Bun

# Running the CLI
npm start                # Run built version with Node
npm run start:bun        # Run built version with Bun
```

## Architecture

### Sequential Streaming Architecture

ZAI CLI uses a **sequential streaming architecture** to prevent "deconstructed" responses where the model streams text while simultaneously planning/executing tools.

**Core Flow:**
1. **Thinking State**: Stream processor consumes entire API response
2. **Decision Point**: Check for tool calls before streaming content
3. **Tool Execution**: If tools needed, execute all tools sequentially
4. **Response State**: Only stream final content after tool completion

**Key Components:**
- `src/agent/stream-processor.ts` - Processes complete API stream before yielding to UI
- `src/agent/chat-state-machine.ts` - Enforces valid state transitions (idle → thinking → planning_tools → executing_tools → responding → done)
- `src/agent/zai-agent.ts` - Main agent orchestration

### Directory Structure

```
src/
├── agent/              # Core AI agent logic
│   ├── zai-agent.ts           # Main agent orchestrator
│   ├── stream-processor.ts    # API stream processing
│   └── chat-state-machine.ts  # State management
├── tools/              # AI-callable tools
│   ├── text-editor.ts         # str_replace_editor (primary editing tool)
│   ├── bash.ts                # Shell command execution
│   ├── search.ts              # File/content search (ripgrep)
│   ├── batch-editor.ts        # Multi-file editing
│   ├── morph-editor.ts        # High-speed editing (optional)
│   ├── todo-tool.ts           # Task management
│   └── confirmation-tool.ts   # User confirmation system
├── ui/                 # React Ink terminal interface
│   ├── app.tsx                # Main app component
│   ├── components/            # UI components
│   └── utils/                 # UI utilities (markdown, colors)
├── utils/              # Core utilities
│   ├── settings-manager.ts    # User/project settings
│   ├── custom-instructions.ts # .zai/ZAI.md loader
│   ├── history-manager.ts     # Command history persistence
│   ├── backup-manager.ts      # Automatic file backups
│   ├── file-watcher.ts        # Real-time file change detection
│   ├── session-manager.ts     # Session persistence
│   └── token-counter.ts       # Token counting with tiktoken
├── zai/                # Z.ai API client
│   ├── client.ts              # OpenAI SDK wrapper
│   └── tools.ts               # Tool definitions for API
├── mcp/                # Model Context Protocol
│   ├── client.ts              # MCP client implementation
│   ├── config.ts              # MCP server configuration
│   └── transports.ts          # SSE/stdio transports
├── errors/             # Typed error system
└── types/              # TypeScript types
```

### Configuration System

**Two-tier configuration:**
1. **User Settings** (`~/.zai/user-settings.json`) - Global settings
   - API key, base URL, default model
   - File watching preferences
   - Command history settings

2. **Project Settings** (`.zai/settings.json`) - Project-specific
   - Model override
   - MCP server configurations

**Custom Instructions** (`.zai/ZAI.md`) - Project-specific AI guidelines loaded automatically

### Tool System

**Primary File Editing Tool:**
- `str_replace_editor` - Precise string replacement in existing files (always use view_file first)

**File Operations:**
- `view_file` - Read file contents or list directories
- `create_file` - Create new files (only for non-existent files)
- `batch_edit` - Apply same edit across multiple files

**System Operations:**
- `bash` - Execute shell commands with confirmation
- `search` - Unified search (content or file name) using ripgrep

**Task Management:**
- `create_todo_list` - Create visual todo list for complex tasks (4+ steps)
- `update_todo_list` - Update task status and priorities

**User Confirmation System:**
- File operations and bash commands auto-request confirmation
- Users can approve per-operation or session-wide
- Rejections return errors to prevent operation execution

### AI Agent Design

**Pre-conversation Approach:**
- No system messages (preserves thinking/reasoning mode)
- Initial assistant message establishes capabilities and rules
- Custom instructions loaded from `.zai/ZAI.md` and referenced in system guidelines

**Context Management:**
- Keeps 20 recent messages for context
- Maximum 50 messages before summarization
- Context summaries generated when limit reached

**Thinking Mode:**
- GLM-4.6 and GLM-4.5 support extended thinking
- Visible reasoning process displayed to user
- Enabled by default for compatible models

## Key Development Patterns

### TypeScript Configuration
- ES2022 target with ESNext modules
- Non-strict mode (`strict: false`, `noImplicitAny: false`)
- Bundler module resolution
- React JSX support for Ink components

### Testing with Vitest
- Test files in `tests/` directory (unit/ and integration/)
- 90+ tests with comprehensive coverage
- Uses `describe`, `it`, `expect` pattern
- Mocking with `vi` from Vitest
- Target: 80%+ overall coverage

### Error Handling
- Typed error system with specific error classes:
  - `APIError` - API communication failures
  - `ToolExecutionError` - Tool execution failures
  - `ValidationError` - Input validation errors
- `ErrorHandler` utility with retry mechanisms

### Async Generators
- Streaming responses use async generators (`AsyncGenerator`)
- `StreamProcessor.process()` consumes full stream before yielding
- UI consumes generator with `for await...of`

## Z.ai API Specifics

**Base URL:** `https://api.z.ai/api/coding/paas/v4`

**Models:**
- `glm-4.6` - 200K context, best for complex coding (default)
- `glm-4.5` - 128K context, balanced performance
- `glm-4.5-air` - Fast and lightweight

**Thinking Mode:**
- Enable with `thinking: { type: "enabled" }` in request
- Returns reasoning in `reasoning_content` field
- CRITICAL: Thinking disabled when system messages + tools used together
- Solution: Use pre-conversation pattern instead of system messages

**Token Limits:**
- Default `max_tokens`: 1536
- Override with `ZAI_MAX_TOKENS` environment variable

## Environment Variables

```bash
ZAI_API_KEY          # Z.ai API key (required)
ZAI_BASE_URL         # API base URL (optional, defaults to Z.ai coding endpoint)
ZAI_MODEL            # Model selection (optional, defaults to glm-4.6)
ZAI_MAX_TOKENS       # Max tokens per response (optional, defaults to 1536)
MORPH_API_KEY        # Morph Fast Apply key (optional, enables high-speed editing)
```

## Testing Strategy

**Unit Tests** (`tests/unit/`) - Test individual functions in isolation
- Utils: token counting, settings management, text utilities
- Tools: search, bash, text editor

**Integration Tests** (`tests/integration/`) - Test component interactions
- Agent workflows
- End-to-end scenarios
- Tool execution flows

**Coverage Goals:**
- Overall: 80%+
- Critical paths: 90%+
- Utilities: 85%+

## MCP Integration

**Model Context Protocol** extends ZAI with external tools/capabilities.

**Transports:**
- SSE (Server-Sent Events) for HTTP endpoints
- stdio for local processes

**Configuration:**
- Stored in `.zai/settings.json` under `mcpServers`
- Managed via `zai mcp` commands
- Tools prefixed with `mcp__` to avoid naming conflicts

## Important Implementation Notes

1. **File Editing Workflow:** Always use `view_file` before `str_replace_editor`
2. **State Machine Guards:** Check `canStreamContent()`, `canExecuteTools()` before operations
3. **Tool Confirmation:** All file/bash operations require user confirmation unless session-wide approval given
4. **Custom Instructions:** Automatically loaded from `.zai/ZAI.md` in project root
5. **Session Persistence:** Auto-save to `~/.zai/sessions/` with full context
6. **Backups:** All edits backed up to `~/.zai/backups/` with timestamps
7. **History:** Commands saved to `~/.zai/history.json` across sessions
8. **Token Counting:** Use `tiktoken` library with model-specific encoding

## Build Output

- Compiled to `dist/` directory
- Maintains source maps for debugging
- Declaration files (`.d.ts`) generated
- Entry point: `dist/index.js` (shebang included for CLI usage)

## Publishing

- Package name: `@guizmo-ai/zai-cli`
- Published to npm registry
- Files included: `dist/`, `README.md`, `LICENSE`
- Binary: `zai` command
- `prepublishOnly` hook runs build automatically
