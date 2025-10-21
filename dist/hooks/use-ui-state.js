import { useReducer, useMemo } from "react";
/**
 * Initial state factory
 */
export const createInitialState = () => ({
    mode: { type: "CHAT", isStreaming: false, isProcessing: false },
    processingTime: 0,
    tokenCount: 0,
    thinkingContent: "",
    showThinking: false,
    watcherActive: false,
    watchPath: null,
    recentChanges: 0,
});
/**
 * UI State Reducer - Manages all state transitions
 */
export function uiStateReducer(state, action) {
    switch (action.type) {
        case "START_STREAMING":
            return {
                ...state,
                mode: { type: "CHAT", isStreaming: true, isProcessing: state.mode.type === "CHAT" ? state.mode.isProcessing : true },
            };
        case "STOP_STREAMING":
            return {
                ...state,
                mode: state.mode.type === "CHAT"
                    ? { ...state.mode, isStreaming: false }
                    : state.mode,
            };
        case "START_PROCESSING":
            return {
                ...state,
                mode: { type: "CHAT", isStreaming: state.mode.type === "CHAT" ? state.mode.isStreaming : false, isProcessing: true },
            };
        case "STOP_PROCESSING":
            return {
                ...state,
                mode: state.mode.type === "CHAT"
                    ? { ...state.mode, isProcessing: false }
                    : state.mode,
                processingTime: 0,
            };
        case "SHOW_CONFIRMATION":
            return {
                ...state,
                mode: { type: "CONFIRMING", operation: action.payload },
            };
        case "CONFIRM":
        case "CANCEL":
            return {
                ...state,
                mode: { type: "CHAT", isStreaming: false, isProcessing: false },
                processingTime: 0,
                tokenCount: 0,
            };
        case "UPDATE_PROCESSING_TIME":
            return {
                ...state,
                processingTime: action.payload,
            };
        case "UPDATE_TOKEN_COUNT":
            return {
                ...state,
                tokenCount: action.payload,
            };
        case "UPDATE_THINKING_CONTENT":
            return {
                ...state,
                thinkingContent: action.payload,
            };
        case "CLEAR_THINKING_CONTENT":
            return {
                ...state,
                thinkingContent: "",
            };
        case "SET_SHOW_THINKING":
            return {
                ...state,
                showThinking: action.payload,
            };
        case "TOGGLE_SHOW_THINKING":
            return {
                ...state,
                showThinking: !state.showThinking,
            };
        case "SET_WATCHER_ACTIVE":
            return {
                ...state,
                watcherActive: action.payload,
            };
        case "SET_WATCH_PATH":
            return {
                ...state,
                watchPath: action.payload,
            };
        case "INCREMENT_RECENT_CHANGES":
            return {
                ...state,
                recentChanges: state.recentChanges + 1,
            };
        case "DECREMENT_RECENT_CHANGES":
            return {
                ...state,
                recentChanges: Math.max(0, state.recentChanges - 1),
            };
        case "RESET_PROCESSING":
            return {
                ...state,
                mode: { type: "CHAT", isStreaming: false, isProcessing: false },
                processingTime: 0,
                tokenCount: 0,
            };
        default:
            return state;
    }
}
/**
 * Custom hook for UI state management
 */
export function useUIState(initialState) {
    const [state, dispatch] = useReducer(uiStateReducer, initialState ? { ...createInitialState(), ...initialState } : createInitialState());
    // Helper selectors for common UI states
    const selectors = useMemo(() => ({
        isInChatMode: state.mode.type === "CHAT",
        isConfirming: state.mode.type === "CONFIRMING",
        isStreaming: state.mode.type === "CHAT" && state.mode.isStreaming,
        isProcessing: state.mode.type === "CHAT" && state.mode.isProcessing,
        confirmationOptions: state.mode.type === "CONFIRMING" ? state.mode.operation : null,
        canAcceptInput: state.mode.type === "CHAT" && !state.mode.isProcessing && !state.mode.isStreaming,
        isWatcherActive: state.watcherActive,
        hasThinkingContent: state.thinkingContent.length > 0,
        shouldShowThinking: state.showThinking && state.thinkingContent.length > 0,
    }), [state]);
    // Convenience action creators
    const actions = useMemo(() => ({
        startStreaming: () => dispatch({ type: "START_STREAMING" }),
        stopStreaming: () => dispatch({ type: "STOP_STREAMING" }),
        startProcessing: () => dispatch({ type: "START_PROCESSING" }),
        stopProcessing: () => dispatch({ type: "STOP_PROCESSING" }),
        showConfirmation: (options) => dispatch({ type: "SHOW_CONFIRMATION", payload: options }),
        confirm: () => dispatch({ type: "CONFIRM" }),
        cancel: () => dispatch({ type: "CANCEL" }),
        updateProcessingTime: (time) => dispatch({ type: "UPDATE_PROCESSING_TIME", payload: time }),
        updateTokenCount: (count) => dispatch({ type: "UPDATE_TOKEN_COUNT", payload: count }),
        updateThinkingContent: (content) => dispatch({ type: "UPDATE_THINKING_CONTENT", payload: content }),
        clearThinkingContent: () => dispatch({ type: "CLEAR_THINKING_CONTENT" }),
        setShowThinking: (show) => dispatch({ type: "SET_SHOW_THINKING", payload: show }),
        toggleShowThinking: () => dispatch({ type: "TOGGLE_SHOW_THINKING" }),
        setWatcherActive: (active) => dispatch({ type: "SET_WATCHER_ACTIVE", payload: active }),
        setWatchPath: (path) => dispatch({ type: "SET_WATCH_PATH", payload: path }),
        incrementRecentChanges: () => dispatch({ type: "INCREMENT_RECENT_CHANGES" }),
        decrementRecentChanges: () => dispatch({ type: "DECREMENT_RECENT_CHANGES" }),
        resetProcessing: () => dispatch({ type: "RESET_PROCESSING" }),
    }), [dispatch]);
    return {
        state,
        dispatch,
        selectors,
        actions,
    };
}
/**
 * Type guard helpers
 */
export function isChatMode(mode) {
    return mode.type === "CHAT";
}
export function isConfirmingMode(mode) {
    return mode.type === "CONFIRMING";
}
//# sourceMappingURL=use-ui-state.js.map