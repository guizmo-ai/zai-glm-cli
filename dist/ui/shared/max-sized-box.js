import React from 'react';
import { Box } from 'ink';
export const MaxSizedBox = ({ maxHeight, maxWidth, children, ...props }) => {
    return (React.createElement(Box, { flexDirection: "column", ...props }, children));
};
//# sourceMappingURL=max-sized-box.js.map