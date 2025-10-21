import React from 'react';
import { Box, Text } from 'ink';
export default function FileWatcherIndicator({ isActive, watchPath, recentChanges, }) {
    if (!isActive) {
        return null;
    }
    return (React.createElement(Box, null,
        React.createElement(Text, { color: "cyan" }, "watching"),
        recentChanges > 0 && (React.createElement(Text, { color: "yellow" },
            " (",
            recentChanges,
            " changes)"))));
}
//# sourceMappingURL=file-watcher-indicator.js.map