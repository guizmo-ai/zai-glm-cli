import React from 'react';
import { Text } from 'ink';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
// Configure marked to use the terminal renderer with default settings
marked.setOptions({
    renderer: new TerminalRenderer()
});
export function MarkdownRenderer({ content }) {
    try {
        // Use marked.parse for synchronous parsing
        const result = marked.parse(content);
        // Handle both sync and async results
        const rendered = typeof result === 'string' ? result : content;
        return React.createElement(Text, null, rendered);
    }
    catch (error) {
        // Fallback to plain text if markdown parsing fails
        console.error('Markdown rendering error:', error);
        return React.createElement(Text, null, content);
    }
}
//# sourceMappingURL=markdown-renderer.js.map