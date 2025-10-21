import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
export default function ThinkingPanel({ thinkingContent, modelName, isVisible, isStreaming, }) {
    const [dots, setDots] = useState(".");
    // Animation des points pour l'indicateur de streaming
    useEffect(() => {
        if (!isStreaming) {
            setDots(".");
            return;
        }
        const interval = setInterval(() => {
            setDots((prev) => {
                if (prev === "...")
                    return ".";
                return prev + ".";
            });
        }, 400);
        return () => clearInterval(interval);
    }, [isStreaming]);
    if (!isVisible || !thinkingContent) {
        return null;
    }
    return (React.createElement(Box, { flexDirection: "column", borderStyle: "round", borderColor: "magenta", paddingX: 1, marginBottom: 1 },
        React.createElement(Box, null,
            React.createElement(Text, { color: "magenta", bold: true },
                "\uD83D\uDCAD Thinking (",
                modelName,
                ")"),
            React.createElement(Text, { color: "gray", dimColor: true },
                " ",
                "[Press T to toggle]")),
        React.createElement(Box, { marginTop: 1, flexDirection: "column" },
            React.createElement(Text, { color: "gray", italic: true }, thinkingContent),
            isStreaming && (React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "cyan", dimColor: true }, "\u25B8 thinking"),
                React.createElement(Text, { color: "cyan" }, dots))))));
}
//# sourceMappingURL=thinking-panel.js.map