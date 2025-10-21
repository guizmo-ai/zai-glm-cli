import { ZaiClient } from "../zai/client.js";
import { getAllZaiTools, getMCPManager, initializeMCPServers, } from "../zai/tools.js";
import { loadMCPConfig } from "../mcp/config.js";
import { TextEditorTool, MorphEditorTool, BashTool, TodoTool, ConfirmationTool, SearchTool, BatchEditorTool, } from "../tools/index.js";
import { EventEmitter } from "events";
import { createTokenCounter } from "../utils/token-counter.js";
import { loadCustomInstructions } from "../utils/custom-instructions.js";
import { getSettingsManager } from "../utils/settings-manager.js";
import { getMetricsCollector } from "../utils/metrics.js";
import { ErrorHandler } from "../utils/error-handler.js";
import { ToolExecutionError } from "../errors/index.js";
export class ZaiAgent extends EventEmitter {
    zaiClient;
    textEditor;
    morphEditor;
    bash;
    todoTool;
    confirmationTool;
    search;
    batchEditor;
    chatHistory = [];
    messages = [];
    tokenCounter;
    abortController = null;
    mcpInitialized = false;
    maxToolRounds;
    systemInstructions = ""; // Store instructions to prepend to first user message
    // Context management constants and state
    MAX_MESSAGES = 50; // Adjust based on average token count
    KEEP_RECENT_MESSAGES = 20; // Always keep recent context
    contextSummary = "";
    constructor(apiKey, baseURL, model, maxToolRounds) {
        super();
        const manager = getSettingsManager();
        const savedModel = manager.getCurrentModel();
        const modelToUse = model || savedModel || "glm-4.6"; // Utiliser glm-4.6 par défaut
        this.maxToolRounds = maxToolRounds || 400;
        this.zaiClient = new ZaiClient(apiKey, modelToUse, baseURL);
        this.textEditor = new TextEditorTool();
        this.morphEditor = process.env.MORPH_API_KEY ? new MorphEditorTool() : null;
        this.bash = new BashTool();
        this.todoTool = new TodoTool();
        this.confirmationTool = new ConfirmationTool();
        this.search = new SearchTool();
        this.batchEditor = new BatchEditorTool();
        this.tokenCounter = createTokenCounter(modelToUse);
        // Initialize MCP servers if configured
        this.initializeMCP();
        // Load custom instructions
        const customInstructions = loadCustomInstructions();
        const customInstructionsSection = customInstructions
            ? `\n\nCUSTOM INSTRUCTIONS:\n${customInstructions}\n\nThe above custom instructions should be followed alongside the standard instructions below.`
            : "";
        // IMPORTANT: Z.ai API disables thinking/reasoning when tools + system message OR tools + instructions in user message
        // SOLUTION: Preload a conversation with guidelines in an assistant message
        // This preserves thinking while providing full guidance
        // Initialize with a pre-conversation to establish context and guidelines
        this.messages.push({
            role: "user",
            content: "Hello, I need help with coding tasks, file editing, and system operations."
        });
        this.messages.push({
            role: "assistant",
            content: `Hello! I'm ZAI CLI, your AI coding assistant powered by Z.ai GLM models.

**My capabilities:**
- File editing (view, create, modify files)
- System operations (bash commands, file navigation)
- Code search and analysis
- Multi-file batch operations
- Project organization with todo lists${this.morphEditor ? '\n- High-speed editing with Morph Fast Apply' : ''}

**How I work:**
1. **Read before edit**: I always use view_file to read files before modifying them
2. **Primary editing tool**: str_replace_editor for precise, targeted file modifications
3. **Planning**: For complex multi-step tasks (4+ steps), I create a todo list first using create_todo_list
4. **Verification**: I verify file existence before creating new files
5. **Concise communication**: I focus on actions over conversation

**Tool selection guide:**
- Known file path → view_file
- Find text in files → search (type: "content")
- Find files by name → search (type: "file")
- Edit existing file → str_replace_editor (after viewing it)
- Create new file → create_file (after verifying it doesn't exist)
- System commands → bash
- Multiple file changes → batch_edit or create todo list first

**Task complexity:**
- **Simple** (1-3 steps): Act immediately
- **Moderate** (2-4 files): Brief planning in response
- **Complex** (5+ files, 4+ steps): Create todo list first

Ready to help! What would you like to work on?`
        });
        // Store full instructions for reference (not sent to API)
        this.systemInstructions = `<role>
You are ZAI CLI, an AI assistant powered by Z.ai GLM models that helps with file editing, coding tasks, and system operations. Your purpose is to execute user requests efficiently, accurately, and with minimal friction.
</role>${customInstructionsSection}

<context>
Current working directory: ${process.cwd()}
</context>

<tools>
Available tools for your use:
- view_file: View file contents or directory listings
- create_file: Create new files with content (use only for files that don't exist yet)
- str_replace_editor: Replace text in existing files (primary tool for editing existing files)${this.morphEditor
            ? "\n- edit_file: High-speed file editing with Morph Fast Apply (4,500+ tokens/sec with 98% accuracy)"
            : ""}
- bash: Execute bash commands for system operations, navigation, and file discovery
- search: Unified search tool for finding text content or files (similar to Cursor's search functionality)
- batch_edit: Apply the same edit to multiple files simultaneously (for refactoring, renaming, project-wide changes)
- create_todo_list: Create a visual todo list for planning and tracking tasks
- update_todo_list: Update existing todos in your todo list

MCP tools: If additional MCP (Model Context Protocol) tools are configured, they will be available with the prefix "mcp__".
</tools>

<critical_rules>
File modification rules:
1. ALWAYS use str_replace_editor for modifying existing files, even for small changes
2. ALWAYS use view_file to read a file's contents before editing it
3. ALWAYS use create_file only for creating entirely new files that don't exist
4. ALWAYS verify a file doesn't exist before using create_file (using view_file or bash)

Search and exploration rules:
1. ALWAYS prefer the search tool for finding text content or files by name
2. ALWAYS use view_file when you know the specific file path
3. ALWAYS use bash for complex file operations, navigation, and system commands

Task planning rules:
1. ALWAYS create a todo list first for complex multi-step requests
2. ALWAYS mark only one task as 'in_progress' at a time
3. ALWAYS mark tasks as 'completed' immediately when finished
4. ALWAYS use priorities: 'high', 'medium', or 'low'

User confirmation system:
- File operations (create_file, str_replace_editor) and bash commands automatically request user confirmation before execution
- If a user rejects an operation, the tool returns an error - do not proceed with that operation
- Users can approve individual operations or approve all operations of that type for the session
</critical_rules>

<tool_selection_heuristics>
For finding information:
- Known file path → view_file
- Finding text in files → search (with search_type: "content")
- Finding files by name → search (with search_type: "file")
- Complex patterns or system info → bash

For file modifications:
- Edit existing file → str_replace_editor (always view first)
- Create new file → create_file (verify doesn't exist first)${this.morphEditor
            ? "\n- High-speed edits → edit_file (when available, for large-scale changes)"
            : ""}
- Multiple file changes → plan with create_todo_list first

For system operations:
- Navigation and discovery → bash
- Running tests/builds → bash
- Installing dependencies → bash
- Complex shell operations → bash

Best practices:
1. View files before editing them
2. Prefer specialized tools over generic bash when available
3. Consolidate operations when possible to minimize tool calls
4. Verify prerequisites before executing operations
</tool_selection_heuristics>

<task_complexity_assessment>
SIMPLE (act immediately):
- Single file edits or views
- Single bash commands
- Quick searches
- Single file creation

MODERATE (plan briefly in your response):
- Multiple file changes (2-4 files)
- Multi-step operations with clear dependencies
- Coordinating 2-3 tools

COMPLEX (create todo list first):
- Refactoring across many files (5+ files)
- Building new features with multiple components
- Multi-stage processes requiring careful ordering
- High-risk operations requiring verification steps
- Any request with 4+ distinct subtasks

When uncertain about complexity, create a todo list. Todo lists provide visual feedback with colors: ✅ Green (completed), 🔄 Cyan (in progress), ⏳ Yellow (pending).
</task_complexity_assessment>

<thinking_framework>
Before acting on complex tasks:
1. Break down the request into subtasks
2. Identify which tools are needed for each subtask
3. Consider potential errors or edge cases
4. Plan the sequence of operations (dependencies, order)

When encountering errors:
1. Analyze the error message carefully
2. Identify the root cause (not just symptoms)
3. Consider alternative approaches
4. Adapt strategy before retrying
5. Maximum 2-3 retries with different approaches before explaining the issue to the user

After execution:
1. Verify results match the user's expectations
2. Check if additional steps are needed
3. Ensure the original request has been fully addressed
</thinking_framework>

<error_recovery>
When operations fail:
1. Read and analyze error messages carefully - they often contain the solution
2. Common error patterns and solutions:
   - File not found → verify the path exists, check working directory, use view_file or bash to confirm
   - File already exists (create_file) → use str_replace_editor instead or verify the file should be created
   - Permission denied → explain the limitation to the user
   - Invalid arguments → review the tool schema and correct the parameters
   - Syntax errors → check for special characters, escaping issues, or malformed input
   - Search returns no results → try broader search terms, check spelling, verify file types

3. Recovery approach:
   - Try an alternative method (e.g., bash instead of search, or vice versa)
   - Ask the user for clarification if the request is ambiguous
   - Break complex operations into simpler, more manageable steps
   - Maximum 2-3 retry attempts with different strategies before explaining the issue

4. ALWAYS adapt your approach - do not repeat the exact same failed operation
5. If an operation is blocked by user confirmation rejection, acknowledge it and either ask for guidance or suggest an alternative
</error_recovery>

<response_style>
Provide concise, task-focused responses:
1. Explain what you're doing and why (briefly)
2. Show the results of operations clearly
3. Avoid pleasantries like "Thanks for...", "Great!", or "Let me help you with that!"
4. Provide necessary explanations or next steps only if relevant to the task
5. If a tool execution completes the user's request, give a brief confirmation or remain silent
6. Be direct and efficient - users value action over conversation
7. When you complete a task, summarize what was done without unnecessary elaboration
</response_style>

---

USER REQUEST:
`;
        // Note: System instructions will be prepended to the first user message
    }
    /**
     * Estimates the total token count for an array of messages
     * Uses a rough approximation of ~4 characters per token
     */
    estimateMessageTokens(messages) {
        const totalChars = messages.reduce((sum, msg) => {
            const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            return sum + content.length;
        }, 0);
        return Math.ceil(totalChars / 4);
    }
    /**
     * Summarizes a range of conversation messages into a concise summary
     * Focuses on key decisions, file modifications, findings, and state
     */
    async summarizeContext(messages) {
        try {
            const summaryPrompt = `Summarize this conversation history concisely, focusing on:
- Key decisions made
- Files created or modified
- Important findings or results
- Current project state
- Any pending tasks or issues

Keep the summary under 500 tokens.

Conversation to summarize:
${JSON.stringify(messages, null, 2)}`;
            const summaryMessages = [
                {
                    role: "system",
                    content: "You are a conversation summarizer. Create concise, factual summaries focusing on actions taken and key information."
                },
                {
                    role: "user",
                    content: summaryPrompt
                }
            ];
            const response = await this.zaiClient.chat(summaryMessages, []);
            const summary = response.choices[0]?.message?.content || "Unable to generate summary.";
            return summary;
        }
        catch (error) {
            console.warn("Failed to summarize context:", error.message);
            return "Previous context summarization failed.";
        }
    }
    /**
     * Manages context by compressing old messages when limit is reached
     * Preserves system message, creates summary of old context, keeps recent messages
     */
    async manageContext() {
        if (this.messages.length <= this.MAX_MESSAGES) {
            return; // No need to compress yet
        }
        try {
            // Calculate range of messages to summarize
            const systemMessage = this.messages[0]; // Always keep system message
            const recentMessages = this.messages.slice(-this.KEEP_RECENT_MESSAGES);
            const oldMessages = this.messages.slice(1, -this.KEEP_RECENT_MESSAGES);
            // Only summarize if there are old messages to compress
            if (oldMessages.length === 0) {
                return;
            }
            // Summarize old messages
            const summary = await this.summarizeContext(oldMessages);
            // Rebuild messages array with summary
            this.messages = [
                systemMessage,
                {
                    role: "system",
                    content: `<context_summary>
Previous conversation summary:
${summary}
</context_summary>`
                },
                ...recentMessages
            ];
            // Store summary for reference
            this.contextSummary = summary;
            console.log(`Context compressed: ${oldMessages.length} messages summarized, ${recentMessages.length} recent messages kept.`);
        }
        catch (error) {
            console.warn("Context management failed:", error.message);
            // If context management fails, continue without compression
        }
    }
    async initializeMCP() {
        // Initialize MCP in the background without blocking
        Promise.resolve().then(async () => {
            try {
                const config = loadMCPConfig();
                if (config.servers.length > 0) {
                    await initializeMCPServers();
                }
            }
            catch (error) {
                console.warn("MCP initialization failed:", error);
            }
            finally {
                this.mcpInitialized = true;
            }
        });
    }
    async processUserMessage(message) {
        // Start metrics tracking
        const metrics = getMetricsCollector();
        const taskId = metrics.startTask(message);
        // Manage context before adding new message
        await this.manageContext();
        // Add user message to conversation
        const userEntry = {
            type: "user",
            content: message,
            timestamp: new Date(),
        };
        this.chatHistory.push(userEntry);
        this.messages.push({ role: "user", content: message });
        const newEntries = [userEntry];
        const maxToolRounds = this.maxToolRounds; // Prevent infinite loops
        let toolRounds = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        try {
            const tools = await getAllZaiTools();
            let currentResponse = await this.zaiClient.chat(this.messages, tools);
            // Agent loop - continue until no more tool calls or max rounds reached
            while (toolRounds < maxToolRounds) {
                const assistantMessage = currentResponse.choices[0]?.message;
                if (!assistantMessage) {
                    throw new Error("No response from Z.ai");
                }
                // Handle tool calls
                if (assistantMessage.tool_calls &&
                    assistantMessage.tool_calls.length > 0) {
                    toolRounds++;
                    metrics.recordToolRound();
                    // Add assistant message with tool calls
                    const assistantEntry = {
                        type: "assistant",
                        content: assistantMessage.content || "Using tools to help you...",
                        timestamp: new Date(),
                        toolCalls: assistantMessage.tool_calls,
                    };
                    this.chatHistory.push(assistantEntry);
                    newEntries.push(assistantEntry);
                    // Add assistant message to conversation
                    this.messages.push({
                        role: "assistant",
                        content: assistantMessage.content || "",
                        tool_calls: assistantMessage.tool_calls,
                    });
                    // Create initial tool call entries to show tools are being executed
                    assistantMessage.tool_calls.forEach((toolCall) => {
                        const toolCallEntry = {
                            type: "tool_call",
                            content: "Executing...",
                            timestamp: new Date(),
                            toolCall: toolCall,
                        };
                        this.chatHistory.push(toolCallEntry);
                        newEntries.push(toolCallEntry);
                    });
                    // Execute tool calls and update the entries
                    for (const toolCall of assistantMessage.tool_calls) {
                        const result = await this.executeTool(toolCall);
                        // Record tool call metrics
                        metrics.recordToolCall(toolCall.function.name, result.success);
                        // Update the existing tool_call entry with the result
                        const entryIndex = this.chatHistory.findIndex((entry) => entry.type === "tool_call" && entry.toolCall?.id === toolCall.id);
                        if (entryIndex !== -1) {
                            const updatedEntry = {
                                ...this.chatHistory[entryIndex],
                                type: "tool_result",
                                content: result.success
                                    ? result.output || "Success"
                                    : result.error || "Error occurred",
                                toolResult: result,
                            };
                            this.chatHistory[entryIndex] = updatedEntry;
                            // Also update in newEntries for return value
                            const newEntryIndex = newEntries.findIndex((entry) => entry.type === "tool_call" &&
                                entry.toolCall?.id === toolCall.id);
                            if (newEntryIndex !== -1) {
                                newEntries[newEntryIndex] = updatedEntry;
                            }
                        }
                        // Add tool result to messages with proper format (needed for AI context)
                        this.messages.push({
                            role: "tool",
                            content: result.success
                                ? result.output || "Success"
                                : result.error || "Error",
                            tool_call_id: toolCall.id,
                        });
                    }
                    // Get next response - this might contain more tool calls
                    currentResponse = await this.zaiClient.chat(this.messages, tools);
                }
                else {
                    // No more tool calls, add final response
                    const finalEntry = {
                        type: "assistant",
                        content: assistantMessage.content ||
                            "I understand, but I don't have a specific response.",
                        timestamp: new Date(),
                    };
                    this.chatHistory.push(finalEntry);
                    this.messages.push({
                        role: "assistant",
                        content: assistantMessage.content || "",
                    });
                    newEntries.push(finalEntry);
                    break; // Exit the loop
                }
            }
            if (toolRounds >= maxToolRounds) {
                const warningEntry = {
                    type: "assistant",
                    content: "Maximum tool execution rounds reached. Stopping to prevent infinite loops.",
                    timestamp: new Date(),
                };
                this.chatHistory.push(warningEntry);
                newEntries.push(warningEntry);
            }
            // Calculate token usage
            totalInputTokens = this.tokenCounter.countMessageTokens(this.messages);
            metrics.recordTokens(totalInputTokens, totalOutputTokens);
            metrics.endTask(true);
            return newEntries;
        }
        catch (error) {
            const errorMessage = ErrorHandler.handle(error);
            const errorEntry = {
                type: "assistant",
                content: `Sorry, I encountered an error:\n\n${errorMessage}`,
                timestamp: new Date(),
            };
            this.chatHistory.push(errorEntry);
            // Log error for debugging
            ErrorHandler.log(error);
            // End task with error
            metrics.endTask(false);
            return [userEntry, errorEntry];
        }
    }
    messageReducer(previous, item) {
        const reduce = (acc, delta) => {
            acc = { ...acc };
            for (const [key, value] of Object.entries(delta)) {
                if (acc[key] === undefined || acc[key] === null) {
                    acc[key] = value;
                    // Clean up index properties from tool calls
                    if (Array.isArray(acc[key])) {
                        for (const arr of acc[key]) {
                            delete arr.index;
                        }
                    }
                }
                else if (typeof acc[key] === "string" && typeof value === "string") {
                    acc[key] += value;
                }
                else if (Array.isArray(acc[key]) && Array.isArray(value)) {
                    const accArray = acc[key];
                    for (let i = 0; i < value.length; i++) {
                        if (!accArray[i])
                            accArray[i] = {};
                        accArray[i] = reduce(accArray[i], value[i]);
                    }
                }
                else if (typeof acc[key] === "object" && typeof value === "object") {
                    acc[key] = reduce(acc[key], value);
                }
            }
            return acc;
        };
        return reduce(previous, item.choices[0]?.delta || {});
    }
    async *processUserMessageStream(message) {
        // Start metrics tracking
        const metrics = getMetricsCollector();
        const taskId = metrics.startTask(message);
        // Manage context before adding new message
        await this.manageContext();
        // Create new abort controller for this request
        this.abortController = new AbortController();
        // Add user message to conversation
        // DO NOT prepend system instructions - they disable thinking/reasoning when tools are present
        // The Z.ai API will use tool descriptions to understand how to use the tools
        const userEntry = {
            type: "user",
            content: message,
            timestamp: new Date(),
        };
        this.chatHistory.push(userEntry);
        this.messages.push({ role: "user", content: message });
        // Calculate input tokens
        let inputTokens = this.tokenCounter.countMessageTokens(this.messages);
        yield {
            type: "token_count",
            tokenCount: inputTokens,
        };
        const maxToolRounds = this.maxToolRounds; // Prevent infinite loops
        let toolRounds = 0;
        let totalOutputTokens = 0;
        let lastTokenUpdate = 0;
        try {
            // Agent loop - continue until no more tool calls or max rounds reached
            while (toolRounds < maxToolRounds) {
                // Check if operation was cancelled
                if (this.abortController?.signal.aborted) {
                    yield {
                        type: "content",
                        content: "\n\n[Operation cancelled by user]",
                    };
                    yield { type: "done" };
                    return;
                }
                // Stream response and accumulate
                const tools = await getAllZaiTools();
                const stream = this.zaiClient.chatStream(this.messages, tools);
                let accumulatedMessage = {};
                let accumulatedContent = "";
                let toolCallsYielded = false;
                for await (const chunk of stream) {
                    // Check for cancellation in the streaming loop
                    if (this.abortController?.signal.aborted) {
                        yield {
                            type: "content",
                            content: "\n\n[Operation cancelled by user]",
                        };
                        yield { type: "done" };
                        return;
                    }
                    if (!chunk.choices?.[0])
                        continue;
                    // Accumulate the message using reducer
                    accumulatedMessage = this.messageReducer(accumulatedMessage, chunk);
                    // Check for tool calls - yield when we have complete tool calls with function names
                    if (!toolCallsYielded && accumulatedMessage.tool_calls?.length > 0) {
                        // Check if we have at least one complete tool call with a function name
                        const hasCompleteTool = accumulatedMessage.tool_calls.some((tc) => tc.function?.name);
                        if (hasCompleteTool) {
                            yield {
                                type: "tool_calls",
                                toolCalls: accumulatedMessage.tool_calls,
                            };
                            toolCallsYielded = true;
                        }
                    }
                    // Stream thinking content if available (for GLM-4.6 and compatible models)
                    // L'API Z.ai utilise le champ "reasoning_content" pour le thinking
                    const delta = chunk.choices[0].delta;
                    const thinkingContent = delta.reasoning_content;
                    if (thinkingContent) {
                        yield {
                            type: "thinking",
                            content: thinkingContent,
                        };
                    }
                    // Stream content as it comes
                    if (chunk.choices[0].delta?.content) {
                        accumulatedContent += chunk.choices[0].delta.content;
                        // Update token count in real-time including accumulated content and any tool calls
                        const currentOutputTokens = this.tokenCounter.estimateStreamingTokens(accumulatedContent) +
                            (accumulatedMessage.tool_calls
                                ? this.tokenCounter.countTokens(JSON.stringify(accumulatedMessage.tool_calls))
                                : 0);
                        totalOutputTokens = currentOutputTokens;
                        yield {
                            type: "content",
                            content: chunk.choices[0].delta.content,
                        };
                        // Emit token count update
                        const now = Date.now();
                        if (now - lastTokenUpdate > 250) {
                            lastTokenUpdate = now;
                            yield {
                                type: "token_count",
                                tokenCount: inputTokens + totalOutputTokens,
                            };
                        }
                    }
                }
                // Add assistant entry to history
                const assistantEntry = {
                    type: "assistant",
                    content: accumulatedMessage.content || "Using tools to help you...",
                    timestamp: new Date(),
                    toolCalls: accumulatedMessage.tool_calls || undefined,
                };
                this.chatHistory.push(assistantEntry);
                // Add accumulated message to conversation
                this.messages.push({
                    role: "assistant",
                    content: accumulatedMessage.content || "",
                    tool_calls: accumulatedMessage.tool_calls,
                });
                // Handle tool calls if present
                if (accumulatedMessage.tool_calls?.length > 0) {
                    toolRounds++;
                    metrics.recordToolRound();
                    // Only yield tool_calls if we haven't already yielded them during streaming
                    if (!toolCallsYielded) {
                        yield {
                            type: "tool_calls",
                            toolCalls: accumulatedMessage.tool_calls,
                        };
                    }
                    // Execute tools
                    for (const toolCall of accumulatedMessage.tool_calls) {
                        // Check for cancellation before executing each tool
                        if (this.abortController?.signal.aborted) {
                            yield {
                                type: "content",
                                content: "\n\n[Operation cancelled by user]",
                            };
                            yield { type: "done" };
                            metrics.endTask(false);
                            return;
                        }
                        const result = await this.executeTool(toolCall);
                        // Record tool call metrics
                        metrics.recordToolCall(toolCall.function.name, result.success);
                        const toolResultEntry = {
                            type: "tool_result",
                            content: result.success
                                ? result.output || "Success"
                                : result.error || "Error occurred",
                            timestamp: new Date(),
                            toolCall: toolCall,
                            toolResult: result,
                        };
                        this.chatHistory.push(toolResultEntry);
                        yield {
                            type: "tool_result",
                            toolCall,
                            toolResult: result,
                        };
                        // Add tool result with proper format (needed for AI context)
                        this.messages.push({
                            role: "tool",
                            content: result.success
                                ? result.output || "Success"
                                : result.error || "Error",
                            tool_call_id: toolCall.id,
                        });
                    }
                    // Update token count after processing all tool calls to include tool results
                    inputTokens = this.tokenCounter.countMessageTokens(this.messages);
                    // Final token update after tools processed
                    yield {
                        type: "token_count",
                        tokenCount: inputTokens + totalOutputTokens,
                    };
                    // Continue the loop to get the next response (which might have more tool calls)
                }
                else {
                    // No tool calls, we're done
                    break;
                }
            }
            if (toolRounds >= maxToolRounds) {
                yield {
                    type: "content",
                    content: "\n\nMaximum tool execution rounds reached. Stopping to prevent infinite loops.",
                };
            }
            // Record final token usage and complete task
            metrics.recordTokens(inputTokens, totalOutputTokens);
            metrics.endTask(true);
            yield { type: "done" };
        }
        catch (error) {
            // Check if this was a cancellation
            if (this.abortController?.signal.aborted) {
                yield {
                    type: "content",
                    content: "\n\n[Operation cancelled by user]",
                };
                yield { type: "done" };
                metrics.endTask(false);
                return;
            }
            const errorMessage = ErrorHandler.handle(error);
            const errorEntry = {
                type: "assistant",
                content: `Sorry, I encountered an error:\n\n${errorMessage}`,
                timestamp: new Date(),
            };
            this.chatHistory.push(errorEntry);
            yield {
                type: "content",
                content: errorEntry.content,
            };
            // Log error for debugging
            ErrorHandler.log(error);
            // End task with error
            metrics.endTask(false);
            yield { type: "done" };
        }
        finally {
            // Clean up abort controller
            this.abortController = null;
        }
    }
    async executeTool(toolCall) {
        try {
            const args = JSON.parse(toolCall.function.arguments);
            switch (toolCall.function.name) {
                case "view_file":
                    const range = args.start_line && args.end_line
                        ? [args.start_line, args.end_line]
                        : undefined;
                    return await this.textEditor.view(args.path, range);
                case "create_file":
                    return await this.textEditor.create(args.path, args.content);
                case "str_replace_editor":
                    return await this.textEditor.strReplace(args.path, args.old_str, args.new_str, args.replace_all);
                case "edit_file":
                    if (!this.morphEditor) {
                        return {
                            success: false,
                            error: "Morph Fast Apply not available. Please set MORPH_API_KEY environment variable to use this feature.",
                        };
                    }
                    return await this.morphEditor.editFile(args.target_file, args.instructions, args.code_edit);
                case "bash":
                    return await this.bash.execute(args.command);
                case "create_todo_list":
                    return await this.todoTool.createTodoList(args.todos);
                case "update_todo_list":
                    return await this.todoTool.updateTodoList(args.updates);
                case "search":
                    return await this.search.search(args.query, {
                        searchType: args.search_type,
                        includePattern: args.include_pattern,
                        excludePattern: args.exclude_pattern,
                        caseSensitive: args.case_sensitive,
                        wholeWord: args.whole_word,
                        regex: args.regex,
                        maxResults: args.max_results,
                        fileTypes: args.file_types,
                        includeHidden: args.include_hidden,
                    });
                case "batch_edit":
                    return await this.batchEditor.batchEdit({
                        type: args.type,
                        files: args.files,
                        pattern: args.pattern,
                        searchType: args.search_type,
                        includePattern: args.include_pattern,
                        excludePattern: args.exclude_pattern,
                        params: args.params,
                    });
                default:
                    // Check if this is an MCP tool
                    if (toolCall.function.name.startsWith("mcp__")) {
                        return await this.executeMCPTool(toolCall);
                    }
                    return {
                        success: false,
                        error: `Unknown tool: ${toolCall.function.name}`,
                    };
            }
        }
        catch (error) {
            // Create a typed error for tool execution failures
            const toolError = new ToolExecutionError(toolCall.function.name, error.message, { arguments: toolCall.function.arguments }, error);
            // Log the error for debugging
            ErrorHandler.log(toolError);
            return {
                success: false,
                error: ErrorHandler.toSimpleMessage(toolError),
            };
        }
    }
    async executeMCPTool(toolCall) {
        try {
            const args = JSON.parse(toolCall.function.arguments);
            const mcpManager = getMCPManager();
            const result = await mcpManager.callTool(toolCall.function.name, args);
            if (result.isError) {
                return {
                    success: false,
                    error: result.content[0]?.text || "MCP tool error",
                };
            }
            // Extract content from result
            const output = result.content
                .map((item) => {
                if (item.type === "text") {
                    return item.text;
                }
                else if (item.type === "resource") {
                    return `Resource: ${item.resource?.uri || "Unknown"}`;
                }
                return String(item);
            })
                .join("\n");
            return {
                success: true,
                output: output || "Success",
            };
        }
        catch (error) {
            return {
                success: false,
                error: `MCP tool execution error: ${error.message}`,
            };
        }
    }
    getChatHistory() {
        return [...this.chatHistory];
    }
    getCurrentDirectory() {
        return this.bash.getCurrentDirectory();
    }
    async executeBashCommand(command) {
        return await this.bash.execute(command);
    }
    getCurrentModel() {
        return this.zaiClient.getCurrentModel();
    }
    setModel(model) {
        this.zaiClient.setModel(model);
        // Update token counter for new model
        this.tokenCounter.dispose();
        this.tokenCounter = createTokenCounter(model);
    }
    getClient() {
        return this.zaiClient;
    }
    abortCurrentOperation() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }
    /**
     * Returns the current context summary if context has been compressed
     */
    getContextSummary() {
        return this.contextSummary;
    }
}
//# sourceMappingURL=zai-agent.js.map