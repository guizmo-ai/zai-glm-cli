/**
 * ChatStateMachine
 *
 * Manages chat flow state transitions to ensure proper sequencing
 * of thinking, tool execution, and content streaming.
 *
 * Prevents concurrent streaming and tool execution that causes
 * the "deconstructed" response problem.
 */
/**
 * Possible chat states
 */
export type ChatState = "idle" | "thinking" | "planning_tools" | "executing_tools" | "responding" | "done" | "error";
/**
 * State transition event
 */
export interface StateTransition {
    from: ChatState;
    to: ChatState;
    timestamp: number;
    metadata?: Record<string, unknown>;
}
/**
 * ChatStateMachine - Enforces sequential chat flow
 *
 * Ensures:
 * 1. Content only streams in "responding" state
 * 2. Tools only execute in "executing_tools" state
 * 3. Invalid transitions are prevented
 */
export declare class ChatStateMachine {
    private state;
    private history;
    private listeners;
    /**
     * Valid state transitions
     */
    private readonly validTransitions;
    /**
     * Get current state
     */
    getCurrentState(): ChatState;
    /**
     * Transition to new state
     *
     * @param to - Target state
     * @param metadata - Optional metadata for the transition
     * @throws Error if transition is invalid
     */
    transition(to: ChatState, metadata?: Record<string, unknown>): void;
    /**
     * Check if content streaming is allowed
     */
    canStreamContent(): boolean;
    /**
     * Check if tool execution is allowed
     */
    canExecuteTools(): boolean;
    /**
     * Check if thinking display is allowed
     */
    canShowThinking(): boolean;
    /**
     * Check if processing is complete
     */
    isComplete(): boolean;
    /**
     * Check if in error state
     */
    isError(): boolean;
    /**
     * Check if idle
     */
    isIdle(): boolean;
    /**
     * Reset to idle state
     */
    reset(): void;
    /**
     * Get transition history
     */
    getHistory(): StateTransition[];
    /**
     * Add state change listener
     *
     * @param listener - Callback for state transitions
     * @returns Unsubscribe function
     */
    onTransition(listener: (transition: StateTransition) => void): () => void;
    /**
     * Get duration in current state
     */
    getStateDuration(): number;
    /**
     * Get total processing time
     */
    getTotalDuration(): number;
    /**
     * Force state (use with caution - for error recovery)
     */
    forceState(state: ChatState): void;
    /**
     * Create a checkpoint of current state
     */
    checkpoint(): {
        state: ChatState;
        historyLength: number;
    };
    /**
     * Restore from checkpoint (for error recovery)
     */
    restore(checkpoint: {
        state: ChatState;
        historyLength: number;
    }): void;
}
/**
 * Create a new state machine instance
 */
export declare function createChatStateMachine(): ChatStateMachine;
