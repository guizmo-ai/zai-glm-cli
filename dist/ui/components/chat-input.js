import React from "react";
import { Box, Text } from "ink";
export function ChatInput({ input, cursorPosition, isProcessing, isStreaming, }) {
    const beforeCursor = input.slice(0, cursorPosition);
    const afterCursor = input.slice(cursorPosition);
    // Handle multiline input display
    const lines = input.split("\n");
    const isMultiline = lines.length > 1;
    // Calculate cursor position across lines
    let currentLineIndex = 0;
    let currentCharIndex = 0;
    let totalChars = 0;
    for (let i = 0; i < lines.length; i++) {
        if (totalChars + lines[i].length >= cursorPosition) {
            currentLineIndex = i;
            currentCharIndex = cursorPosition - totalChars;
            break;
        }
        totalChars += lines[i].length + 1; // +1 for newline
    }
    const showCursor = !isProcessing && !isStreaming;
    const borderColor = isProcessing || isStreaming ? "yellow" : "blue";
    const promptColor = "cyan";
    // Display placeholder when input is empty
    const placeholderText = "Ask me anything...";
    const isPlaceholder = !input;
    if (isMultiline) {
        return (React.createElement(Box, { borderStyle: "round", borderColor: borderColor, paddingY: 0, marginTop: 1 }, lines.map((line, index) => {
            const isCurrentLine = index === currentLineIndex;
            const promptChar = index === 0 ? "❯" : "│";
            if (isCurrentLine) {
                const beforeCursorInLine = line.slice(0, currentCharIndex);
                const cursorChar = line.slice(currentCharIndex, currentCharIndex + 1) || " ";
                const afterCursorInLine = line.slice(currentCharIndex + 1);
                return (React.createElement(Box, { key: index },
                    React.createElement(Text, { color: promptColor },
                        promptChar,
                        " "),
                    React.createElement(Text, null,
                        beforeCursorInLine,
                        showCursor && (React.createElement(Text, { backgroundColor: "white", color: "black" }, cursorChar)),
                        !showCursor && cursorChar !== " " && cursorChar,
                        afterCursorInLine)));
            }
            else {
                return (React.createElement(Box, { key: index },
                    React.createElement(Text, { color: promptColor },
                        promptChar,
                        " "),
                    React.createElement(Text, null, line)));
            }
        })));
    }
    // Single line input box
    const cursorChar = input.slice(cursorPosition, cursorPosition + 1) || " ";
    const afterCursorText = input.slice(cursorPosition + 1);
    return (React.createElement(Box, { borderStyle: "round", borderColor: borderColor, paddingX: 1, paddingY: 0, marginTop: 1 },
        React.createElement(Box, null,
            React.createElement(Text, { color: promptColor }, "\u276F "),
            isPlaceholder ? (React.createElement(React.Fragment, null,
                React.createElement(Text, { color: "gray", dimColor: true }, placeholderText),
                showCursor && (React.createElement(Text, { backgroundColor: "white", color: "black" }, " ")))) : (React.createElement(Text, null,
                beforeCursor,
                showCursor && (React.createElement(Text, { backgroundColor: "white", color: "black" }, cursorChar)),
                !showCursor && cursorChar !== " " && cursorChar,
                afterCursorText)))));
}
//# sourceMappingURL=chat-input.js.map