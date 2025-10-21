import React, { useState, useEffect, useRef } from "react";
import { Box, Text } from "ink";
import { ZaiAgent, ChatEntry } from "../../agent/zai-agent.js";
import { useInputHandler } from "../../hooks/use-input-handler.js";
import { useUIState } from "../../hooks/use-ui-state.js";
import { LoadingSpinner } from "./loading-spinner.js";
import { CommandSuggestions } from "./command-suggestions.js";
import { ModelSelection } from "./model-selection.js";
import { ChatHistory } from "./chat-history.js";
import { ChatInput } from "./chat-input.js";
import { MCPStatus } from "./mcp-status.js";
import ThinkingPanel from "./thinking-panel.js";
import ConfirmationDialog from "./confirmation-dialog.js";
import { HistorySearch } from "./history-search.js";
import {
  ConfirmationService,
  ConfirmationOptions,
} from "../../utils/confirmation-service.js";
import ApiKeyInput from "./api-key-input.js";
import cfonts from "cfonts";
import { SessionData } from "../../utils/session-manager.js";
import { getFileWatcher, FileChangeEvent } from "../../utils/file-watcher.js";
import FileWatcherIndicator from "./file-watcher-indicator.js";

interface ChatInterfaceProps {
  agent?: ZaiAgent;
  initialMessage?: string;
  initialSession?: SessionData;
  watchMode?: boolean;
}

// Main chat component that handles input when agent is available
function ChatInterfaceWithAgent({
  agent,
  initialMessage,
  initialSession,
  watchMode = false,
}: {
  agent: ZaiAgent;
  initialMessage?: string;
  initialSession?: SessionData;
  watchMode?: boolean;
}) {
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>(
    initialSession ? initialSession.chatHistory : []
  );

  // Centralized UI state management using useReducer
  const { state: uiState, selectors, actions } = useUIState();

  const scrollRef = useRef<any>();
  const processingStartTime = useRef<number>(0);

  const confirmationService = ConfirmationService.getInstance();

  // Fonction pour résumer les résultats des outils
  const summarizeToolResult = (toolCall: any, toolResult: any): string => {
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
      } catch {
        fileInfo = "file";
      }

      if (lineCountMatch) {
        const additionalLines = parseInt(lineCountMatch[1]);
        return `✓ Read ${fileInfo} (${10 + additionalLines} lines)`;
      } else if (totalLinesMatch) {
        const start = parseInt(totalLinesMatch[1]);
        const end = parseInt(totalLinesMatch[2]);
        return `✓ Read ${fileInfo} (lines ${start}-${end})`;
      } else {
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
      } catch {
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
      } catch {
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
      } catch {
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
      } catch {
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
      } catch {
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

  const {
    input,
    cursorPosition,
    showCommandSuggestions,
    selectedCommandIndex,
    showModelSelection,
    selectedModelIndex,
    commandSuggestions,
    availableModels,
    autoEditEnabled,
    showThinking: showThinkingFromHook,
    isHistorySearchActive,
    historySearchQuery,
    historySearchResults,
    historySearchIndex,
  } = useInputHandler({
    agent,
    chatHistory,
    setChatHistory,
    setIsProcessing: (processing: boolean) => {
      if (processing) {
        actions.startProcessing();
      } else {
        actions.stopProcessing();
      }
    },
    setIsStreaming: (streaming: boolean) => {
      if (streaming) {
        actions.startStreaming();
      } else {
        actions.stopStreaming();
      }
    },
    setTokenCount: actions.updateTokenCount,
    setProcessingTime: actions.updateProcessingTime,
    processingStartTime,
    isProcessing: selectors.isProcessing,
    isStreaming: selectors.isStreaming,
    isConfirmationActive: selectors.isConfirming,
    setShowThinking: actions.setShowThinking,
    setThinkingContent: actions.updateThinkingContent,
  });

  useEffect(() => {
    // Only clear console on non-Windows platforms or if not PowerShell
    // Windows PowerShell can have issues with console.clear() causing flickering
    const isWindows = process.platform === "win32";
    const isPowerShell =
      process.env.ComSpec?.toLowerCase().includes("powershell") ||
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
    const zaiLines = (zaiOutput as any).string.split("\n");
    zaiLines.forEach((line: string) => {
      if (line.trim()) {
        console.log(" " + line); // Add 2 spaces for horizontal margin
      }
    });

    // Print GLM logo immediately after (no gap)
    const glmLines = (glmOutput as any).string.split("\n");
    glmLines.forEach((line: string) => {
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
      const userEntry: ChatEntry = {
        type: "user",
        content: initialMessage,
        timestamp: new Date(),
      };
      setChatHistory([userEntry]);

      const processInitialMessage = async () => {
        actions.startProcessing();
        actions.startStreaming();

        // Clear thinking au début
        actions.clearThinkingContent();

        try {
          let streamingEntry: ChatEntry | null = null;
          let accumulatedThinking = "";
          let totalTools = 0;
          let completedTools = 0;

          for await (const chunk of agent.processUserMessageStream(initialMessage)) {
            switch (chunk.type) {
              case "thinking":
                if (chunk.content) {
                  accumulatedThinking += chunk.content;
                  actions.updateThinkingContent(accumulatedThinking);
                }
                break;
              case "content":
                if (chunk.content) {
                  if (!streamingEntry) {
                    const newStreamingEntry = {
                      type: "assistant" as const,
                      content: chunk.content,
                      timestamp: new Date(),
                      isStreaming: true,
                    };
                    setChatHistory((prev) => [...prev, newStreamingEntry]);
                    streamingEntry = newStreamingEntry;
                  } else {
                    setChatHistory((prev) =>
                      prev.map((entry, idx) =>
                        idx === prev.length - 1 && entry.isStreaming
                          ? { ...entry, content: entry.content + chunk.content }
                          : entry
                      )
                    );
                  }
                }
                break;
              case "token_count":
                if (chunk.tokenCount !== undefined) {
                  actions.updateTokenCount(chunk.tokenCount);
                }
                break;
              case "tool_calls":
                if (chunk.toolCalls) {
                  // Stop streaming for the current assistant message
                  setChatHistory((prev) =>
                    prev.map((entry) =>
                      entry.isStreaming
                        ? {
                            ...entry,
                            isStreaming: false,
                            toolCalls: chunk.toolCalls,
                          }
                        : entry
                    )
                  );
                  streamingEntry = null;

                  // Initialiser le compteur d'outils
                  totalTools += chunk.toolCalls.length;

                  // Ajouter ou mettre à jour le message synthétique au thinking panel
                  actions.updateThinkingContent(
                    (() => {
                      const prev = uiState.thinkingContent;
                      const lines = prev.split('\n');
                      const toolLineIndex = lines.findIndex(line => line.includes('🔧 Executing tools:'));

                      if (toolLineIndex !== -1) {
                        // Mettre à jour la ligne existante
                        lines[toolLineIndex] = `🔧 Executing tools: ${completedTools}/${totalTools} completed`;
                        return lines.join('\n');
                      } else {
                        // Créer la ligne si elle n'existe pas
                        return `${prev}\n\n🔧 Executing tools: ${completedTools}/${totalTools} completed`;
                      }
                    })()
                  );

                  // Add individual tool call entries to show tools are being executed
                  chunk.toolCalls.forEach((toolCall) => {
                    const toolCallEntry: ChatEntry = {
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

                  actions.updateThinkingContent(
                    (() => {
                      // Remplacer la dernière ligne de compteur par la mise à jour
                      const prev = uiState.thinkingContent;
                      const lines = prev.split('\n');
                      const lastLineIndex = lines.findIndex(line => line.includes('🔧 Executing tools:'));

                      if (lastLineIndex !== -1) {
                        lines[lastLineIndex] = `🔧 Executing tools: ${completedTools}/${totalTools} completed`;
                        return lines.join('\n');
                      }
                      return prev;
                    })()
                  );

                  setChatHistory((prev) =>
                    prev.map((entry) => {
                      if (entry.isStreaming) {
                        return { ...entry, isStreaming: false };
                      }
                      if (
                        entry.type === "tool_call" &&
                        entry.toolCall?.id === chunk.toolCall?.id
                      ) {
                        return {
                          ...entry,
                          type: "tool_result",
                          content: summarizeToolResult(chunk.toolCall, chunk.toolResult),
                          toolResult: chunk.toolResult,
                        };
                      }
                      return entry;
                    })
                  );
                  streamingEntry = null;
                }
                break;
              case "done":
                if (streamingEntry) {
                  setChatHistory((prev) =>
                    prev.map((entry) =>
                      entry.isStreaming ? { ...entry, isStreaming: false } : entry
                    )
                  );
                }
                actions.stopStreaming();
                // Clear le thinking à la fin
                actions.clearThinkingContent();
                break;
            }
          }
        } catch (error: any) {
          const errorEntry: ChatEntry = {
            type: "assistant",
            content: `Error: ${error.message}`,
            timestamp: new Date(),
          };
          setChatHistory((prev) => [...prev, errorEntry]);
          actions.stopStreaming();
        }

        actions.stopProcessing();
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
        actions.setWatcherActive(true);
        actions.setWatchPath(watchPath);

        const readyEntry: ChatEntry = {
          type: 'assistant',
          content: `File watching enabled for: ${watchPath}\nI'll notify you when files change.`,
          timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, readyEntry]);
      });

      watcher.on('change', (event: FileChangeEvent) => {
        actions.incrementRecentChanges();

        // Reset counter after 3 seconds
        setTimeout(() => {
          actions.decrementRecentChanges();
        }, 3000);

        // Notify user of change
        const changeEntry: ChatEntry = {
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
        actions.setWatcherActive(false);
      };
    }
  }, [watchMode, agent]);

  useEffect(() => {
    const handleConfirmationRequest = (options: ConfirmationOptions) => {
      actions.showConfirmation(options);
    };

    confirmationService.on("confirmation-requested", handleConfirmationRequest);

    return () => {
      confirmationService.off(
        "confirmation-requested",
        handleConfirmationRequest
      );
    };
  }, [confirmationService, actions]);

  useEffect(() => {
    if (!selectors.isProcessing && !selectors.isStreaming) {
      actions.updateProcessingTime(0);
      return;
    }

    if (processingStartTime.current === 0) {
      processingStartTime.current = Date.now();
    }

    const interval = setInterval(() => {
      actions.updateProcessingTime(
        Math.floor((Date.now() - processingStartTime.current) / 1000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [selectors.isProcessing, selectors.isStreaming, actions]);

  const handleConfirmation = (dontAskAgain?: boolean) => {
    confirmationService.confirmOperation(true, dontAskAgain);
    actions.confirm();
  };

  const handleRejection = (feedback?: string) => {
    confirmationService.rejectOperation(feedback);
    actions.cancel();

    // Reset processing states when operation is cancelled
    processingStartTime.current = 0;
  };

  return (
    <Box flexDirection="column" paddingX={2}>
      {/* Show tips only when no chat history and no confirmation dialog */}
      {chatHistory.length === 0 && !selectors.isConfirming && (
        <Box flexDirection="column" marginBottom={2}>
          <Text color="cyan" bold>
            Tips for getting started:
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text color="gray">
              1. Ask questions, edit files, or run commands.
            </Text>
            <Text color="gray">2. Be specific for the best results.</Text>
            <Text color="gray">
              3. Create ZAI.md files to customize your interactions with ZAI.
            </Text>
            <Text color="gray">
              4. Press Shift+Tab to toggle auto-edit mode.
            </Text>
            <Text color="gray">5. /help for more information.</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">
          Type your request in natural language. Ctrl+C to clear, 'exit' to
          quit.
        </Text>
      </Box>

      <Box flexDirection="column" ref={scrollRef}>
        <ChatHistory
          entries={chatHistory}
          isConfirmationActive={selectors.isConfirming}
        />
      </Box>

      {/* Show thinking panel if enabled and content available */}
      <ThinkingPanel
        thinkingContent={uiState.thinkingContent}
        modelName={agent.getCurrentModel()}
        isVisible={showThinkingFromHook && !!uiState.thinkingContent}
        isStreaming={selectors.isStreaming}
      />
      {/* DEBUG: {JSON.stringify({ showThinkingFromHook, hasContent: !!uiState.thinkingContent, contentLength: uiState.thinkingContent.length })} */}

      {/* Show confirmation dialog if one is pending */}
      {selectors.confirmationOptions && (
        <ConfirmationDialog
          operation={selectors.confirmationOptions.operation}
          filename={selectors.confirmationOptions.filename}
          showVSCodeOpen={selectors.confirmationOptions.showVSCodeOpen}
          content={selectors.confirmationOptions.content}
          onConfirm={handleConfirmation}
          onReject={handleRejection}
        />
      )}

      {!selectors.isConfirming && (
        <>
          <LoadingSpinner
            isActive={selectors.isProcessing || selectors.isStreaming}
            processingTime={uiState.processingTime}
            tokenCount={uiState.tokenCount}
          />

          <ChatInput
            input={input}
            cursorPosition={cursorPosition}
            isProcessing={selectors.isProcessing}
            isStreaming={selectors.isStreaming}
          />

          <Box flexDirection="row" marginTop={1}>
            <Box marginRight={2}>
              <Text color="cyan">
                {autoEditEnabled ? "▶" : "⏸"} auto-edit:{" "}
                {autoEditEnabled ? "on" : "off"}
              </Text>
              <Text color="gray" dimColor>
                {" "}
                (shift + tab)
              </Text>
            </Box>
            <Box marginRight={2}>
              <Text color="yellow">≋ {agent.getCurrentModel()}</Text>
            </Box>
            <Box marginRight={2}>
              <Text color={showThinkingFromHook ? "magenta" : "gray"}>
                {showThinkingFromHook ? "💭" : "💤"} thinking:{" "}
                {showThinkingFromHook ? "on" : "off"}
              </Text>
              <Text color="gray" dimColor>
                {" "}
                (T)
              </Text>
            </Box>
            <Box marginRight={2}>
              <FileWatcherIndicator
                isActive={uiState.watcherActive}
                watchPath={uiState.watchPath}
                recentChanges={uiState.recentChanges}
              />
            </Box>
            <MCPStatus />
          </Box>

          <HistorySearch
            query={historySearchQuery}
            results={historySearchResults}
            selectedIndex={historySearchIndex}
            isVisible={isHistorySearchActive}
          />

          <CommandSuggestions
            suggestions={commandSuggestions}
            input={input}
            selectedIndex={selectedCommandIndex}
            isVisible={showCommandSuggestions && !isHistorySearchActive}
          />

          <ModelSelection
            models={availableModels}
            selectedIndex={selectedModelIndex}
            isVisible={showModelSelection && !isHistorySearchActive}
            currentModel={agent.getCurrentModel()}
          />
        </>
      )}
    </Box>
  );
}

// Main component that handles API key input or chat interface
export default function ChatInterface({
  agent,
  initialMessage,
  initialSession,
  watchMode = false,
}: ChatInterfaceProps) {
  const [currentAgent, setCurrentAgent] = useState<ZaiAgent | null>(
    agent || null
  );

  const handleApiKeySet = (newAgent: ZaiAgent) => {
    setCurrentAgent(newAgent);
  };

  if (!currentAgent) {
    return <ApiKeyInput onApiKeySet={handleApiKeySet} />;
  }

  return (
    <ChatInterfaceWithAgent
      agent={currentAgent}
      initialMessage={initialMessage}
      initialSession={initialSession}
      watchMode={watchMode}
    />
  );
}
