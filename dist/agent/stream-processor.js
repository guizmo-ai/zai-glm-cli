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
/**
 * StreamProcessor - Handles full consumption of streaming responses
 *
 * This prevents the "deconstructed" streaming problem where content
 * streams while the model is still planning tool calls.
 */
export class StreamProcessor {
    thinking = [];
    content = [];
    accumulatedMessage = {};
    finishReason = "";
    /**
     * Process entire stream before returning
     *
     * @param stream - AsyncIterable stream from OpenAI API
     * @returns Complete processing result with separated thinking/content/tools
     */
    async process(stream) {
        // Reset state
        this.thinking = [];
        this.content = [];
        this.accumulatedMessage = {};
        this.finishReason = "";
        // Process entire stream
        for await (const chunk of stream) {
            if (!chunk.choices?.[0])
                continue;
            const delta = chunk.choices[0].delta;
            const finishReason = chunk.choices[0].finish_reason;
            // Accumulate reasoning/thinking
            if (delta?.reasoning_content) {
                this.thinking.push(delta.reasoning_content);
            }
            // Accumulate text content
            if (delta?.content) {
                this.content.push(delta.content);
            }
            // Accumulate message using reducer
            this.accumulatedMessage = this.messageReducer(this.accumulatedMessage, chunk);
            // Capture finish reason
            if (finishReason) {
                this.finishReason = finishReason;
            }
        }
        return {
            thinking: this.thinking.join(""),
            content: this.content.join(""),
            toolCalls: this.accumulatedMessage.tool_calls || [],
            finishReason: this.finishReason || "stop",
            message: this.accumulatedMessage,
        };
    }
    /**
     * Check if stream processing resulted in tool calls
     */
    hasToolCalls(result) {
        return (result.finishReason === "tool_calls" && result.toolCalls.length > 0);
    }
    /**
     * Message reducer - accumulates deltas into complete message
     * Handles tool_calls accumulation with proper indexing
     *
     * @param accumulated - Previously accumulated message
     * @param chunk - New stream chunk
     * @returns Updated accumulated message
     */
    messageReducer(accumulated, chunk) {
        const delta = chunk.choices?.[0]?.delta;
        if (!delta)
            return accumulated;
        // Initialize if needed
        if (!accumulated.role && delta.role) {
            accumulated.role = delta.role;
        }
        // Accumulate content
        if (delta.content) {
            accumulated.content = (accumulated.content || "") + delta.content;
        }
        // Accumulate reasoning
        if (delta.reasoning_content) {
            accumulated.reasoning_content =
                (accumulated.reasoning_content || "") + delta.reasoning_content;
        }
        // Accumulate tool calls
        if (delta.tool_calls) {
            if (!accumulated.tool_calls) {
                accumulated.tool_calls = [];
            }
            for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index ?? 0;
                // Initialize tool call at index if needed
                if (!accumulated.tool_calls[index]) {
                    accumulated.tool_calls[index] = {
                        id: toolCallDelta.id || "",
                        type: "function",
                        function: {
                            name: "",
                            arguments: "",
                        },
                    };
                }
                const toolCall = accumulated.tool_calls[index];
                // Update tool call ID
                if (toolCallDelta.id) {
                    toolCall.id = toolCallDelta.id;
                }
                // type is always "function", no need to update
                // Accumulate function details
                if (toolCallDelta.function) {
                    if (toolCallDelta.function.name) {
                        toolCall.function.name += toolCallDelta.function.name;
                    }
                    if (toolCallDelta.function.arguments) {
                        toolCall.function.arguments += toolCallDelta.function.arguments;
                    }
                }
            }
        }
        return accumulated;
    }
    /**
     * Get current accumulated message
     */
    getMessage() {
        return this.accumulatedMessage;
    }
    /**
     * Get finish reason
     */
    getFinishReason() {
        return this.finishReason;
    }
}
//# sourceMappingURL=stream-processor.js.map