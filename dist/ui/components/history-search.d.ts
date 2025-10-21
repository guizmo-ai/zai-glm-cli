import React from "react";
import { HistoryEntry } from "../../utils/history-manager.js";
interface HistorySearchProps {
    query: string;
    results: HistoryEntry[];
    selectedIndex: number;
    isVisible: boolean;
    maxResults?: number;
}
/**
 * History search component for Ctrl+R reverse search
 * Displays matching history entries with highlighted selection
 */
export declare function HistorySearch({ query, results, selectedIndex, isVisible, maxResults, }: HistorySearchProps): React.JSX.Element;
export {};
