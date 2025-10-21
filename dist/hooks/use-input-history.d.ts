export interface InputHistoryHook {
    addToHistory: (input: string) => void;
    navigateHistory: (direction: "up" | "down") => string | null;
    getCurrentHistoryIndex: () => number;
    resetHistory: () => void;
    isNavigatingHistory: () => boolean;
    setOriginalInput: (input: string) => void;
}
export declare function useInputHistory(): InputHistoryHook;
