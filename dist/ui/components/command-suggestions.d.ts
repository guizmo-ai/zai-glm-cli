import React from "react";
interface CommandSuggestion {
    command: string;
    description: string;
}
interface CommandSuggestionsProps {
    suggestions: CommandSuggestion[];
    input: string;
    selectedIndex: number;
    isVisible: boolean;
}
export declare const MAX_SUGGESTIONS = 8;
export declare function filterCommandSuggestions<T extends {
    command: string;
}>(suggestions: T[], input: string): T[];
export declare function CommandSuggestions({ suggestions, input, selectedIndex, isVisible, }: CommandSuggestionsProps): React.JSX.Element;
export {};
