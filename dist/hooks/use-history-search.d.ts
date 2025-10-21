import { InputHistoryHook } from "./use-input-history.js";
import { HistoryEntry } from "../utils/history-manager.js";
export interface HistorySearchHook {
    isActive: boolean;
    query: string;
    results: HistoryEntry[];
    selectedIndex: number;
    activate: () => void;
    deactivate: () => void;
    updateQuery: (query: string) => void;
    navigateResults: (direction: "up" | "down") => void;
    selectResult: () => string | null;
    handleBackspace: () => void;
    handleEscape: (currentInput: string) => string;
    handleReturn: () => string | null;
    handleCtrlR: (currentInput: string) => void;
}
export declare function useHistorySearch(inputHistory: InputHistoryHook): HistorySearchHook;
