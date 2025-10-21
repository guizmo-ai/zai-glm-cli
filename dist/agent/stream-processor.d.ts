/**
 * StreamProcessor
 *
 * Handles sequential processing of OpenAI streaming responses.
 * Inspired by SST OpenCode's architecture to prevent "deconstructed" streaming.
 *
 * Key Principles:
 * 1. Process ENTIRE stream before returning control
 * 2. Separate thinking, content, and tool calls
 * 3. Enable sequential tool execution before final response
 */
import type { ZaiToolCall } from "../zai/client.js";
/**
 * Accumulated message during stream processing
 */
interface AccumulatedMessage {
    role?: string;
    content?: string;
    tool_calls?: ZaiToolCall[];
    reasoning_content?: string;
}
/**
 * Result after processing complete stream
 */
export interface ProcessorResult {
    /** Reasoning/thinking content (if model supports it) */
    thinking: string;
    /** Text content for final response */
    content: string;
    /** Tool calls to execute */
    toolCalls: ZaiToolCall[];
    /** Finish reason from the stream */
    finishReason: string;
    /** Complete accumulated message */
    message: AccumulatedMessage;
}
/**
 * Stream chunk from OpenAI API
 */
interface StreamChunk {
    id?: string;
    choices?: Array<{
        delta?: {
            role?: string;
            content?: string;
            tool_calls?: Array<{
                index?: number;
                id?: string;
                type?: string;
                function?: {
                    name?: string;
                    arguments?: string;
                };
            }>;
            reasoning_content?: string;
        };
        finish_reason?: string | null;
        index?: number;
    }>;
    created?: number;
    model?: string;
    object?: string;
}
/**
 * StreamProcessor - Handles full consumption of streaming responses
 *
 * This prevents the "deconstructed" streaming problem where content
 * streams while the model is still planning tool calls.
 */
export declare class StreamProcessor {
    private thinking;
    private content;
    private accumulatedMessage;
    private finishReason;
    /**
     * Process entire stream before returning
     *
     * @param stream - AsyncIterable stream from OpenAI API
     * @returns Complete processing result with separated thinking/content/tools
     */
    process(stream: AsyncIterable<StreamChunk>): Promise<ProcessorResult>;
    /**
     * Check if stream processing resulted in tool calls
     */
    hasToolCalls(result: ProcessorResult): boolean;
    /**
     * Message reducer - accumulates deltas into complete message
     * Handles tool_calls accumulation with proper indexing
     *
     * @param accumulated - Previously accumulated message
     * @param chunk - New stream chunk
     * @returns Updated accumulated message
     */
    private messageReducer;
    /**
     * Get current accumulated message
     */
    getMessage(): AccumulatedMessage;
    /**
     * Get finish reason
     */
    getFinishReason(): string;
}
export {};
