import { useState, useCallback, useRef } from "react";
export function useHistorySearch(inputHistory) {
    const [isActive, setIsActive] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const originalInputRef = useRef("");
    const activate = useCallback(() => {
        setIsActive(true);
    }, []);
    const deactivate = useCallback(() => {
        setIsActive(false);
        setQuery("");
        setResults([]);
        setSelectedIndex(0);
    }, []);
    const updateQuery = useCallback((newQuery) => {
        setQuery(newQuery);
        const searchResults = inputHistory.searchHistory(newQuery);
        setResults(searchResults);
        setSelectedIndex(searchResults.length > 0 ? searchResults.length - 1 : 0);
    }, [inputHistory]);
    const navigateResults = useCallback((direction) => {
        if (results.length === 0)
            return;
        if (direction === "up") {
            const newIndex = selectedIndex > 0 ? selectedIndex - 1 : results.length - 1;
            setSelectedIndex(newIndex);
        }
        else {
            const newIndex = (selectedIndex + 1) % results.length;
            setSelectedIndex(newIndex);
        }
    }, [results.length, selectedIndex]);
    const selectResult = useCallback(() => {
        if (results.length > 0 && selectedIndex >= 0) {
            return results[selectedIndex].command;
        }
        return null;
    }, [results, selectedIndex]);
    const handleBackspace = useCallback(() => {
        if (query.length > 0) {
            const newQuery = query.slice(0, -1);
            updateQuery(newQuery);
        }
    }, [query, updateQuery]);
    const handleEscape = useCallback((currentInput) => {
        deactivate();
        return originalInputRef.current;
    }, [deactivate]);
    const handleReturn = useCallback(() => {
        const selected = selectResult();
        deactivate();
        return selected;
    }, [selectResult, deactivate]);
    const handleCtrlR = useCallback((currentInput) => {
        if (!isActive) {
            // Start history search
            originalInputRef.current = currentInput;
            setIsActive(true);
            setQuery("");
            const searchResults = inputHistory.searchHistory("");
            setResults(searchResults);
            setSelectedIndex(searchResults.length > 0 ? searchResults.length - 1 : 0);
        }
        else {
            // Navigate to previous match (reverse through history)
            if (results.length > 0) {
                const newIndex = selectedIndex > 0 ? selectedIndex - 1 : results.length - 1;
                setSelectedIndex(newIndex);
            }
        }
    }, [isActive, inputHistory, results.length, selectedIndex]);
    return {
        // State
        isActive,
        query,
        results,
        selectedIndex,
        // Actions
        activate,
        deactivate,
        updateQuery,
        navigateResults,
        selectResult,
        // Handlers
        handleBackspace,
        handleEscape,
        handleReturn,
        handleCtrlR,
    };
}
//# sourceMappingURL=use-history-search.js.map