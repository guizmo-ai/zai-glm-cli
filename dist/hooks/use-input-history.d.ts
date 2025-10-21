import { HistoryEntry } from "../utils/history-manager.js";
export interface InputHistoryHook {
    addToHistory: (input: string, metadata?: {
        workingDirectory?: string;
        model?: string;
    }) => void;
    navigateHistory: (direction: "up" | "down") => string | null;
    getCurrentHistoryIndex: () => number;
    resetHistory: () => void;
    isNavigatingHistory: () => boolean;
    setOriginalInput: (input: string) => void;
    searchHistory: (query: string) => HistoryEntry[];
    getHistory: () => string[];
}
export declare function useInputHistory(): InputHistoryHook;
