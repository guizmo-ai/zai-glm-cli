import React from 'react';
import { Text, Box } from 'ink';
export const colorizeCode = (content, language, availableTerminalHeight, terminalWidth) => {
    // Simple plain text rendering - could be enhanced with syntax highlighting later
    return (React.createElement(Box, { flexDirection: "column" }, content.split('\n').map((line, index) => (React.createElement(Text, { key: index, wrap: "wrap" }, line)))));
};
//# sourceMappingURL=code-colorizer.js.map