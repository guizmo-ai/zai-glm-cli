# zai-cli Architecture

## Sequential Streaming Architecture

### Overview

zai-cli uses a sequential streaming architecture inspired by SST OpenCode to prevent "deconstructed" responses where the model streams text while simultaneously planning/executing tools.

### Core Components

#### 1. StreamProcessor (`src/agent/stream-processor.ts`)

**Purpose**: Process entire API stream before yielding to UI

```typescript
const processor = new StreamProcessor();
const result = await processor.process(stream); // Blocks until stream complete

// result contains:
// - thinking: o1-style reasoning content
// - content: Final response text
// - toolCalls: Array of tools to execute
// - finishReason: "stop" | "tool_calls" | "length"
```

**Key Method**: `process(stream)` - Consumes full AsyncIterable stream and returns complete result

**Benefits**:
- Prevents streaming during tool preparation
- Separates concerns (thinking vs content vs tools)
- Enables sequential decision-making

#### 2. ChatStateMachine (`src/agent/chat-state-machine.ts`)

**Purpose**: Enforce valid state transitions during chat flow

**States**:
```
idle → thinking → planning_tools → executing_tools → responding → done
                ↘                                   ↗
                  ────────────────────────────────
```

**Transitions**:
- `idle → thinking`: User sends message
- `thinking → planning_tools`: Model decides to use tools
- `thinking → responding`: Model has final answer (no tools)
- `planning_tools → executing_tools`: Tools are being executed
- `executing_tools → thinking`: Loop back after tool results
- `executing_tools → responding`: Final response after last tools
- `responding → done`: Streaming complete
- `* → error`: Error occurred

**Guards**:
- `canStreamContent()`: Only true in `responding` state
- `canExecuteTools()`: Only true in `executing_tools` state
- `canShowThinking()`: True in `thinking` or `planning_tools` states

#### 3. ZaiAgent Refactored Flow

**Old Flow (Problematic)**:
```typescript
for await (const chunk of stream) {
  if (chunk.delta.content) {
    yield { type: "content", content }  // ❌ Streaming immediately
  }
  if (chunk.delta.tool_calls) {
    accumulate tool calls               // ❌ While still streaming
  }
}
// Execute tools after stream
```

**New Flow (Sequential)**:
```typescript
while (toolRounds < maxToolRounds) {
  stateMachine.transition("thinking");

  // 1. Process ENTIRE stream (blocking)
  const processor = new StreamProcessor();
  const result = await processor.process(stream);

  // 2. Check for tool calls BEFORE streaming
  if (processor.hasToolCalls(result)) {
    stateMachine.transition("planning_tools");
    yield { type: "tool_calls", toolCalls: result.toolCalls };

    stateMachine.transition("executing_tools");
    // Execute all tools
    for (const toolCall of result.toolCalls) {
      const toolResult = await executeTool(toolCall);
      yield { type: "tool_result", toolCall, toolResult };
    }

    continue; // Loop to get next response
  }

  // 3. No tool calls - stream final content
  stateMachine.transition("responding");
  for (const word of result.content.split(/(\s+)/)) {
    yield { type: "content", content: word };
  }

  stateMachine.transition("done");
  break;
}
```

### Sequence Diagram

```
User Input
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ ZaiAgent.processUserMessageStream()                     │
│                                                          │
│  ┌──────────────────────────────────────────────┐      │
│  │ State: thinking                               │      │
│  │                                                │      │
│  │  StreamProcessor.process(stream)              │      │
│  │  ├─ Accumulate thinking                       │      │
│  │  ├─ Accumulate content                        │      │
│  │  ├─ Accumulate tool calls                     │      │
│  │  └─ Return complete result                    │      │
│  └──────────────────────────────────────────────┘      │
│           │                                              │
│           ▼                                              │
│      Has tool calls?                                     │
│       /          \                                       │
│    YES            NO                                     │
│     │              │                                     │
│     ▼              ▼                                     │
│  ┌─────────────┐  ┌──────────────┐                     │
│  │ State:      │  │ State:        │                     │
│  │ planning    │  │ responding    │                     │
│  │ tools       │  │               │                     │
│  └─────────────┘  │ Stream content│                     │
│     │             │ word-by-word  │                     │
│     ▼             └───────────────┘                     │
│  ┌─────────────┐         │                              │
│  │ State:      │         ▼                              │
│  │ executing   │      ┌──────┐                          │
│  │ tools       │      │ DONE │                          │
│  │             │      └──────┘                          │
│  │ Execute all │                                         │
│  │ tools       │                                         │
│  └─────────────┘                                         │
│     │                                                    │
│     └──────► Loop back to thinking                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Benefits of Sequential Architecture

1. **No Deconstructed Responses**
   - Content only streams after tool execution completes
   - Users see complete, coherent responses

2. **Clear State Boundaries**
   - State machine enforces valid transitions
   - Easier to debug and reason about

3. **Better User Experience**
   - Thinking/reasoning shown separately
   - Tool execution visible
   - Final response streams smoothly

4. **Maintainable Code**
   - Separation of concerns
   - Testable components
   - Clear control flow

### Comparison: Before vs After

**Before (Concurrent)**:
```
User: "Create a React component"

[Streaming...] "I'll help you create a Re"
[Streaming...] "act component. Let me firs"
[Tool: view_file] ← Announced mid-stream
[Executing view_file...]
[Tool result shown]
[Streaming...] "t check the existing code"
[Streaming...] " and then create it."
```

**After (Sequential)**:
```
User: "Create a React component"

[Thinking...] "User wants React component..."
[Tool: view_file] ← All tools announced upfront
[Executing view_file...]
[Tool result shown]
[Tool: text_editor]
[Executing text_editor...]
[Tool result shown]
[Streaming...] "I've created a new React "
[Streaming...] "component with the specified "
[Streaming...] "functionality."
```

### Testing

All components are fully tested:
- **StreamProcessor**: Message accumulation, tool call parsing
- **ChatStateMachine**: State transitions, guards, invalid transitions
- **Integration**: 302 tests passing including e2e workflows

### Future Enhancements

1. **Event Bus System** (Planned)
   - Decouple UI updates from agent logic
   - Real-time progress notifications
   - Multiple subscribers

2. **Permission System** (Planned)
   - Pre-execution tool approval
   - Session-level permission caching
   - User confirmation dialogs

3. **Streaming Improvements** (Planned)
   - Character-by-character for thinking
   - Configurable streaming speed
   - Pause/resume support

### References

- SST OpenCode: https://github.com/sst/opencode
- Vercel AI SDK: https://sdk.vercel.ai/docs/ai-sdk-core/stream-text
- Architecture Analysis: `docs/opencode-analysis.md` (if created)
