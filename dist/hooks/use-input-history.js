import { useState, useCallback, useEffect, useMemo } from "react";
import { getHistoryManager } from "../utils/history-manager.js";
import { getSettingsManager } from "../utils/settings-manager.js";
export function useInputHistory() {
    const historyManager = useMemo(() => getHistoryManager(), []);
    const settingsManager = useMemo(() => getSettingsManager(), []);
    const [history, setHistory] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [originalInput, setOriginalInput] = useState("");
    // Load history from persistent storage on mount
    useEffect(() => {
        const historyEnabled = settingsManager.getUserSetting("enableHistory") ?? true;
        if (historyEnabled) {
            const loadedHistory = historyManager.getAllCommands();
            setHistory(loadedHistory);
        }
    }, [historyManager, settingsManager]);
    const addToHistory = useCallback((input, metadata) => {
        const historyEnabled = settingsManager.getUserSetting("enableHistory") ?? true;
        if (!historyEnabled || !input.trim()) {
            return;
        }
        // Add to persistent storage
        historyManager.addEntry(input.trim(), metadata);
        // Update local state
        const updatedHistory = historyManager.getAllCommands();
        setHistory(updatedHistory);
        setCurrentIndex(-1);
        setOriginalInput("");
    }, [historyManager, settingsManager]);
    const navigateHistory = useCallback((direction) => {
        if (history.length === 0)
            return null;
        let newIndex;
        if (direction === "up") {
            if (currentIndex === -1) {
                newIndex = history.length - 1;
            }
            else {
                newIndex = Math.max(0, currentIndex - 1);
            }
        }
        else {
            if (currentIndex === -1) {
                return null;
            }
            else if (currentIndex === history.length - 1) {
                newIndex = -1;
                return originalInput;
            }
            else {
                newIndex = Math.min(history.length - 1, currentIndex + 1);
            }
        }
        setCurrentIndex(newIndex);
        return newIndex === -1 ? originalInput : history[newIndex];
    }, [history, currentIndex, originalInput]);
    const getCurrentHistoryIndex = useCallback(() => currentIndex, [currentIndex]);
    const resetHistory = useCallback(() => {
        // Only reset navigation state, not the persistent history
        setCurrentIndex(-1);
        setOriginalInput("");
    }, []);
    const isNavigatingHistory = useCallback(() => currentIndex !== -1, [currentIndex]);
    const setOriginalInputCallback = useCallback((input) => {
        if (currentIndex === -1) {
            setOriginalInput(input);
        }
    }, [currentIndex]);
    const searchHistory = useCallback((query) => {
        return historyManager.search({
            query,
            fuzzy: true,
            limit: 50,
        });
    }, [historyManager]);
    const getHistory = useCallback(() => {
        return [...history];
    }, [history]);
    return {
        addToHistory,
        navigateHistory,
        getCurrentHistoryIndex,
        resetHistory,
        isNavigatingHistory,
        setOriginalInput: setOriginalInputCallback,
        searchHistory,
        getHistory,
    };
}
//# sourceMappingURL=use-input-history.js.map