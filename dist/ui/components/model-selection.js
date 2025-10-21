import React from "react";
import { Box, Text } from "ink";
export function ModelSelection({ models, selectedIndex, isVisible, currentModel, }) {
    if (!isVisible)
        return null;
    return (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "cyan" },
                "Select ZAI Model (current: ",
                currentModel,
                "):")),
        models.map((modelOption, index) => (React.createElement(Box, { key: index, paddingLeft: 1 },
            React.createElement(Text, { color: index === selectedIndex ? "black" : "white", backgroundColor: index === selectedIndex ? "cyan" : undefined }, modelOption.model)))),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "gray", dimColor: true }, "\u2191\u2193 navigate \u2022 Enter/Tab select \u2022 Esc cancel"))));
}
//# sourceMappingURL=model-selection.js.map