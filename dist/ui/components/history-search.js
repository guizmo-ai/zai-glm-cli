import React from "react";
import { Box, Text } from "ink";
/**
 * History search component for Ctrl+R reverse search
 * Displays matching history entries with highlighted selection
 */
export function HistorySearch({ query, results, selectedIndex, isVisible, maxResults = 10, }) {
    if (!isVisible) {
        return null;
    }
    const displayResults = results.slice(-maxResults);
    const adjustedIndex = selectedIndex - Math.max(0, results.length - maxResults);
    return (React.createElement(Box, { flexDirection: "column", marginTop: 1, marginBottom: 1 },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "cyan", bold: true }, "History Search (Ctrl+R)"),
            query && (React.createElement(Text, { color: "gray", dimColor: true },
                " ",
                "- searching for: \"",
                query,
                "\""))),
        displayResults.length === 0 ? (React.createElement(Box, null,
            React.createElement(Text, { color: "gray", dimColor: true }, query ? `No matches found for "${query}"` : "Start typing to search history..."))) : (React.createElement(Box, { flexDirection: "column" }, displayResults.map((entry, index) => {
            const isSelected = index === adjustedIndex;
            const displayTimestamp = new Date(entry.timestamp).toLocaleString();
            return (React.createElement(Box, { key: `${entry.timestamp}-${index}`, marginBottom: 0 },
                React.createElement(Box, { width: 4 },
                    React.createElement(Text, { color: isSelected ? "green" : "gray" }, isSelected ? "▶ " : "  ")),
                React.createElement(Box, { flexDirection: "column", flexGrow: 1 },
                    React.createElement(Text, { color: isSelected ? "green" : "white", bold: isSelected }, highlightMatch(entry.command, query)),
                    React.createElement(Box, null,
                        React.createElement(Text, { color: "gray", dimColor: true }, displayTimestamp),
                        entry.workingDirectory && (React.createElement(Text, { color: "gray", dimColor: true },
                            " ",
                            "\u2022 ",
                            shortenPath(entry.workingDirectory))),
                        entry.model && (React.createElement(Text, { color: "gray", dimColor: true },
                            " ",
                            "\u2022 ",
                            entry.model))))));
        }))),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "gray", dimColor: true }, "\u2191/\u2193 navigate \u2022 Enter to select \u2022 Esc to cancel")),
        results.length > maxResults && (React.createElement(Box, null,
            React.createElement(Text, { color: "yellow", dimColor: true },
                "Showing ",
                maxResults,
                " of ",
                results.length,
                " matches")))));
}
/**
 * Highlight matching characters in the command
 */
function highlightMatch(text, query) {
    if (!query) {
        return text;
    }
    // For fuzzy matching visualization, we could add highlighting here
    // For now, just return the text as-is since terminal highlighting is complex
    return text;
}
/**
 * Shorten directory paths for display
 */
function shortenPath(path) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    if (homeDir && path.startsWith(homeDir)) {
        return "~" + path.slice(homeDir.length);
    }
    // If path is too long, show only the last 2 segments
    const segments = path.split("/").filter(Boolean);
    if (segments.length > 3) {
        return ".../" + segments.slice(-2).join("/");
    }
    return path;
}
//# sourceMappingURL=history-search.js.map