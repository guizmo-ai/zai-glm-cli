import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { Colors } from "../utils/colors.js";
import { MaxSizedBox } from "../shared/max-sized-box.js";
export const InteractiveDiffViewer = ({ changes, onAccept, onReject, onAcceptAll, onRejectAll, onEdit, showFullDiff = false, terminalHeight = 40, terminalWidth = 100, }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showFullDiffMode, setShowFullDiffMode] = useState(showFullDiff);
    const [showHelp, setShowHelp] = useState(false);
    const currentChange = changes[currentIndex];
    const hasMultipleFiles = changes.length > 1;
    useInput((input, key) => {
        // Help toggle
        if (input === "?" || input === "h") {
            setShowHelp(!showHelp);
            return;
        }
        if (showHelp) {
            // Close help on any key
            setShowHelp(false);
            return;
        }
        // Navigation
        if ((input === "n" || key.rightArrow) && hasMultipleFiles) {
            setCurrentIndex((prev) => (prev + 1) % changes.length);
            return;
        }
        if ((input === "p" || key.leftArrow) && hasMultipleFiles) {
            setCurrentIndex((prev) => (prev - 1 + changes.length) % changes.length);
            return;
        }
        // Actions
        if (input === "a" || input === "y") {
            onAccept(currentIndex);
            return;
        }
        if (input === "r" || input === "n") {
            onReject(currentIndex);
            return;
        }
        if (input === "A") {
            onAcceptAll();
            return;
        }
        if (input === "R") {
            onRejectAll();
            return;
        }
        if (input === "e" && onEdit) {
            onEdit(currentIndex);
            return;
        }
        if (input === "d") {
            setShowFullDiffMode(!showFullDiffMode);
            return;
        }
        if (key.escape) {
            onReject(currentIndex);
            return;
        }
    });
    if (showHelp) {
        return renderHelp(hasMultipleFiles, !!onEdit);
    }
    if (!currentChange) {
        return (React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Text, { color: Colors.AccentYellow }, "No changes to review.")));
    }
    return (React.createElement(Box, { flexDirection: "column", padding: 1 },
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Box, null,
                React.createElement(Text, { bold: true, color: Colors.Cyan },
                    "File ",
                    currentIndex + 1,
                    " of ",
                    changes.length,
                    ":",
                    " "),
                React.createElement(Text, { color: "white" }, currentChange.filePath)),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: Colors.Gray }, currentChange.diff.summary))),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 }, showFullDiffMode ? (React.createElement(FullDiffView, { change: currentChange, terminalHeight: terminalHeight - 12, terminalWidth: terminalWidth })) : (React.createElement(CompactDiffView, { change: currentChange, terminalHeight: terminalHeight - 12, terminalWidth: terminalWidth }))),
        React.createElement(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", paddingX: 1 },
            React.createElement(Box, { marginY: 1 },
                React.createElement(Text, { bold: true }, "Actions:")),
            React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, null,
                    React.createElement(Text, { color: "green" }, "a"),
                    "/",
                    React.createElement(Text, { color: "green" }, "y"),
                    " - Accept this change"),
                React.createElement(Text, null,
                    React.createElement(Text, { color: "red" }, "r"),
                    "/",
                    React.createElement(Text, { color: "red" }, "n"),
                    " - Reject this change"),
                hasMultipleFiles && (React.createElement(React.Fragment, null,
                    React.createElement(Text, null,
                        React.createElement(Text, { color: "cyan" }, "n"),
                        "/\u2192 - Next file"),
                    React.createElement(Text, null,
                        React.createElement(Text, { color: "cyan" }, "p"),
                        "/\u2190 - Previous file"),
                    React.createElement(Text, null,
                        React.createElement(Text, { color: "green", bold: true }, "A"),
                        " - Accept all changes"),
                    React.createElement(Text, null,
                        React.createElement(Text, { color: "red", bold: true }, "R"),
                        " - Reject all changes"))),
                React.createElement(Text, null,
                    React.createElement(Text, { color: "yellow" }, "d"),
                    " - Toggle full diff view"),
                onEdit && (React.createElement(Text, null,
                    React.createElement(Text, { color: "magenta" }, "e"),
                    " - Edit manually")),
                React.createElement(Text, null,
                    React.createElement(Text, { color: "gray" }, "?"),
                    "/",
                    React.createElement(Text, { color: "gray" }, "h"),
                    " - Show help"),
                React.createElement(Text, { color: "gray" }, "Esc - Cancel")))));
};
const CompactDiffView = ({ change, terminalHeight, terminalWidth, }) => {
    const maxLines = Math.max(10, terminalHeight - 5);
    let lineCount = 0;
    const renderedLines = [];
    for (const hunk of change.diff.hunks) {
        if (lineCount >= maxLines)
            break;
        // Add hunk header
        renderedLines.push(React.createElement(Box, { key: `hunk-${hunk.oldStart}-${hunk.newStart}` },
            React.createElement(Text, { color: Colors.Cyan },
                "@@ -",
                hunk.oldStart,
                ",",
                hunk.oldLines,
                " +",
                hunk.newStart,
                ",",
                hunk.newLines,
                " @@")));
        lineCount++;
        for (const line of hunk.lines) {
            if (lineCount >= maxLines)
                break;
            const lineNumber = line.type === "del"
                ? line.oldLineNumber
                : line.newLineNumber;
            const lineKey = `${hunk.oldStart}-${lineNumber}-${line.type}`;
            if (line.type === "add") {
                renderedLines.push(React.createElement(Box, { key: lineKey, flexDirection: "row" },
                    React.createElement(Text, { color: Colors.Gray }, (lineNumber || "").toString().padEnd(4)),
                    React.createElement(Text, { backgroundColor: "#86efac", color: "#000000" },
                        "+ ",
                        line.content)));
                lineCount++;
            }
            else if (line.type === "del") {
                renderedLines.push(React.createElement(Box, { key: lineKey, flexDirection: "row" },
                    React.createElement(Text, { color: Colors.Gray }, (lineNumber || "").toString().padEnd(4)),
                    React.createElement(Text, { backgroundColor: "redBright", color: "#000000" },
                        "- ",
                        line.content)));
                lineCount++;
            }
            else if (line.type === "context") {
                renderedLines.push(React.createElement(Box, { key: lineKey, flexDirection: "row" },
                    React.createElement(Text, { color: Colors.Gray }, (lineNumber || "").toString().padEnd(4)),
                    React.createElement(Text, { dimColor: true },
                        "  ",
                        line.content)));
                lineCount++;
            }
        }
    }
    const totalChangedLines = change.diff.additions + change.diff.deletions;
    if (lineCount < totalChangedLines) {
        renderedLines.push(React.createElement(Box, { key: "more" },
            React.createElement(Text, { color: Colors.Gray, dimColor: true },
                "... (",
                totalChangedLines - lineCount,
                " more lines, press 'd' to view full diff)")));
    }
    return (React.createElement(MaxSizedBox, { maxHeight: terminalHeight, maxWidth: terminalWidth }, renderedLines));
};
const FullDiffView = ({ change, terminalHeight, terminalWidth, }) => {
    const renderedLines = [];
    for (const hunk of change.diff.hunks) {
        // Add hunk header
        renderedLines.push(React.createElement(Box, { key: `hunk-${hunk.oldStart}-${hunk.newStart}` },
            React.createElement(Text, { color: Colors.Cyan },
                "@@ -",
                hunk.oldStart,
                ",",
                hunk.oldLines,
                " +",
                hunk.newStart,
                ",",
                hunk.newLines,
                " @@")));
        for (const line of hunk.lines) {
            const lineNumber = line.type === "del"
                ? line.oldLineNumber
                : line.newLineNumber;
            const lineKey = `${hunk.oldStart}-${lineNumber}-${line.type}`;
            if (line.type === "add") {
                renderedLines.push(React.createElement(Box, { key: lineKey, flexDirection: "row" },
                    React.createElement(Text, { color: Colors.Gray }, (lineNumber || "").toString().padEnd(4)),
                    React.createElement(Text, { backgroundColor: "#86efac", color: "#000000" },
                        "+ ",
                        line.content)));
            }
            else if (line.type === "del") {
                renderedLines.push(React.createElement(Box, { key: lineKey, flexDirection: "row" },
                    React.createElement(Text, { color: Colors.Gray }, (lineNumber || "").toString().padEnd(4)),
                    React.createElement(Text, { backgroundColor: "redBright", color: "#000000" },
                        "- ",
                        line.content)));
            }
            else if (line.type === "context") {
                renderedLines.push(React.createElement(Box, { key: lineKey, flexDirection: "row" },
                    React.createElement(Text, { color: Colors.Gray }, (lineNumber || "").toString().padEnd(4)),
                    React.createElement(Text, { dimColor: true },
                        "  ",
                        line.content)));
            }
        }
    }
    return (React.createElement(MaxSizedBox, { maxHeight: terminalHeight, maxWidth: terminalWidth }, renderedLines));
};
const renderHelp = (hasMultipleFiles, hasEdit) => {
    return (React.createElement(Box, { flexDirection: "column", padding: 1, borderStyle: "round", borderColor: "yellow" },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { bold: true, color: Colors.AccentYellow }, "Interactive Diff Viewer - Help")),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { bold: true }, "Navigation:"),
            hasMultipleFiles && (React.createElement(React.Fragment, null,
                React.createElement(Text, null, "  n / \u2192 - Next file"),
                React.createElement(Text, null, "  p / \u2190 - Previous file"))),
            React.createElement(Text, null, "  d - Toggle between compact and full diff view")),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { bold: true }, "Actions:"),
            React.createElement(Text, null, "  a / y - Accept this change"),
            React.createElement(Text, null, "  r / n - Reject this change"),
            hasMultipleFiles && (React.createElement(React.Fragment, null,
                React.createElement(Text, null, "  A (shift+a) - Accept all remaining changes"),
                React.createElement(Text, null, "  R (shift+r) - Reject all remaining changes"))),
            hasEdit && React.createElement(Text, null, "  e - Edit file manually"),
            React.createElement(Text, null, "  Esc - Cancel and reject current change")),
        React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { bold: true }, "Diff Legend:"),
            React.createElement(Text, null,
                React.createElement(Text, { backgroundColor: "#86efac", color: "#000000" },
                    " ",
                    "+ Added lines",
                    " ")),
            React.createElement(Text, null,
                React.createElement(Text, { backgroundColor: "redBright", color: "#000000" },
                    " ",
                    "- Deleted lines",
                    " ")),
            React.createElement(Text, { dimColor: true }, "   Context lines (unchanged)")),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: Colors.Gray, dimColor: true }, "Press any key to close this help screen"))));
};
//# sourceMappingURL=interactive-diff-viewer.js.map