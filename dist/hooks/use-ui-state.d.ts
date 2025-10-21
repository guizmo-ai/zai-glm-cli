import { ConfirmationOptions } from "../utils/confirmation-service.js";
/**
 * UI Mode Types - Discriminated Union for Type Safety
 */
export type UIMode = {
    type: "CHAT";
    isStreaming: boolean;
    isProcessing: boolean;
} | {
    type: "CONFIRMING";
    operation: ConfirmationOptions;
} | {
    type: "THINKING";
    content: string;
    isStreaming: boolean;
};
/**
 * Complete UI State
 */
export interface UIState {
    mode: UIMode;
    processingTime: number;
    tokenCount: number;
    thinkingContent: string;
    showThinking: boolean;
    watcherActive: boolean;
    watchPath: string | null;
    recentChanges: number;
}
/**
 * UI Actions - All possible state transitions
 */
export type UIAction = {
    type: "START_STREAMING";
} | {
    type: "STOP_STREAMING";
} | {
    type: "START_PROCESSING";
} | {
    type: "STOP_PROCESSING";
} | {
    type: "SHOW_CONFIRMATION";
    payload: ConfirmationOptions;
} | {
    type: "CONFIRM";
} | {
    type: "CANCEL";
} | {
    type: "UPDATE_PROCESSING_TIME";
    payload: number;
} | {
    type: "UPDATE_TOKEN_COUNT";
    payload: number;
} | {
    type: "UPDATE_THINKING_CONTENT";
    payload: string;
} | {
    type: "CLEAR_THINKING_CONTENT";
} | {
    type: "SET_SHOW_THINKING";
    payload: boolean;
} | {
    type: "TOGGLE_SHOW_THINKING";
} | {
    type: "SET_WATCHER_ACTIVE";
    payload: boolean;
} | {
    type: "SET_WATCH_PATH";
    payload: string | null;
} | {
    type: "INCREMENT_RECENT_CHANGES";
} | {
    type: "DECREMENT_RECENT_CHANGES";
} | {
    type: "RESET_PROCESSING";
};
/**
 * Initial state factory
 */
export declare const createInitialState: () => UIState;
/**
 * UI State Reducer - Manages all state transitions
 */
export declare function uiStateReducer(state: UIState, action: UIAction): UIState;
/**
 * Custom hook for UI state management
 */
export declare function useUIState(initialState?: Partial<UIState>): {
    state: UIState;
    dispatch: import("react").Dispatch<UIAction>;
    selectors: {
        isInChatMode: boolean;
        isConfirming: boolean;
        isStreaming: boolean;
        isProcessing: boolean;
        confirmationOptions: ConfirmationOptions;
        canAcceptInput: boolean;
        isWatcherActive: boolean;
        hasThinkingContent: boolean;
        shouldShowThinking: boolean;
    };
    actions: {
        startStreaming: () => void;
        stopStreaming: () => void;
        startProcessing: () => void;
        stopProcessing: () => void;
        showConfirmation: (options: ConfirmationOptions) => void;
        confirm: () => void;
        cancel: () => void;
        updateProcessingTime: (time: number) => void;
        updateTokenCount: (count: number) => void;
        updateThinkingContent: (content: string) => void;
        clearThinkingContent: () => void;
        setShowThinking: (show: boolean) => void;
        toggleShowThinking: () => void;
        setWatcherActive: (active: boolean) => void;
        setWatchPath: (path: string | null) => void;
        incrementRecentChanges: () => void;
        decrementRecentChanges: () => void;
        resetProcessing: () => void;
    };
};
/**
 * Type guard helpers
 */
export declare function isChatMode(mode: UIMode): mode is {
    type: "CHAT";
    isStreaming: boolean;
    isProcessing: boolean;
};
export declare function isConfirmingMode(mode: UIMode): mode is {
    type: "CONFIRMING";
    operation: ConfirmationOptions;
};
