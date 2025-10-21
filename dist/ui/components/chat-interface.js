import React, { useState, useEffect, useRef } from "react";
import { Box, Text } from "ink";
import { useInputHandler } from "../../hooks/use-input-handler.js";
import { LoadingSpinner } from "./loading-spinner.js";
import { CommandSuggestions } from "./command-suggestions.js";
import { ModelSelection } from "./model-selection.js";
import { ChatHistory } from "./chat-history.js";
import { ChatInput } from "./chat-input.js";
import { MCPStatus } from "./mcp-status.js";
import ThinkingPanel from "./thinking-panel.js";
import ConfirmationDialog from "./confirmation-dialog.js";
import { ConfirmationService, } from "../../utils/confirmation-service.js";
import ApiKeyInput from "./api-key-input.js";
import cfonts from "cfonts";
import { getFileWatcher } from "../../utils/file-watcher.js";
import FileWatcherIndicator from "./file-watcher-indicator.js";
// Main chat component that handles input when agent is available
function ChatInterfaceWithAgent({ agent, initialMessage, initialSession, watchMode = false, }) {
    const [chatHistory, setChatHistory] = useState(initialSession ? initialSession.chatHistory : []);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingTime, setProcessingTime] = useState(0);
    const [tokenCount, setTokenCount] = useState(0);
    const [isStreaming, setIsStreaming] = useState(false);
    const [confirmationOptions, setConfirmationOptions] = useState(null);
    const [thinkingContent, setThinkingContent] = useState("");
    const [showThinking, setShowThinking] = useState(false);
    const scrollRef = useRef();
    const processingStartTime = useRef(0);
    // File watcher state
    const [watcherActive, setWatcherActive] = useState(false);
    const [watchPath, setWatchPath] = useState(null);
    const [recentChanges, setRecentChanges] = useState(0);
    const confirmationService = ConfirmationService.getInstance();
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
    const { input, cursorPosition, showCommandSuggestions, selectedCommandIndex, showModelSelection, selectedModelIndex, commandSuggestions, availableModels, autoEditEnabled, showThinking: showThinkingFromHook, } = useInputHandler({
        agent,
        chatHistory,
        setChatHistory,
        setIsProcessing,
        setIsStreaming,
        setTokenCount,
        setProcessingTime,
        processingStartTime,
        isProcessing,
        isStreaming,
        isConfirmationActive: !!confirmationOptions,
        setShowThinking,
        setThinkingContent,
    });
    useEffect(() => {
        // Only clear console on non-Windows platforms or if not PowerShell
        // Windows PowerShell can have issues with console.clear() causing flickering
        const isWindows = process.platform === "win32";
        const isPowerShell = process.env.ComSpec?.toLowerCase().includes("powershell") ||
            process.env.PSModulePath !== undefined;
        if (!isWindows || !isPowerShell) {
            console.clear();
        }
        // Add top padding
        console.log("    ");
        // Generate ZAI logo
        const zaiOutput = cfonts.render("ZAI", {
            font: "3d",
            align: "left",
            colors: ["magenta", "gray"],
            space: true,
            maxLength: "0",
            gradient: ["magenta", "cyan"],
            independentGradient: false,
            transitionGradient: true,
            env: "node",
        });
        // Generate GLM logo (same style as ZAI)
        const glmOutput = cfonts.render("GLM", {
            font: "3d",
            align: "left",
            colors: ["magenta", "gray"],
            space: true,
            maxLength: "0",
            gradient: ["magenta", "cyan"],
            independentGradient: false,
            transitionGradient: true,
            env: "node",
        });
        // Add horizontal margin (2 spaces) to match Ink paddingX={2}
        // Print ZAI logo without trailing empty lines
        const zaiLines = zaiOutput.string.split("\n");
        zaiLines.forEach((line) => {
            if (line.trim()) {
                console.log(" " + line); // Add 2 spaces for horizontal margin
            }
        });
        // Print GLM logo immediately after (no gap)
        const glmLines = glmOutput.string.split("\n");
        glmLines.forEach((line) => {
            if (line.trim()) {
                console.log(" " + line); // Add 2 spaces for horizontal margin
            }
        });
        console.log(" "); // Spacing after logo
        // Don't clear chat history if we have an initial session
        if (!initialSession) {
            setChatHistory([]);
        }
    }, []);
    // Process initial message if provided (streaming for faster feedback)
    useEffect(() => {
        if (initialMessage && agent) {
            const userEntry = {
                type: "user",
                content: initialMessage,
                timestamp: new Date(),
            };
            setChatHistory([userEntry]);
            const processInitialMessage = async () => {
                setIsProcessing(true);
                setIsStreaming(true);
                // Clear thinking au début
                setThinkingContent("");
                try {
                    let streamingEntry = null;
                    let accumulatedThinking = "";
                    let totalTools = 0;
                    let completedTools = 0;
                    for await (const chunk of agent.processUserMessageStream(initialMessage)) {
                        switch (chunk.type) {
                            case "thinking":
                                if (chunk.content) {
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
                                    setChatHistory((prev) => prev.map((entry) => {
                                        if (entry.isStreaming) {
                                            return { ...entry, isStreaming: false };
                                        }
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
                                setThinkingContent("");
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
            processInitialMessage();
        }
    }, [initialMessage, agent]);
    // File watcher effect
    useEffect(() => {
        if (watchMode) {
            const watcher = getFileWatcher();
            const currentDir = agent.getCurrentDirectory();
            watcher.start(currentDir);
            watcher.on('ready', ({ watchPath }) => {
                setWatcherActive(true);
                setWatchPath(watchPath);
                const readyEntry = {
                    type: 'assistant',
                    content: `File watching enabled for: ${watchPath}\nI'll notify you when files change.`,
                    timestamp: new Date(),
                };
                setChatHistory(prev => [...prev, readyEntry]);
            });
            watcher.on('change', (event) => {
                setRecentChanges(prev => prev + 1);
                // Reset counter after 3 seconds
                setTimeout(() => {
                    setRecentChanges(prev => Math.max(0, prev - 1));
                }, 3000);
                // Notify user of change
                const changeEntry = {
                    type: 'assistant',
                    content: `File ${event.type}: ${event.path}`,
                    timestamp: new Date(),
                };
                setChatHistory(prev => [...prev, changeEntry]);
            });
            watcher.on('error', (error) => {
                console.error('File watcher error:', error);
            });
            return () => {
                watcher.stop();
                setWatcherActive(false);
            };
        }
    }, [watchMode, agent]);
    useEffect(() => {
        const handleConfirmationRequest = (options) => {
            setConfirmationOptions(options);
        };
        confirmationService.on("confirmation-requested", handleConfirmationRequest);
        return () => {
            confirmationService.off("confirmation-requested", handleConfirmationRequest);
        };
    }, [confirmationService]);
    useEffect(() => {
        if (!isProcessing && !isStreaming) {
            setProcessingTime(0);
            return;
        }
        if (processingStartTime.current === 0) {
            processingStartTime.current = Date.now();
        }
        const interval = setInterval(() => {
            setProcessingTime(Math.floor((Date.now() - processingStartTime.current) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [isProcessing, isStreaming]);
    const handleConfirmation = (dontAskAgain) => {
        confirmationService.confirmOperation(true, dontAskAgain);
        setConfirmationOptions(null);
    };
    const handleRejection = (feedback) => {
        confirmationService.rejectOperation(feedback);
        setConfirmationOptions(null);
        // Reset processing states when operation is cancelled
        setIsProcessing(false);
        setIsStreaming(false);
        setTokenCount(0);
        setProcessingTime(0);
        processingStartTime.current = 0;
    };
    return (React.createElement(Box, { flexDirection: "column", paddingX: 2 },
        chatHistory.length === 0 && !confirmationOptions && (React.createElement(Box, { flexDirection: "column", marginBottom: 2 },
            React.createElement(Text, { color: "cyan", bold: true }, "Tips for getting started:"),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Text, { color: "gray" }, "1. Ask questions, edit files, or run commands."),
                React.createElement(Text, { color: "gray" }, "2. Be specific for the best results."),
                React.createElement(Text, { color: "gray" }, "3. Create ZAI.md files to customize your interactions with ZAI."),
                React.createElement(Text, { color: "gray" }, "4. Press Shift+Tab to toggle auto-edit mode."),
                React.createElement(Text, { color: "gray" }, "5. /help for more information.")))),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "gray" }, "Type your request in natural language. Ctrl+C to clear, 'exit' to quit.")),
        React.createElement(Box, { flexDirection: "column", ref: scrollRef },
            React.createElement(ChatHistory, { entries: chatHistory, isConfirmationActive: !!confirmationOptions })),
        React.createElement(ThinkingPanel, { thinkingContent: thinkingContent, modelName: agent.getCurrentModel(), isVisible: showThinkingFromHook && !!thinkingContent, isStreaming: isStreaming }),
        confirmationOptions && (React.createElement(ConfirmationDialog, { operation: confirmationOptions.operation, filename: confirmationOptions.filename, showVSCodeOpen: confirmationOptions.showVSCodeOpen, content: confirmationOptions.content, onConfirm: handleConfirmation, onReject: handleRejection })),
        !confirmationOptions && (React.createElement(React.Fragment, null,
            React.createElement(LoadingSpinner, { isActive: isProcessing || isStreaming, processingTime: processingTime, tokenCount: tokenCount }),
            React.createElement(ChatInput, { input: input, cursorPosition: cursorPosition, isProcessing: isProcessing, isStreaming: isStreaming }),
            React.createElement(Box, { flexDirection: "row", marginTop: 1 },
                React.createElement(Box, { marginRight: 2 },
                    React.createElement(Text, { color: "cyan" },
                        autoEditEnabled ? "▶" : "⏸",
                        " auto-edit:",
                        " ",
                        autoEditEnabled ? "on" : "off"),
                    React.createElement(Text, { color: "gray", dimColor: true },
                        " ",
                        "(shift + tab)")),
                React.createElement(Box, { marginRight: 2 },
                    React.createElement(Text, { color: "yellow" },
                        "\u224B ",
                        agent.getCurrentModel())),
                React.createElement(Box, { marginRight: 2 },
                    React.createElement(Text, { color: showThinkingFromHook ? "magenta" : "gray" },
                        showThinkingFromHook ? "💭" : "💤",
                        " thinking:",
                        " ",
                        showThinkingFromHook ? "on" : "off"),
                    React.createElement(Text, { color: "gray", dimColor: true },
                        " ",
                        "(T)")),
                React.createElement(Box, { marginRight: 2 },
                    React.createElement(FileWatcherIndicator, { isActive: watcherActive, watchPath: watchPath, recentChanges: recentChanges })),
                React.createElement(MCPStatus, null)),
            React.createElement(CommandSuggestions, { suggestions: commandSuggestions, input: input, selectedIndex: selectedCommandIndex, isVisible: showCommandSuggestions }),
            React.createElement(ModelSelection, { models: availableModels, selectedIndex: selectedModelIndex, isVisible: showModelSelection, currentModel: agent.getCurrentModel() })))));
}
// Main component that handles API key input or chat interface
export default function ChatInterface({ agent, initialMessage, initialSession, watchMode = false, }) {
    const [currentAgent, setCurrentAgent] = useState(agent || null);
    const handleApiKeySet = (newAgent) => {
        setCurrentAgent(newAgent);
    };
    if (!currentAgent) {
        return React.createElement(ApiKeyInput, { onApiKeySet: handleApiKeySet });
    }
    return (React.createElement(ChatInterfaceWithAgent, { agent: currentAgent, initialMessage: initialMessage, initialSession: initialSession, watchMode: watchMode }));
}
//# sourceMappingURL=chat-interface.js.map