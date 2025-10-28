import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { ChatEntry } from "../../agent/zai-agent.js";
import { DiffRenderer } from "./diff-renderer.js";
import { MarkdownRenderer } from "../utils/markdown-renderer.js";

interface ChatHistoryProps {
  entries: ChatEntry[];
  isConfirmationActive?: boolean;
}

// Blinking icon component for agent tools
const BlinkingAgentIcon = ({ isExecuting, isSuccess }: { isExecuting: boolean; isSuccess?: boolean }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isExecuting) {
      const interval = setInterval(() => {
        setIsVisible((prev) => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setIsVisible(true);
    }
  }, [isExecuting]);

  if (isExecuting) {
    return (
      <Text color="cyan">
        {isVisible ? "⚙️ " : "   "}
      </Text>
    );
  } else if (isSuccess === true) {
    return <Text color="green">✅ </Text>;
  } else if (isSuccess === false) {
    return <Text color="red">❌ </Text>;
  }

  return <Text color="magenta">⏺</Text>;
};

// Agent Activity Indicator with blinking animation
const AgentActivityIndicator = ({ entry }: { entry: ChatEntry }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Blinking animation for starting/running states
  useEffect(() => {
    if (entry.agentInfo?.status === "starting" || entry.agentInfo?.status === "running") {
      const interval = setInterval(() => {
        setIsVisible((prev) => !prev);
      }, 500); // Blink every 500ms

      return () => clearInterval(interval);
    } else {
      setIsVisible(true); // Always visible for completed/failed
    }
  }, [entry.agentInfo?.status]);

  const getActivityIcon = (status: string) => {
    switch (status) {
      case "starting":
        return "🚀";
      case "running":
        return "⚙️";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "🤖";
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case "starting":
        return "cyan";
      case "running":
        return "blue";
      case "completed":
        return "green";
      case "failed":
        return "red";
      default:
        return "white";
    }
  };

  const activityIcon = entry.agentInfo ? getActivityIcon(entry.agentInfo.status) : "🤖";
  const activityColor = entry.agentInfo ? getActivityColor(entry.agentInfo.status) : "white";
  const shouldBlink = entry.agentInfo?.status === "starting" || entry.agentInfo?.status === "running";

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        {shouldBlink && !isVisible ? (
          <Text color={activityColor} bold={true}>
            {"   "} {entry.content}
          </Text>
        ) : (
          <Text color={activityColor} bold={true}>
            {activityIcon} {entry.content}
          </Text>
        )}
      </Box>
      {entry.agentInfo?.taskId && entry.agentInfo.status !== "starting" && (
        <Box marginLeft={2}>
          <Text color="gray" dimColor={true}>
            ⎿ Task ID: {entry.agentInfo.taskId}
          </Text>
        </Box>
      )}
      {entry.agentInfo?.status === "failed" && (
        <Box marginLeft={2}>
          <Text color="red">
            ⎿ Error: {entry.agentInfo.error || "Agent execution failed"}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// Memoized ChatEntry component to prevent unnecessary re-renders
const MemoizedChatEntry = React.memo(
  ({ entry, index }: { entry: ChatEntry; index: number }) => {
    const renderDiff = (diffContent: string, filename?: string) => {
      return (
        <DiffRenderer
          diffContent={diffContent}
          filename={filename}
          terminalWidth={80}
        />
      );
    };

    const renderFileContent = (content: string) => {
      const lines = content.split("\n");

      // Calculate minimum indentation like DiffRenderer does
      let baseIndentation = Infinity;
      for (const line of lines) {
        if (line.trim() === "") continue;
        const firstCharIndex = line.search(/\S/);
        const currentIndent = firstCharIndex === -1 ? 0 : firstCharIndex;
        baseIndentation = Math.min(baseIndentation, currentIndent);
      }
      if (!isFinite(baseIndentation)) {
        baseIndentation = 0;
      }

      return lines.map((line, index) => {
        const displayContent = line.substring(baseIndentation);
        return (
          <Text key={index} color="gray">
            {displayContent}
          </Text>
        );
      });
    };

    switch (entry.type) {
      case "user":
        return (
          <Box key={index} flexDirection="column" marginTop={1}>
            <Box>
              <Text color="gray">
                {">"} {entry.content}
              </Text>
            </Box>
          </Box>
        );

      case "assistant":
        return (
          <Box key={index} flexDirection="column" marginTop={1}>
            <Box flexDirection="row" alignItems="flex-start">
              <Text color="white">⏺ </Text>
              <Box flexDirection="column" flexGrow={1}>
                {entry.toolCalls ? (
                  // If there are tool calls, just show plain text
                  <Text color="white">{entry.content.trim()}</Text>
                ) : (
                  // If no tool calls, render as markdown
                  <MarkdownRenderer content={entry.content.trim()} />
                )}
                {entry.isStreaming && <Text color="cyan">█</Text>}
              </Box>
            </Box>
          </Box>
        );

      case "agent_activity":
        return <AgentActivityIndicator key={index} entry={entry} />;

      case "tool_call":
      case "tool_result":
        const getToolActionName = (toolName: string) => {
          // Handle MCP tools with mcp__servername__toolname format
          if (toolName.startsWith("mcp__")) {
            const parts = toolName.split("__");
            if (parts.length >= 3) {
              const serverName = parts[1];
              const actualToolName = parts.slice(2).join("__");
              return `${serverName.charAt(0).toUpperCase() + serverName.slice(1)}(${actualToolName.replace(/_/g, " ")})`;
            }
          }

          switch (toolName) {
            case "view_file":
              return "Read";
            case "str_replace_editor":
              return "Update";
            case "create_file":
              return "Create";
            case "bash":
              return "Bash";
            case "search":
              return "Search";
            case "create_todo_list":
              return "Created Todo";
            case "update_todo_list":
              return "Updated Todo";
            case "launch_agent":
              return "Agent";
            default:
              return "Tool";
          }
        };

        const toolName = entry.toolCall?.function?.name || "unknown";
        const actionName = getToolActionName(toolName);

        // For launch_agent, extract agent type from arguments
        const getAgentInfo = (toolCall: any) => {
          if (toolCall?.function?.name === "launch_agent" && toolCall?.function?.arguments) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              return args.agent_type || "";
            } catch {
              return "";
            }
          }
          return "";
        };

        const agentType = getAgentInfo(entry.toolCall);

        const getFilePath = (toolCall: any) => {
          if (toolCall?.function?.arguments) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              if (toolCall.function.name === "search") {
                return args.query;
              }
              return args.path || args.file_path || args.command || "";
            } catch {
              return "";
            }
          }
          return "";
        };

        const filePath = getFilePath(entry.toolCall);
        const isExecuting = entry.type === "tool_call" || !entry.toolResult;
        
        // Format JSON content for better readability
        const formatToolContent = (content: string, toolName: string) => {
          if (toolName.startsWith("mcp__")) {
            try {
              // Try to parse as JSON and format it
              const parsed = JSON.parse(content);
              if (Array.isArray(parsed)) {
                // For arrays, show a summary instead of full JSON
                return `Found ${parsed.length} items`;
              } else if (typeof parsed === 'object') {
                // For objects, show a formatted version
                return JSON.stringify(parsed, null, 2);
              }
            } catch {
              // If not JSON, return as is
              return content;
            }
          }
          return content;
        };
        const shouldShowDiff =
          entry.toolCall?.function?.name === "str_replace_editor" &&
          entry.toolResult?.success &&
          entry.content.includes("Updated") &&
          entry.content.includes("---") &&
          entry.content.includes("+++");

        const shouldShowFileContent =
          (entry.toolCall?.function?.name === "view_file" ||
            entry.toolCall?.function?.name === "create_file") &&
          entry.toolResult?.success &&
          !shouldShowDiff;

        // Special handling for launch_agent tool
        const isAgentTool = toolName === "launch_agent";
        const agentSuccess = isAgentTool && !isExecuting ? entry.toolResult?.success : undefined;

        return (
          <Box key={index} flexDirection="column" marginTop={1}>
            <Box>
              {isAgentTool ? (
                <>
                  <BlinkingAgentIcon isExecuting={isExecuting} isSuccess={agentSuccess} />
                  <Text color="white">
                    {" "}
                    {agentType
                      ? `${actionName}(${agentType})`
                      : filePath
                      ? `${actionName}(${filePath})`
                      : actionName}
                  </Text>
                </>
              ) : (
                <>
                  <Text color="magenta">⏺</Text>
                  <Text color="white">
                    {" "}
                    {agentType
                      ? `${actionName}(${agentType})`
                      : filePath
                      ? `${actionName}(${filePath})`
                      : actionName}
                  </Text>
                </>
              )}
            </Box>
            <Box marginLeft={2} flexDirection="column">
              {isExecuting ? (
                <Text color="cyan">⎿ {isAgentTool ? "Agent working..." : "Executing..."}</Text>
              ) : shouldShowFileContent ? (
                <Box flexDirection="column">
                  <Text color="gray">⎿ File contents:</Text>
                  <Box marginLeft={2} flexDirection="column">
                    {renderFileContent(entry.content)}
                  </Box>
                </Box>
              ) : shouldShowDiff ? (
                // For diff results, show only the summary line, not the raw content
                <Text color="gray">⎿ {entry.content.split("\n")[0]}</Text>
              ) : isAgentTool && entry.toolResult?.success === false ? (
                <Text color="red">⎿ {entry.toolResult?.error || "Agent execution failed"}</Text>
              ) : isAgentTool && entry.toolResult?.success === true ? (
                <Text color="green">⎿ {formatToolContent(entry.content, toolName)}</Text>
              ) : (
                <Text color="gray">⎿ {formatToolContent(entry.content, toolName)}</Text>
              )}
            </Box>
            {shouldShowDiff && !isExecuting && (
              <Box marginLeft={4} flexDirection="column">
                {renderDiff(entry.content, filePath)}
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  }
);

MemoizedChatEntry.displayName = "MemoizedChatEntry";

export function ChatHistory({
  entries,
  isConfirmationActive = false,
}: ChatHistoryProps) {
  // Filter out tool_call entries with "Executing..." when confirmation is active
  const filteredEntries = isConfirmationActive
    ? entries.filter(
        (entry) =>
          !(entry.type === "tool_call" && entry.content === "Executing...")
      )
    : entries;

  // Show only the most recent 30 entries to prevent pagination issues
  // This keeps the terminal from breaking when scrolling long threads
  const MAX_VISIBLE_ENTRIES = 30;
  const recentEntries = filteredEntries.slice(-MAX_VISIBLE_ENTRIES);
  
  // Show indicator if there are more entries
  const hasMoreEntries = filteredEntries.length > MAX_VISIBLE_ENTRIES;
  const hiddenCount = filteredEntries.length - MAX_VISIBLE_ENTRIES;

  return (
    <Box flexDirection="column">
      {hasMoreEntries && (
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            ... {hiddenCount} earlier {hiddenCount === 1 ? "message" : "messages"} hidden
          </Text>
        </Box>
      )}
      {recentEntries.map((entry, index) => (
        <MemoizedChatEntry
          key={`${entry.timestamp.getTime()}-${index}`}
          entry={entry}
          index={index}
        />
      ))}
    </Box>
  );
}
