import { useState, useMemo, useEffect } from "react";
import { useInput } from "ink";
import { ConfirmationService } from "../utils/confirmation-service.js";
import { useEnhancedInput } from "./use-enhanced-input.js";
import { filterCommandSuggestions } from "../ui/components/command-suggestions.js";
import { loadModelConfig, updateCurrentModel } from "../utils/model-config.js";
import { getSessionManager } from "../utils/session-manager.js";
import { getFileWatcher } from "../utils/file-watcher.js";
export function useInputHandler({ agent, chatHistory, setChatHistory, setIsProcessing, setIsStreaming, setTokenCount, setProcessingTime, processingStartTime, isProcessing, isStreaming, isConfirmationActive = false, setShowThinking, setThinkingContent, }) {
    const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
    const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
    const [showModelSelection, setShowModelSelection] = useState(false);
    const [selectedModelIndex, setSelectedModelIndex] = useState(0);
    const [waitingForClearConfirmation, setWaitingForClearConfirmation] = useState(false);
    const [showThinking, setShowThinkingState] = useState(() => {
        // Initialiser avec l'état actuel du client
        const thinkingEnabled = agent.getClient().getThinkingEnabled();
        return thinkingEnabled;
    });
    const [autoEditEnabled, setAutoEditEnabled] = useState(() => {
        const confirmationService = ConfirmationService.getInstance();
        const sessionFlags = confirmationService.getSessionFlags();
        return sessionFlags.allOperations;
    });
    const handleSpecialKey = (key) => {
        // Don't handle input if confirmation dialog is active
        if (isConfirmationActive) {
            return true; // Prevent default handling
        }
        // Handle shift+tab to toggle auto-edit mode
        if (key.shift && key.tab) {
            const newAutoEditState = !autoEditEnabled;
            setAutoEditEnabled(newAutoEditState);
            const confirmationService = ConfirmationService.getInstance();
            if (newAutoEditState) {
                // Enable auto-edit: set all operations to be accepted
                confirmationService.setSessionFlag("allOperations", true);
            }
            else {
                // Disable auto-edit: reset session flags
                confirmationService.resetSession();
            }
            return true; // Handled
        }
        // Handle escape key for closing menus
        if (key.escape) {
            if (showCommandSuggestions) {
                setShowCommandSuggestions(false);
                setSelectedCommandIndex(0);
                return true;
            }
            if (showModelSelection) {
                setShowModelSelection(false);
                setSelectedModelIndex(0);
                return true;
            }
            if (isProcessing || isStreaming) {
                agent.abortCurrentOperation();
                setIsProcessing(false);
                setIsStreaming(false);
                setTokenCount(0);
                setProcessingTime(0);
                processingStartTime.current = 0;
                return true;
            }
            return false; // Let default escape handling work
        }
        // Handle command suggestions navigation
        if (showCommandSuggestions) {
            const filteredSuggestions = filterCommandSuggestions(commandSuggestions, input);
            if (filteredSuggestions.length === 0) {
                setShowCommandSuggestions(false);
                setSelectedCommandIndex(0);
                return false; // Continue processing
            }
            else {
                if (key.upArrow) {
                    setSelectedCommandIndex((prev) => prev === 0 ? filteredSuggestions.length - 1 : prev - 1);
                    return true;
                }
                if (key.downArrow) {
                    setSelectedCommandIndex((prev) => (prev + 1) % filteredSuggestions.length);
                    return true;
                }
                if (key.tab || key.return) {
                    const safeIndex = Math.min(selectedCommandIndex, filteredSuggestions.length - 1);
                    const selectedCommand = filteredSuggestions[safeIndex];
                    const newInput = selectedCommand.command + " ";
                    setInput(newInput);
                    setCursorPosition(newInput.length);
                    setShowCommandSuggestions(false);
                    setSelectedCommandIndex(0);
                    return true;
                }
            }
        }
        // Handle model selection navigation
        if (showModelSelection) {
            if (key.upArrow) {
                setSelectedModelIndex((prev) => prev === 0 ? availableModels.length - 1 : prev - 1);
                return true;
            }
            if (key.downArrow) {
                setSelectedModelIndex((prev) => (prev + 1) % availableModels.length);
                return true;
            }
            if (key.tab || key.return) {
                const selectedModel = availableModels[selectedModelIndex];
                agent.setModel(selectedModel.model);
                updateCurrentModel(selectedModel.model);
                const confirmEntry = {
                    type: "assistant",
                    content: `✓ Switched to model: ${selectedModel.model}`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, confirmEntry]);
                setShowModelSelection(false);
                setSelectedModelIndex(0);
                return true;
            }
        }
        return false; // Let default handling proceed
    };
    const handleInputSubmit = async (userInput) => {
        if (userInput === "exit" || userInput === "quit") {
            process.exit(0);
            return;
        }
        // Handle clear confirmation
        if (waitingForClearConfirmation) {
            if (userInput.trim().toLowerCase() === "yes") {
                // Reset chat history
                setChatHistory([]);
                // Reset processing states
                setIsProcessing(false);
                setIsStreaming(false);
                setTokenCount(0);
                setProcessingTime(0);
                processingStartTime.current = 0;
                // Reset confirmation service session flags
                const confirmationService = ConfirmationService.getInstance();
                confirmationService.resetSession();
                // Add confirmation message
                const confirmEntry = {
                    type: "assistant",
                    content: "✅ Chat history cleared successfully.",
                    timestamp: new Date(),
                };
                setChatHistory([confirmEntry]);
            }
            else {
                // User cancelled
                const cancelEntry = {
                    type: "assistant",
                    content: "❌ Clear cancelled. Chat history preserved.",
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, cancelEntry]);
            }
            setWaitingForClearConfirmation(false);
            clearInput();
            resetHistory();
            return;
        }
        if (userInput.trim()) {
            const directCommandResult = await handleDirectCommand(userInput);
            if (!directCommandResult) {
                await processUserMessage(userInput);
            }
        }
    };
    const handleInputChange = (newInput) => {
        // Update command suggestions based on input
        if (newInput.startsWith("/")) {
            setShowCommandSuggestions(true);
            setSelectedCommandIndex(0);
        }
        else {
            setShowCommandSuggestions(false);
            setSelectedCommandIndex(0);
        }
    };
    // Fonction pour résumer les résultats des outils
    const summarizeToolResult = (toolCall, toolResult) => {
        const toolName = toolCall?.function?.name;
        if (!toolResult.success) {
            return toolResult.error || "Error occurred";
        }
        // view_file : masquer le contenu des fichiers
        if (toolName === "view_file") {
            const output = toolResult.output || "";
            const lines = output.split("\n");
            const lineCountMatch = output.match(/\+(\d+) lines/);
            const totalLinesMatch = output.match(/Lines (\d+)-(\d+)/);
            let fileInfo = "";
            try {
                const args = JSON.parse(toolCall.function.arguments);
                fileInfo = args.path || "unknown file";
            }
            catch {
                fileInfo = "file";
            }
            if (lineCountMatch) {
                const additionalLines = parseInt(lineCountMatch[1]);
                return `✓ Read ${fileInfo} (${10 + additionalLines} lines)`;
            }
            else if (totalLinesMatch) {
                const start = parseInt(totalLinesMatch[1]);
                const end = parseInt(totalLinesMatch[2]);
                return `✓ Read ${fileInfo} (lines ${start}-${end})`;
            }
            else {
                const lineCount = lines.length - 1;
                return `✓ Read ${fileInfo} (${lineCount} lines)`;
            }
        }
        // bash : résumer les commandes longues
        if (toolName === "bash") {
            let command = "";
            try {
                const args = JSON.parse(toolCall.function.arguments);
                command = args.command || "command";
            }
            catch {
                command = "command";
            }
            // Si la commande est longue, la tronquer
            const maxLength = 60;
            const displayCommand = command.length > maxLength
                ? command.substring(0, maxLength) + "..."
                : command;
            // Si l'output est très long, le résumer
            const output = toolResult.output || "";
            if (output.length > 500) {
                const lines = output.split("\n");
                return `✓ ${displayCommand}\n${lines.slice(0, 5).join("\n")}\n... (${lines.length - 5} more lines)`;
            }
            return `✓ ${displayCommand}\n${output}`;
        }
        // search : résumer les résultats
        if (toolName === "search") {
            const output = toolResult.output || "";
            const lines = output.split("\n");
            // Compter les fichiers trouvés
            const fileMatches = output.match(/Found in: (.+)/g);
            const fileCount = fileMatches ? fileMatches.length : 0;
            // Compter les matches totaux
            const matchLines = lines.filter(line => line.trim() && !line.startsWith("Found in:"));
            return `✓ Search complete: ${fileCount} files, ${matchLines.length} matches`;
        }
        // create_file : résumer la création
        if (toolName === "create_file") {
            let filename = "";
            try {
                const args = JSON.parse(toolCall.function.arguments);
                filename = args.path || "file";
            }
            catch {
                filename = "file";
            }
            return `✓ Created ${filename}`;
        }
        // str_replace_editor : garder le diff mais indiquer les modifications
        if (toolName === "str_replace_editor") {
            const output = toolResult.output || "";
            const additionsMatch = output.match(/(\d+) addition/);
            const removalsMatch = output.match(/(\d+) removal/);
            let filename = "";
            try {
                const args = JSON.parse(toolCall.function.arguments);
                filename = args.path || "file";
            }
            catch {
                filename = "file";
            }
            const additions = additionsMatch ? parseInt(additionsMatch[1]) : 0;
            const removals = removalsMatch ? parseInt(removalsMatch[1]) : 0;
            return `✓ Edited ${filename} (+${additions}, -${removals})`;
        }
        // edit_file (morph editor) : résumer
        if (toolName === "edit_file") {
            let filename = "";
            try {
                const args = JSON.parse(toolCall.function.arguments);
                filename = args.target_file || "file";
            }
            catch {
                filename = "file";
            }
            return `✓ Fast-edited ${filename} with Morph`;
        }
        // create_todo_list et update_todo_list : résumer
        if (toolName === "create_todo_list") {
            let todoCount = 0;
            try {
                const args = JSON.parse(toolCall.function.arguments);
                todoCount = args.todos?.length || 0;
            }
            catch {
                todoCount = 0;
            }
            return `✓ Created todo list with ${todoCount} items`;
        }
        if (toolName === "update_todo_list") {
            return `✓ Updated todo list`;
        }
        // Pour les autres outils, retourner le contenu normal
        return toolResult.output || "Success";
    };
    const { input, cursorPosition, setInput, setCursorPosition, clearInput, resetHistory, handleInput, isHistorySearchActive, historySearchQuery, historySearchResults, historySearchIndex, } = useEnhancedInput({
        onSubmit: handleInputSubmit,
        onSpecialKey: handleSpecialKey,
        disabled: isConfirmationActive,
    });
    // Hook up the actual input handling
    useInput((inputChar, key) => {
        // Handle Ctrl+S to quick save session
        if (inputChar === '\u0013') { // Ctrl+S
            const sessionName = `autosave-${new Date().toISOString()}`;
            const sessionManager = getSessionManager();
            sessionManager.saveSession(sessionName, chatHistory, {
                workingDirectory: agent.getCurrentDirectory(),
                model: agent.getCurrentModel(),
            }, 'Auto-saved session');
            const saveEntry = {
                type: "assistant",
                content: `💾 Session auto-saved as: ${sessionName}`,
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, saveEntry]);
            return;
        }
        // Handle 'T' or 't' key to toggle thinking panel when input is empty
        if ((inputChar === 't' || inputChar === 'T') &&
            input === '' &&
            !showCommandSuggestions &&
            !showModelSelection &&
            !isConfirmationActive &&
            !isProcessing &&
            !isStreaming) {
            const currentThinking = agent.getClient().getThinkingEnabled();
            const newShowThinking = !currentThinking;
            setShowThinkingState(newShowThinking);
            // Enable/disable thinking in the agent
            agent.getClient().setThinkingEnabled(newShowThinking);
            // Notify parent component if callback provided
            if (setShowThinking) {
                setShowThinking(newShowThinking);
            }
            // Add status message to chat with clearer feedback
            const statusEntry = {
                type: "assistant",
                content: `${newShowThinking ? '💭' : '💤'} Thinking mode ${newShowThinking ? 'enabled' : 'disabled'}${newShowThinking ? '. The model will now show its reasoning process.' : '. Reasoning will be hidden.'}`,
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, statusEntry]);
            return; // Don't process this as regular input
        }
        handleInput(inputChar, key);
    });
    // Update command suggestions when input changes
    useEffect(() => {
        handleInputChange(input);
    }, [input]);
    const commandSuggestions = [
        { command: "/help", description: "Show help information" },
        { command: "/clear", description: "Clear chat history" },
        { command: "/save", description: "Save current session" },
        { command: "/load", description: "Load a saved session" },
        { command: "/sessions", description: "List all sessions" },
        { command: "/models", description: "Switch ZAI Model" },
        { command: "/settings", description: "Open settings panel" },
        { command: "/config", description: "Open settings panel" },
        { command: "/commit-and-push", description: "AI commit & push to remote" },
        { command: "/watch", description: "Toggle file watching on/off" },
        { command: "/exit", description: "Exit the application" },
    ];
    // Load models from configuration with fallback to defaults
    const availableModels = useMemo(() => {
        return loadModelConfig(); // Return directly, interface already matches
    }, []);
    const handleDirectCommand = async (input) => {
        const trimmedInput = input.trim();
        if (trimmedInput === "/clear") {
            // Ask for confirmation before clearing
            const confirmEntry = {
                type: "assistant",
                content: "⚠️ Are you sure you want to clear the chat history? This cannot be undone.\n\nType 'yes' to confirm or any other key to cancel.",
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, confirmEntry]);
            // Set a flag to wait for confirmation
            setWaitingForClearConfirmation(true);
            clearInput();
            return true;
        }
        if (trimmedInput === "/undo") {
            // Show list of recent backups and allow undo
            const { BackupManager } = await import("../utils/backup-manager.js");
            const backupManager = BackupManager.getInstance();
            const helpEntry = {
                type: "assistant",
                content: `🔄 Undo functionality:

To undo a file change, use:
  /undo <filepath>

This will restore the most recent backup of the file.

Example:
  /undo src/index.ts

To see available backups for a file:
  /backups <filepath>`,
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, helpEntry]);
            clearInput();
            return true;
        }
        // Handle /undo <filepath>
        if (trimmedInput.startsWith("/undo ")) {
            const filePath = trimmedInput.substring(6).trim();
            if (!filePath) {
                const errorEntry = {
                    type: "assistant",
                    content: "❌ Please specify a file path: /undo <filepath>",
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, errorEntry]);
                clearInput();
                return true;
            }
            try {
                const { BackupManager } = await import("../utils/backup-manager.js");
                const backupManager = BackupManager.getInstance();
                const success = await backupManager.restoreBackup(filePath);
                const resultEntry = {
                    type: "assistant",
                    content: success
                        ? `✅ File restored from backup: ${filePath}`
                        : `❌ No backup found for: ${filePath}`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, resultEntry]);
            }
            catch (error) {
                const errorEntry = {
                    type: "assistant",
                    content: `❌ Failed to restore file: ${error.message}`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, errorEntry]);
            }
            clearInput();
            return true;
        }
        if (trimmedInput === "/help") {
            const helpEntry = {
                type: "assistant",
                content: `ZAI CLI Help:

Built-in Commands:
  /clear      - Clear chat history (requires confirmation)
  /undo       - Undo last file change
  /undo <file> - Restore specific file from backup
  /help       - Show this help
  /save       - Save current session
  /load       - Load a saved session
  /sessions   - List all saved sessions
  /models     - Switch between available models
  /settings   - Open settings panel (API key, base URL, model)
  /config     - Alias for /settings
  /watch      - Toggle file watching on/off
  /exit       - Exit application
  exit, quit  - Exit application

Agent System:
  /agents              - List all available specialized agents
  /task <type> <desc>  - Create and execute an agent task
  /tasks               - View all agent tasks and their status

  Available agent types:
    - code-reviewer: Review code for quality and bugs
    - test-writer: Write comprehensive tests
    - documentation: Create technical documentation
    - refactoring: Refactor code for better structure
    - debugging: Diagnose and fix bugs
    - security-audit: Audit code for vulnerabilities
    - performance-optimizer: Optimize code performance
    - explore: Explore and understand codebases
    - plan: Create detailed implementation plans

Session Management:
  /save <name> [description]  - Save current session
  /load <name>                - Load a saved session
  /sessions                   - List all sessions
  Ctrl+S                      - Quick save session

Git Commands:
  /commit-and-push - AI-generated commit + push to remote

File Watching:
  --watch, -w    - Start ZAI with file watching enabled
  /watch         - Toggle file watching on/off

  When enabled, ZAI will notify you when files change in the working directory.
  Useful for keeping context in sync with external editor changes.

Enhanced Input Features:
  ↑/↓ Arrow   - Navigate command history
  Ctrl+R      - Search command history (fuzzy search)
  Ctrl+C      - Clear input (press twice to exit)
  Ctrl+←/→    - Move by word
  Ctrl+A/E    - Move to line start/end
  Ctrl+W      - Delete word before cursor
  Ctrl+K      - Delete to end of line
  Ctrl+U      - Delete to start of line
  Shift+Tab   - Toggle auto-edit mode (bypass confirmations)
  T           - Toggle thinking mode (show model reasoning)

Direct Commands (executed immediately):
  ls [path]   - List directory contents
  pwd         - Show current directory
  cd <path>   - Change directory
  cat <file>  - View file contents
  mkdir <dir> - Create directory
  touch <file>- Create empty file

Model Configuration:
  Edit ~/.zai/models.json to add custom models (Claude, GPT, Gemini, etc.)

CLI Commands:
  zai sessions                - List all saved sessions
  zai load-session <name>     - Load and start session
  zai delete-session <name>   - Delete a session
  zai export-session <name>   - Export session to markdown

For complex operations, just describe what you want in natural language.
Examples:
  "edit package.json and add a new script"
  "create a new React component called Header"
  "show me all TypeScript files in this project"`,
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, helpEntry]);
            clearInput();
            return true;
        }
        // Agent system commands
        if (trimmedInput === "/agents") {
            const { AGENT_CAPABILITIES } = await import("../agents/agent-types.js");
            let agentsList = "🤖 Available Specialized Agents:\n\n";
            Object.entries(AGENT_CAPABILITIES).forEach(([type, capability]) => {
                agentsList += `**${capability.name}** (${type})\n`;
                agentsList += `  ${capability.description}\n`;
                agentsList += `  Tools: ${capability.tools.join(', ')}\n\n`;
            });
            agentsList += "\nUsage:\n";
            agentsList += "  /task <agent-type> <description>\n";
            agentsList += "  Example: /task code-reviewer Review the authentication module\n";
            const helpEntry = {
                type: "assistant",
                content: agentsList,
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, helpEntry]);
            clearInput();
            return true;
        }
        if (trimmedInput.startsWith("/task ")) {
            const parts = trimmedInput.substring(6).trim().split(' ');
            const agentType = parts[0];
            const taskDescription = parts.slice(1).join(' ');
            if (!agentType || !taskDescription) {
                const errorEntry = {
                    type: "assistant",
                    content: "❌ Usage: /task <agent-type> <description>\n\nExample: /task code-reviewer Review authentication module\n\nUse /agents to see available agent types.",
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, errorEntry]);
                clearInput();
                return true;
            }
            try {
                const { getTaskOrchestrator } = await import("../agents/task-orchestrator.js");
                const { AGENT_CAPABILITIES } = await import("../agents/agent-types.js");
                // Validate agent type
                if (!AGENT_CAPABILITIES[agentType]) {
                    const errorEntry = {
                        type: "assistant",
                        content: `❌ Unknown agent type: ${agentType}\n\nUse /agents to see available types.`,
                        timestamp: new Date(),
                    };
                    setChatHistory((prev) => [...prev, errorEntry]);
                    clearInput();
                    return true;
                }
                const orchestrator = getTaskOrchestrator();
                const task = orchestrator.createTask(agentType, taskDescription, taskDescription);
                const statusEntry = {
                    type: "assistant",
                    content: `✅ Task created with ID: ${task.id}\n\nAgent: ${AGENT_CAPABILITIES[agentType].name}\nTask: ${taskDescription}\n\nExecuting...`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, statusEntry]);
                // Execute task asynchronously
                orchestrator.executeTask(task.id, agent).then((result) => {
                    const resultEntry = {
                        type: "assistant",
                        content: result.success
                            ? `✅ Task completed!\n\n${result.output}\n\n---\nDuration: ${result.metadata?.duration}ms | Tools used: ${result.metadata?.toolsUsed?.join(', ') || 'none'}`
                            : `❌ Task failed: ${result.metadata?.error || 'Unknown error'}`,
                        timestamp: new Date(),
                    };
                    setChatHistory((prev) => [...prev, resultEntry]);
                });
            }
            catch (error) {
                const errorEntry = {
                    type: "assistant",
                    content: `❌ Failed to create task: ${error.message}`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, errorEntry]);
            }
            clearInput();
            return true;
        }
        if (trimmedInput === "/tasks") {
            try {
                const { getTaskOrchestrator } = await import("../agents/task-orchestrator.js");
                const orchestrator = getTaskOrchestrator();
                const stats = orchestrator.getStatistics();
                const allTasks = orchestrator.getAllTasks();
                let tasksList = "📋 Agent Tasks Overview:\n\n";
                tasksList += `Total: ${stats.total} | Pending: ${stats.pending} | Running: ${stats.running} | Completed: ${stats.completed} | Failed: ${stats.failed}\n\n`;
                if (allTasks.length === 0) {
                    tasksList += "No tasks yet. Use /task to create one.\n";
                }
                else {
                    // Show recent tasks (last 5)
                    const recentTasks = allTasks.slice(-5).reverse();
                    tasksList += "Recent tasks:\n\n";
                    recentTasks.forEach(task => {
                        const duration = task.completedAt && task.startedAt
                            ? `${task.completedAt.getTime() - task.startedAt.getTime()}ms`
                            : 'N/A';
                        tasksList += `[${task.status}] ${task.type}: ${task.description}\n`;
                        tasksList += `  ID: ${task.id.substring(0, 8)}... | Duration: ${duration}\n\n`;
                    });
                }
                const statusEntry = {
                    type: "assistant",
                    content: tasksList,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, statusEntry]);
            }
            catch (error) {
                const errorEntry = {
                    type: "assistant",
                    content: `❌ Failed to get tasks: ${error.message}`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, errorEntry]);
            }
            clearInput();
            return true;
        }
        if (trimmedInput === "/exit") {
            process.exit(0);
            return true;
        }
        if (trimmedInput === "/settings" || trimmedInput === "/config") {
            const settingsEntry = {
                type: "assistant",
                content: `⚙️  Settings Panel

To access the full settings panel, run this command in a new terminal:
  $ zai config

Available settings:
  • API Key - Your Z.ai API key
  • Base URL - API endpoint (default: https://api.z.ai/api/paas/v4)
  • Default Model - Choose between glm-4.6, glm-4.5, glm-4.5-air

Quick commands from here:
  • /models - Switch model in current session
  • Use 'zai config --show' to view current configuration
  • Use 'zai config --set-key <key>' to update API key
  • Use 'zai config --set-url <url>' to update base URL`,
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, settingsEntry]);
            clearInput();
            return true;
        }
        if (trimmedInput === "/models") {
            setShowModelSelection(true);
            setSelectedModelIndex(0);
            clearInput();
            return true;
        }
        if (trimmedInput.startsWith("/models ")) {
            const modelArg = trimmedInput.split(" ")[1];
            const modelNames = availableModels.map((m) => m.model);
            if (modelNames.includes(modelArg)) {
                agent.setModel(modelArg);
                updateCurrentModel(modelArg); // Update project current model
                const confirmEntry = {
                    type: "assistant",
                    content: `✓ Switched to model: ${modelArg}`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, confirmEntry]);
            }
            else {
                const errorEntry = {
                    type: "assistant",
                    content: `Invalid model: ${modelArg}

Available models: ${modelNames.join(", ")}`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, errorEntry]);
            }
            clearInput();
            return true;
        }
        // Handle /watch command
        if (trimmedInput === "/watch") {
            const watcher = getFileWatcher();
            if (watcher.isActive()) {
                watcher.stop();
                const entry = {
                    type: "assistant",
                    content: "File watching stopped",
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, entry]);
            }
            else {
                watcher.start(agent.getCurrentDirectory());
                const entry = {
                    type: "assistant",
                    content: `File watching started for: ${agent.getCurrentDirectory()}`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, entry]);
            }
            clearInput();
            return true;
        }
        // Handle /save command
        if (trimmedInput.startsWith("/save")) {
            const parts = trimmedInput.split(" ");
            const sessionName = parts[1] || `session-${new Date().toISOString().split('T')[0]}`;
            const description = parts.slice(2).join(" ") || undefined;
            const sessionManager = getSessionManager();
            sessionManager.saveSession(sessionName, chatHistory, {
                workingDirectory: agent.getCurrentDirectory(),
                model: agent.getCurrentModel(),
            }, description);
            const saveEntry = {
                type: "assistant",
                content: `✅ Session saved as: ${sessionName}`,
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, saveEntry]);
            clearInput();
            return true;
        }
        // Handle /load command
        if (trimmedInput.startsWith("/load")) {
            const sessionName = trimmedInput.split(" ")[1];
            if (!sessionName) {
                const errorEntry = {
                    type: "assistant",
                    content: "Usage: /load <session-name>",
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, errorEntry]);
                clearInput();
                return true;
            }
            const sessionManager = getSessionManager();
            const sessionData = sessionManager.loadSession(sessionName);
            if (!sessionData) {
                const errorEntry = {
                    type: "assistant",
                    content: `❌ Session not found: ${sessionName}`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, errorEntry]);
                clearInput();
                return true;
            }
            // Load the session
            setChatHistory(sessionData.chatHistory);
            const successEntry = {
                type: "assistant",
                content: `✅ Loaded session: ${sessionData.metadata.name} (${sessionData.metadata.messageCount} messages)`,
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, successEntry]);
            clearInput();
            return true;
        }
        // Handle /sessions command
        if (trimmedInput === "/sessions") {
            const sessionManager = getSessionManager();
            const sessions = sessionManager.listSessions();
            let sessionsText = "Saved Sessions:\n\n";
            if (sessions.length === 0) {
                sessionsText += "No saved sessions found.\n";
            }
            else {
                sessions.forEach((session) => {
                    sessionsText += `  ${session.name}\n`;
                    sessionsText += `    Created: ${session.created.toLocaleString()}\n`;
                    sessionsText += `    Messages: ${session.messageCount}\n`;
                    sessionsText += `    Model: ${session.model}\n`;
                    if (session.description) {
                        sessionsText += `    Description: ${session.description}\n`;
                    }
                    sessionsText += "\n";
                });
            }
            const listEntry = {
                type: "assistant",
                content: sessionsText,
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, listEntry]);
            clearInput();
            return true;
        }
        if (trimmedInput === "/commit-and-push") {
            const userEntry = {
                type: "user",
                content: "/commit-and-push",
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, userEntry]);
            setIsProcessing(true);
            setIsStreaming(true);
            try {
                // First check if there are any changes at all
                const initialStatusResult = await agent.executeBashCommand("git status --porcelain");
                if (!initialStatusResult.success ||
                    !initialStatusResult.output?.trim()) {
                    const noChangesEntry = {
                        type: "assistant",
                        content: "No changes to commit. Working directory is clean.",
                        timestamp: new Date(),
                    };
                    setChatHistory((prev) => [...prev, noChangesEntry]);
                    setIsProcessing(false);
                    setIsStreaming(false);
                    setInput("");
                    return true;
                }
                // Add all changes
                const addResult = await agent.executeBashCommand("git add .");
                if (!addResult.success) {
                    const addErrorEntry = {
                        type: "assistant",
                        content: `Failed to stage changes: ${addResult.error || "Unknown error"}`,
                        timestamp: new Date(),
                    };
                    setChatHistory((prev) => [...prev, addErrorEntry]);
                    setIsProcessing(false);
                    setIsStreaming(false);
                    setInput("");
                    return true;
                }
                // Show that changes were staged
                const addEntry = {
                    type: "tool_result",
                    content: "Changes staged successfully",
                    timestamp: new Date(),
                    toolCall: {
                        id: `git_add_${Date.now()}`,
                        type: "function",
                        function: {
                            name: "bash",
                            arguments: JSON.stringify({ command: "git add ." }),
                        },
                    },
                    toolResult: addResult,
                };
                setChatHistory((prev) => [...prev, addEntry]);
                // Get staged changes for commit message generation
                const diffResult = await agent.executeBashCommand("git diff --cached");
                // Generate commit message using AI
                const commitPrompt = `Generate a concise, professional git commit message for these changes:

Git Status:
${initialStatusResult.output}

Git Diff (staged changes):
${diffResult.output || "No staged changes shown"}

Follow conventional commit format (feat:, fix:, docs:, etc.) and keep it under 72 characters.
Respond with ONLY the commit message, no additional text.`;
                let commitMessage = "";
                let streamingEntry = null;
                for await (const chunk of agent.processUserMessageStream(commitPrompt)) {
                    if (chunk.type === "content" && chunk.content) {
                        if (!streamingEntry) {
                            const newEntry = {
                                type: "assistant",
                                content: `Generating commit message...\n\n${chunk.content}`,
                                timestamp: new Date(),
                                isStreaming: true,
                            };
                            setChatHistory((prev) => [...prev, newEntry]);
                            streamingEntry = newEntry;
                            commitMessage = chunk.content;
                        }
                        else {
                            commitMessage += chunk.content;
                            setChatHistory((prev) => prev.map((entry, idx) => idx === prev.length - 1 && entry.isStreaming
                                ? {
                                    ...entry,
                                    content: `Generating commit message...\n\n${commitMessage}`,
                                }
                                : entry));
                        }
                    }
                    else if (chunk.type === "done") {
                        if (streamingEntry) {
                            setChatHistory((prev) => prev.map((entry) => entry.isStreaming
                                ? {
                                    ...entry,
                                    content: `Generated commit message: "${commitMessage.trim()}"`,
                                    isStreaming: false,
                                }
                                : entry));
                        }
                        break;
                    }
                }
                // Execute the commit
                const cleanCommitMessage = commitMessage
                    .trim()
                    .replace(/^["']|["']$/g, "");
                const commitCommand = `git commit -m "${cleanCommitMessage}"`;
                const commitResult = await agent.executeBashCommand(commitCommand);
                const commitEntry = {
                    type: "tool_result",
                    content: commitResult.success
                        ? commitResult.output || "Commit successful"
                        : commitResult.error || "Commit failed",
                    timestamp: new Date(),
                    toolCall: {
                        id: `git_commit_${Date.now()}`,
                        type: "function",
                        function: {
                            name: "bash",
                            arguments: JSON.stringify({ command: commitCommand }),
                        },
                    },
                    toolResult: commitResult,
                };
                setChatHistory((prev) => [...prev, commitEntry]);
                // If commit was successful, push to remote
                if (commitResult.success) {
                    // First try regular push, if it fails try with upstream setup
                    let pushResult = await agent.executeBashCommand("git push");
                    let pushCommand = "git push";
                    if (!pushResult.success &&
                        pushResult.error?.includes("no upstream branch")) {
                        pushCommand = "git push -u origin HEAD";
                        pushResult = await agent.executeBashCommand(pushCommand);
                    }
                    const pushEntry = {
                        type: "tool_result",
                        content: pushResult.success
                            ? pushResult.output || "Push successful"
                            : pushResult.error || "Push failed",
                        timestamp: new Date(),
                        toolCall: {
                            id: `git_push_${Date.now()}`,
                            type: "function",
                            function: {
                                name: "bash",
                                arguments: JSON.stringify({ command: pushCommand }),
                            },
                        },
                        toolResult: pushResult,
                    };
                    setChatHistory((prev) => [...prev, pushEntry]);
                }
            }
            catch (error) {
                const errorEntry = {
                    type: "assistant",
                    content: `Error during commit and push: ${error.message}`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, errorEntry]);
            }
            setIsProcessing(false);
            setIsStreaming(false);
            clearInput();
            return true;
        }
        const directBashCommands = [
            "ls",
            "pwd",
            "cd",
            "cat",
            "mkdir",
            "touch",
            "echo",
            "grep",
            "find",
            "cp",
            "mv",
            "rm",
        ];
        const firstWord = trimmedInput.split(" ")[0];
        if (directBashCommands.includes(firstWord)) {
            const userEntry = {
                type: "user",
                content: trimmedInput,
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, userEntry]);
            try {
                const result = await agent.executeBashCommand(trimmedInput);
                const commandEntry = {
                    type: "tool_result",
                    content: result.success
                        ? result.output || "Command completed"
                        : result.error || "Command failed",
                    timestamp: new Date(),
                    toolCall: {
                        id: `bash_${Date.now()}`,
                        type: "function",
                        function: {
                            name: "bash",
                            arguments: JSON.stringify({ command: trimmedInput }),
                        },
                    },
                    toolResult: result,
                };
                setChatHistory((prev) => [...prev, commandEntry]);
            }
            catch (error) {
                const errorEntry = {
                    type: "assistant",
                    content: `Error executing command: ${error.message}`,
                    timestamp: new Date(),
                };
                setChatHistory((prev) => [...prev, errorEntry]);
            }
            clearInput();
            return true;
        }
        return false;
    };
    const processUserMessage = async (userInput) => {
        const userEntry = {
            type: "user",
            content: userInput,
            timestamp: new Date(),
        };
        setChatHistory((prev) => [...prev, userEntry]);
        // Clear thinking content au début d'une nouvelle conversation
        if (setThinkingContent) {
            setThinkingContent("");
        }
        setIsProcessing(true);
        clearInput();
        try {
            setIsStreaming(true);
            let streamingEntry = null;
            let accumulatedThinking = "";
            let totalTools = 0;
            let completedTools = 0;
            for await (const chunk of agent.processUserMessageStream(userInput)) {
                switch (chunk.type) {
                    case "thinking":
                        if (chunk.content && setThinkingContent) {
                            accumulatedThinking += chunk.content;
                            setThinkingContent(accumulatedThinking);
                        }
                        break;
                    case "content":
                        if (chunk.content) {
                            if (!streamingEntry) {
                                const newStreamingEntry = {
                                    type: "assistant",
                                    content: chunk.content,
                                    timestamp: new Date(),
                                    isStreaming: true,
                                };
                                setChatHistory((prev) => [...prev, newStreamingEntry]);
                                streamingEntry = newStreamingEntry;
                            }
                            else {
                                setChatHistory((prev) => prev.map((entry, idx) => idx === prev.length - 1 && entry.isStreaming
                                    ? { ...entry, content: entry.content + chunk.content }
                                    : entry));
                            }
                        }
                        break;
                    case "token_count":
                        if (chunk.tokenCount !== undefined) {
                            setTokenCount(chunk.tokenCount);
                        }
                        break;
                    case "tool_calls":
                        if (chunk.toolCalls) {
                            // Stop streaming for the current assistant message
                            setChatHistory((prev) => prev.map((entry) => entry.isStreaming
                                ? {
                                    ...entry,
                                    isStreaming: false,
                                    toolCalls: chunk.toolCalls,
                                }
                                : entry));
                            streamingEntry = null;
                            // Initialiser le compteur d'outils
                            totalTools += chunk.toolCalls.length;
                            // Ajouter ou mettre à jour le message synthétique au thinking panel
                            if (setThinkingContent) {
                                setThinkingContent(prev => {
                                    const lines = prev.split('\n');
                                    const toolLineIndex = lines.findIndex(line => line.includes('🔧 Executing tools:'));
                                    if (toolLineIndex !== -1) {
                                        // Mettre à jour la ligne existante
                                        lines[toolLineIndex] = `🔧 Executing tools: ${completedTools}/${totalTools} completed`;
                                        return lines.join('\n');
                                    }
                                    else {
                                        // Créer la ligne si elle n'existe pas
                                        return `${prev}\n\n🔧 Executing tools: ${completedTools}/${totalTools} completed`;
                                    }
                                });
                            }
                            // Add individual tool call entries to show tools are being executed
                            chunk.toolCalls.forEach((toolCall) => {
                                const toolCallEntry = {
                                    type: "tool_call",
                                    content: "Executing...",
                                    timestamp: new Date(),
                                    toolCall: toolCall,
                                };
                                setChatHistory((prev) => [...prev, toolCallEntry]);
                            });
                        }
                        break;
                    case "tool_result":
                        if (chunk.toolCall && chunk.toolResult) {
                            // Incrémenter le compteur et mettre à jour la ligne
                            completedTools++;
                            if (setThinkingContent) {
                                setThinkingContent(prev => {
                                    // Remplacer la dernière ligne de compteur par la mise à jour
                                    const lines = prev.split('\n');
                                    const lastLineIndex = lines.findIndex(line => line.includes('🔧 Executing tools:'));
                                    if (lastLineIndex !== -1) {
                                        lines[lastLineIndex] = `🔧 Executing tools: ${completedTools}/${totalTools} completed`;
                                        return lines.join('\n');
                                    }
                                    return prev;
                                });
                            }
                            setChatHistory((prev) => prev.map((entry) => {
                                if (entry.isStreaming) {
                                    return { ...entry, isStreaming: false };
                                }
                                // Update the existing tool_call entry with the result
                                if (entry.type === "tool_call" &&
                                    entry.toolCall?.id === chunk.toolCall?.id) {
                                    return {
                                        ...entry,
                                        type: "tool_result",
                                        content: summarizeToolResult(chunk.toolCall, chunk.toolResult),
                                        toolResult: chunk.toolResult,
                                    };
                                }
                                return entry;
                            }));
                            streamingEntry = null;
                        }
                        break;
                    case "done":
                        if (streamingEntry) {
                            setChatHistory((prev) => prev.map((entry) => entry.isStreaming ? { ...entry, isStreaming: false } : entry));
                        }
                        setIsStreaming(false);
                        // Clear le thinking à la fin
                        if (setThinkingContent) {
                            setThinkingContent("");
                        }
                        break;
                }
            }
        }
        catch (error) {
            const errorEntry = {
                type: "assistant",
                content: `Error: ${error.message}`,
                timestamp: new Date(),
            };
            setChatHistory((prev) => [...prev, errorEntry]);
            setIsStreaming(false);
        }
        setIsProcessing(false);
        processingStartTime.current = 0;
    };
    return {
        input,
        cursorPosition,
        showCommandSuggestions,
        selectedCommandIndex,
        showModelSelection,
        selectedModelIndex,
        commandSuggestions,
        availableModels,
        agent,
        autoEditEnabled,
        showThinking,
        isHistorySearchActive,
        historySearchQuery,
        historySearchResults,
        historySearchIndex,
    };
}
//# sourceMappingURL=use-input-handler.js.map