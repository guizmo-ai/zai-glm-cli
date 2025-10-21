import { useState, useCallback } from "react";
export function useInputHistory() {
    const [history, setHistory] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [originalInput, setOriginalInput] = useState("");
    const addToHistory = useCallback((input) => {
        if (input.trim() && !history.includes(input.trim())) {
            setHistory(prev => [...prev, input.trim()]);
        }
        setCurrentIndex(-1);
        setOriginalInput("");
    }, [history]);
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
        setHistory([]);
        setCurrentIndex(-1);
        setOriginalInput("");
    }, []);
    const isNavigatingHistory = useCallback(() => currentIndex !== -1, [currentIndex]);
    const setOriginalInputCallback = useCallback((input) => {
        if (currentIndex === -1) {
            setOriginalInput(input);
        }
    }, [currentIndex]);
    return {
        addToHistory,
        navigateHistory,
        getCurrentHistoryIndex,
        resetHistory,
        isNavigatingHistory,
        setOriginalInput: setOriginalInputCallback,
    };
}
//# sourceMappingURL=use-input-history.js.map