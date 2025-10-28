import React from "react";
import { Box, Text } from "ink";
import { DiffRenderer } from "./diff-renderer.js";
import { MarkdownRenderer } from "../utils/markdown-renderer.js";
// Memoized ChatEntry component to prevent unnecessary re-renders
const MemoizedChatEntry = React.memo(({ entry, index }) => {
    const renderDiff = (diffContent, filename) => {
        return (React.createElement(DiffRenderer, { diffContent: diffContent, filename: filename, terminalWidth: 80 }));
    };
    const renderFileContent = (content) => {
        const lines = content.split("\n");
        // Calculate minimum indentation like DiffRenderer does
        let baseIndentation = Infinity;
        for (const line of lines) {
            if (line.trim() === "")
                continue;
            const firstCharIndex = line.search(/\S/);
            const currentIndent = firstCharIndex === -1 ? 0 : firstCharIndex;
            baseIndentation = Math.min(baseIndentation, currentIndent);
        }
        if (!isFinite(baseIndentation)) {
            baseIndentation = 0;
        }
        return lines.map((line, index) => {
            const displayContent = line.substring(baseIndentation);
            return (React.createElement(Text, { key: index, color: "gray" }, displayContent));
        });
    };
    switch (entry.type) {
        case "user":
            return (React.createElement(Box, { key: index, flexDirection: "column", marginTop: 1 },
                React.createElement(Box, null,
                    React.createElement(Text, { color: "gray" },
                        ">",
                        " ",
                        entry.content))));
        case "assistant":
            return (React.createElement(Box, { key: index, flexDirection: "column", marginTop: 1 },
                React.createElement(Box, { flexDirection: "row", alignItems: "flex-start" },
                    React.createElement(Text, { color: "white" }, "\u23FA "),
                    React.createElement(Box, { flexDirection: "column", flexGrow: 1 },
                        entry.toolCalls ? (
                        // If there are tool calls, just show plain text
                        React.createElement(Text, { color: "white" }, entry.content.trim())) : (
                        // If no tool calls, render as markdown
                        React.createElement(MarkdownRenderer, { content: entry.content.trim() })),
                        entry.isStreaming && React.createElement(Text, { color: "cyan" }, "\u2588")))));
        case "tool_call":
        case "tool_result":
            const getToolActionName = (toolName) => {
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
                    default:
                        return "Tool";
                }
            };
            const toolName = entry.toolCall?.function?.name || "unknown";
            const actionName = getToolActionName(toolName);
            const getFilePath = (toolCall) => {
                if (toolCall?.function?.arguments) {
                    try {
                        const args = JSON.parse(toolCall.function.arguments);
                        if (toolCall.function.name === "search") {
                            return args.query;
                        }
                        return args.path || args.file_path || args.command || "";
                    }
                    catch {
                        return "";
                    }
                }
                return "";
            };
            const filePath = getFilePath(entry.toolCall);
            const isExecuting = entry.type === "tool_call" || !entry.toolResult;
            // Format JSON content for better readability
            const formatToolContent = (content, toolName) => {
                if (toolName.startsWith("mcp__")) {
                    try {
                        // Try to parse as JSON and format it
                        const parsed = JSON.parse(content);
                        if (Array.isArray(parsed)) {
                            // For arrays, show a summary instead of full JSON
                            return `Found ${parsed.length} items`;
                        }
                        else if (typeof parsed === 'object') {
                            // For objects, show a formatted version
                            return JSON.stringify(parsed, null, 2);
                        }
                    }
                    catch {
                        // If not JSON, return as is
                        return content;
                    }
                }
                return content;
            };
            const shouldShowDiff = entry.toolCall?.function?.name === "str_replace_editor" &&
                entry.toolResult?.success &&
                entry.content.includes("Updated") &&
                entry.content.includes("---") &&
                entry.content.includes("+++");
            const shouldShowFileContent = (entry.toolCall?.function?.name === "view_file" ||
                entry.toolCall?.function?.name === "create_file") &&
                entry.toolResult?.success &&
                !shouldShowDiff;
            return (React.createElement(Box, { key: index, flexDirection: "column", marginTop: 1 },
                React.createElement(Box, null,
                    React.createElement(Text, { color: "magenta" }, "\u23FA"),
                    React.createElement(Text, { color: "white" },
                        " ",
                        filePath ? `${actionName}(${filePath})` : actionName)),
                React.createElement(Box, { marginLeft: 2, flexDirection: "column" }, isExecuting ? (React.createElement(Text, { color: "cyan" }, "\u23BF Executing...")) : shouldShowFileContent ? (React.createElement(Box, { flexDirection: "column" },
                    React.createElement(Text, { color: "gray" }, "\u23BF File contents:"),
                    React.createElement(Box, { marginLeft: 2, flexDirection: "column" }, renderFileContent(entry.content)))) : shouldShowDiff ? (
                // For diff results, show only the summary line, not the raw content
                React.createElement(Text, { color: "gray" },
                    "\u23BF ",
                    entry.content.split("\n")[0])) : (React.createElement(Text, { color: "gray" },
                    "\u23BF ",
                    formatToolContent(entry.content, toolName)))),
                shouldShowDiff && !isExecuting && (React.createElement(Box, { marginLeft: 4, flexDirection: "column" }, renderDiff(entry.content, filePath)))));
        default:
            return null;
    }
});
MemoizedChatEntry.displayName = "MemoizedChatEntry";
export function ChatHistory({ entries, isConfirmationActive = false, }) {
    // Filter out tool_call entries with "Executing..." when confirmation is active
    const filteredEntries = isConfirmationActive
        ? entries.filter((entry) => !(entry.type === "tool_call" && entry.content === "Executing..."))
        : entries;
    // Show only the most recent 30 entries to prevent pagination issues
    // This keeps the terminal from breaking when scrolling long threads
    const MAX_VISIBLE_ENTRIES = 30;
    const recentEntries = filteredEntries.slice(-MAX_VISIBLE_ENTRIES);
    // Show indicator if there are more entries
    const hasMoreEntries = filteredEntries.length > MAX_VISIBLE_ENTRIES;
    const hiddenCount = filteredEntries.length - MAX_VISIBLE_ENTRIES;
    return (React.createElement(Box, { flexDirection: "column" },
        hasMoreEntries && (React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "gray", dimColor: true },
                "... ",
                hiddenCount,
                " earlier ",
                hiddenCount === 1 ? "message" : "messages",
                " hidden"))),
        recentEntries.map((entry, index) => (React.createElement(MemoizedChatEntry, { key: `${entry.timestamp.getTime()}-${index}`, entry: entry, index: index })))));
}
//# sourceMappingURL=chat-history.js.map