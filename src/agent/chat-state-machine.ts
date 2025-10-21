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
export type ChatState =
  | "idle" // No active processing
  | "thinking" // Model is reasoning (may include o1 reasoning tokens)
  | "planning_tools" // Model preparing tool calls
  | "executing_tools" // Tools are being executed
  | "responding" // Final response streaming
  | "done" // Processing complete
  | "error"; // Error occurred

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
export class ChatStateMachine {
  private state: ChatState = "idle";
  private history: StateTransition[] = [];
  private listeners: Set<(transition: StateTransition) => void> = new Set();

  /**
   * Valid state transitions
   */
  private readonly validTransitions: Record<ChatState, ChatState[]> = {
    idle: ["thinking"],
    thinking: ["planning_tools", "responding", "done", "error"],
    planning_tools: ["executing_tools", "error"],
    executing_tools: ["thinking", "responding", "done", "error"],
    responding: ["done", "error"],
    done: ["idle"],
    error: ["idle"],
  };

  /**
   * Get current state
   */
  getCurrentState(): ChatState {
    return this.state;
  }

  /**
   * Transition to new state
   *
   * @param to - Target state
   * @param metadata - Optional metadata for the transition
   * @throws Error if transition is invalid
   */
  transition(to: ChatState, metadata?: Record<string, unknown>): void {
    const validTargets = this.validTransitions[this.state] || [];

    if (!validTargets.includes(to)) {
      throw new Error(
        `Invalid state transition: ${this.state} -> ${to}. Valid transitions from ${this.state}: ${validTargets.join(", ")}`
      );
    }

    const transition: StateTransition = {
      from: this.state,
      to,
      timestamp: Date.now(),
      metadata,
    };

    this.state = to;
    this.history.push(transition);

    // Notify listeners
    for (const listener of this.listeners) {
      listener(transition);
    }
  }

  /**
   * Check if content streaming is allowed
   */
  canStreamContent(): boolean {
    return this.state === "responding";
  }

  /**
   * Check if tool execution is allowed
   */
  canExecuteTools(): boolean {
    return this.state === "executing_tools";
  }

  /**
   * Check if thinking display is allowed
   */
  canShowThinking(): boolean {
    return this.state === "thinking" || this.state === "planning_tools";
  }

  /**
   * Check if processing is complete
   */
  isComplete(): boolean {
    return this.state === "done" || this.state === "error";
  }

  /**
   * Check if in error state
   */
  isError(): boolean {
    return this.state === "error";
  }

  /**
   * Check if idle
   */
  isIdle(): boolean {
    return this.state === "idle";
  }

  /**
   * Reset to idle state
   */
  reset(): void {
    this.state = "idle";
    this.history = [];
  }

  /**
   * Get transition history
   */
  getHistory(): StateTransition[] {
    return [...this.history];
  }

  /**
   * Add state change listener
   *
   * @param listener - Callback for state transitions
   * @returns Unsubscribe function
   */
  onTransition(
    listener: (transition: StateTransition) => void
  ): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get duration in current state
   */
  getStateDuration(): number {
    if (this.history.length === 0) return 0;

    const lastTransition = this.history[this.history.length - 1];
    return Date.now() - lastTransition.timestamp;
  }

  /**
   * Get total processing time
   */
  getTotalDuration(): number {
    if (this.history.length === 0) return 0;

    const first = this.history[0];
    const last = this.history[this.history.length - 1];
    return last.timestamp - first.timestamp;
  }

  /**
   * Force state (use with caution - for error recovery)
   */
  forceState(state: ChatState): void {
    this.state = state;
  }

  /**
   * Create a checkpoint of current state
   */
  checkpoint(): {
    state: ChatState;
    historyLength: number;
  } {
    return {
      state: this.state,
      historyLength: this.history.length,
    };
  }

  /**
   * Restore from checkpoint (for error recovery)
   */
  restore(checkpoint: { state: ChatState; historyLength: number }): void {
    this.state = checkpoint.state;
    this.history = this.history.slice(0, checkpoint.historyLength);
  }
}

/**
 * Create a new state machine instance
 */
export function createChatStateMachine(): ChatStateMachine {
  return new ChatStateMachine();
}
