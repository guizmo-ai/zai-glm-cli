import React, { useMemo } from "react";
import { Box, Text } from "ink";
export const MAX_SUGGESTIONS = 8;
export function filterCommandSuggestions(suggestions, input) {
    const lowerInput = input.toLowerCase();
    return suggestions
        .filter((s) => s.command.toLowerCase().startsWith(lowerInput))
        .slice(0, MAX_SUGGESTIONS);
}
export function CommandSuggestions({ suggestions, input, selectedIndex, isVisible, }) {
    if (!isVisible)
        return null;
    const filteredSuggestions = useMemo(() => filterCommandSuggestions(suggestions, input), [suggestions, input]);
    return (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
        filteredSuggestions.map((suggestion, index) => (React.createElement(Box, { key: index, paddingLeft: 1 },
            React.createElement(Text, { color: index === selectedIndex ? "black" : "white", backgroundColor: index === selectedIndex ? "cyan" : undefined }, suggestion.command),
            React.createElement(Box, { marginLeft: 1 },
                React.createElement(Text, { color: "gray" }, suggestion.description))))),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "gray", dimColor: true }, "\u2191\u2193 navigate \u2022 Enter/Tab select \u2022 Esc cancel"))));
}
//# sourceMappingURL=command-suggestions.js.map