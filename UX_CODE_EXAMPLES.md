# UX/UI Issues - Code Examples and Fixes

## 1. CRITICAL ISSUES WITH CODE EXAMPLES

### Issue 1: Generic Error Messages (API Key Validation)

**Location:** `/src/ui/components/api-key-input.tsx` lines 43-71

**Current Code:**
```typescript
const handleSubmit = async () => {
  if (!input.trim()) {
    setError("API key cannot be empty");
    return;
  }

  setIsSubmitting(true);
  try {
    const apiKey = input.trim();
    const agent = new ZaiAgent(apiKey);
    
    // Set environment variable for current process
    process.env.ZAI_API_KEY = apiKey;
    
    // Save to user settings
    try {
      const manager = getSettingsManager();
      manager.updateUserSetting('apiKey', apiKey);
      console.log(`\n✅ API key saved to ~/.zai/user-settings.json`);
    } catch (error) {
      console.log('\n⚠️ Could not save API key to settings file');
      console.log('API key set for current session only');
    }
    
    onApiKeySet(agent);
  } catch (error: any) {
    setError("Invalid API key format");  // ❌ TOO GENERIC
    setIsSubmitting(false);
  }
};
```

**Problem:**
- Catches all errors and shows single message
- Doesn't distinguish between validation vs network errors
- User doesn't know: Should they retry? Contact support? Check format?

**Suggested Fix:**
```typescript
const handleSubmit = async () => {
  if (!input.trim()) {
    setError("API key cannot be empty. Get your key at: https://z.ai/manage-apikey/apikey-list");
    return;
  }

  if (input.length < 10) {
    setError("API key appears too short. Check you've pasted the complete key.");
    return;
  }

  setIsSubmitting(true);
  try {
    const apiKey = input.trim();
    const agent = new ZaiAgent(apiKey);
    process.env.ZAI_API_KEY = apiKey;
    
    try {
      const manager = getSettingsManager();
      manager.updateUserSetting('apiKey', apiKey);
      console.log(`\n✅ API key saved to ~/.zai/user-settings.json`);
    } catch (error) {
      console.log('\n⚠️ Could not save API key to settings file');
      console.log('API key set for current session only');
    }
    
    onApiKeySet(agent);
  } catch (error: any) {
    // Distinguish different error types
    if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
      setError("Network error. Check internet connection and try again.");
    } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
      setError("API key is invalid. Check at: https://z.ai/manage-apikey/apikey-list");
    } else if (error.message.includes('timeout')) {
      setError("Connection timed out. Try again or contact support.");
    } else {
      setError("Failed to validate API key. Try again or contact support@z.ai");
    }
    setIsSubmitting(false);
  }
};
```

---

### Issue 2: Silent Failures in Settings Initialization

**Location:** `/src/index.ts` lines 68-77

**Current Code:**
```typescript
// Ensure user settings are initialized
function ensureUserSettingsDirectory(): void {
  try {
    const manager = getSettingsManager();
    // This will create default settings if they don't exist
    manager.loadUserSettings();
  } catch (error) {
    // Silently ignore errors during setup  // ❌ SILENT FAILURE
  }
}
```

**Problem:**
- User never knows if settings directory creation failed
- Could cause data loss or configuration issues later

**Suggested Fix:**
```typescript
// Ensure user settings are initialized
function ensureUserSettingsDirectory(): void {
  try {
    const manager = getSettingsManager();
    manager.loadUserSettings();
  } catch (error) {
    // Log to console but don't crash - settings might already exist
    if (process.env.DEBUG) {
      console.warn("⚠️ Warning: Could not initialize settings directory:", error instanceof Error ? error.message : String(error));
    }
    // Continue anyway - settings manager handles missing files gracefully
  }
}
```

---

### Issue 3: No Confirmation for Destructive Operations

**Location:** `/src/hooks/use-input-handler.ts` lines 459-476

**Current Code:**
```typescript
if (trimmedInput === "/clear") {
  // Reset chat history
  setChatHistory([]);  // ❌ NO CONFIRMATION

  // Reset processing states
  setIsProcessing(false);
  setIsStreaming(false);
  setTokenCount(0);
  setProcessingTime(0);
  processingStartTime.current = 0;

  // Reset confirmation service session flags
  const confirmationService = ConfirmationService.getInstance();
  confirmationService.resetSession();

  clearInput();
  resetHistory();
  return true;
}
```

**Problem:**
- `/clear` immediately deletes all history without asking
- No way to undo
- User might accidentally clear entire conversation

**Suggested Fix:**
```typescript
if (trimmedInput === "/clear") {
  const confirmationService = ConfirmationService.getInstance();
  
  // Ask for confirmation before clearing
  confirmationService.requestConfirmation(
    {
      operation: "clear chat history",
      filename: "all messages",
      content: `This will delete all ${chatHistory.length} messages in the current session.\nThis cannot be undone.`
    }
  ).then(result => {
    if (result.confirmed) {
      setChatHistory([]);
      setIsProcessing(false);
      setIsStreaming(false);
      setTokenCount(0);
      setProcessingTime(0);
      processingStartTime.current = 0;
      confirmationService.resetSession();
      clearInput();
      resetHistory();
      
      const entry: ChatEntry = {
        type: "assistant",
        content: "✓ Chat history cleared",
        timestamp: new Date(),
      };
      setChatHistory([entry]);
    } else {
      const entry: ChatEntry = {
        type: "assistant",
        content: "Clear cancelled",
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, entry]);
    }
  });
  return true;
}
```

---

## 2. HIGH PRIORITY ISSUES

### Issue 4: Missing History Search Highlighting

**Location:** `/src/ui/components/history-search.tsx` lines 115-123

**Current Code:**
```typescript
/**
 * Highlight matching characters in the command
 */
function highlightMatch(text: string, query: string): string {
  if (!query) {
    return text;
  }

  // For fuzzy matching visualization, we could add highlighting here
  // For now, just return the text as-is since terminal highlighting is complex  // ❌ NOT IMPLEMENTED
  return text;
}
```

**Problem:**
- User can't see which part of command matched the search
- All results look the same

**Suggested Fix:**
```typescript
/**
 * Highlight matching characters in the command
 */
function highlightMatch(text: string, query: string): string {
  if (!query) {
    return text;
  }

  // Simple substring highlighting - find where query appears
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) {
    return text; // No match found
  }
  
  // Return text with match portion in bold/different formatting
  // Note: Terminal doesn't support true text formatting, so we use markers
  const before = text.substring(0, index);
  const match = text.substring(index, index + query.length);
  const after = text.substring(index + query.length);
  
  return before + ">>> " + match + " <<<" + after;
  // Or use: `${before}[${match}]${after}` for cleaner look
}
```

---

### Issue 5: Thinking Mode Toggle Undocumented Constraint

**Location:** `/src/hooks/use-input-handler.ts` lines 396-427

**Current Code:**
```typescript
// Handle 'T' or 't' key to toggle thinking panel when input is empty
if (
  (inputChar === 't' || inputChar === 'T') &&
  input === '' &&  // ❌ ONLY WORKS WITH EMPTY INPUT - NOT DOCUMENTED
  !showCommandSuggestions &&
  !showModelSelection &&
  !isConfirmationActive &&
  !isProcessing &&
  !isStreaming
) {
  const currentThinking = agent.getClient().getThinkingEnabled();
  const newShowThinking = !currentThinking;
  setShowThinkingState(newShowThinking);

  agent.getClient().setThinkingEnabled(newShowThinking);

  if (setShowThinking) {
    setShowThinking(newShowThinking);
  }

  const statusEntry: ChatEntry = {
    type: "assistant",
    content: `${newShowThinking ? '💭' : '💤'} Thinking mode ${newShowThinking ? 'enabled' : 'disabled'}${newShowThinking ? '. The model will now show its reasoning process.' : '. Reasoning will be hidden.'}`,
    timestamp: new Date(),
  };
  setChatHistory((prev) => [...prev, statusEntry]);

  return; // Don't process this as regular input
}
```

**Problem:**
- 'T' only works with empty input - users might type it with other characters
- No feedback if key doesn't work

**Suggested Fix:**
```typescript
// At the top of the input handling, check for T key specifically
if ((inputChar === 't' || inputChar === 'T') && !showCommandSuggestions && !showModelSelection && !isConfirmationActive) {
  // Handle T key - can work even with input
  if (input === '' && !isProcessing && !isStreaming) {
    // T with empty input - toggle thinking mode
    const currentThinking = agent.getClient().getThinkingEnabled();
    const newShowThinking = !currentThinking;
    setShowThinkingState(newShowThinking);
    agent.getClient().setThinkingEnabled(newShowThinking);

    if (setShowThinking) {
      setShowThinking(newShowThinking);
    }

    const statusEntry: ChatEntry = {
      type: "assistant",
      content: `${newShowThinking ? '💭' : '💤'} Thinking mode ${newShowThinking ? 'enabled' : 'disabled'}`,
      timestamp: new Date(),
    };
    setChatHistory((prev) => [...prev, statusEntry]);
    return;
  } else if (input !== '') {
    // T with input - show helpful message
    const helpEntry: ChatEntry = {
      type: "assistant",
      content: "💭 Tip: Press T with empty input to toggle thinking mode. Or use the status indicator.",
      timestamp: new Date(),
    };
    setChatHistory((prev) => [...prev, helpEntry]);
    return;
  }
}
```

---

## 3. MEDIUM PRIORITY ISSUES

### Issue 6: Missing Model Validation at Startup

**Location:** `/src/index.ts` lines 117-132

**Current Code:**
```typescript
// Load model from user settings if not in environment
function loadModel(): string | undefined {
  // First check environment variables
  let model = process.env.ZAI_MODEL;

  if (!model) {
    // Use the unified model loading from settings manager
    try {
      const manager = getSettingsManager();
      model = manager.getCurrentModel();
    } catch (error) {
      // Ignore errors, model will remain undefined  // ❌ NO VALIDATION
    }
  }

  return model;
}
```

**Problem:**
- Model is loaded but never validated
- User only finds out it's invalid when trying to use it

**Suggested Fix:**
```typescript
// Load model from user settings if not in environment
function loadModel(): string | undefined {
  // First check environment variables
  let model = process.env.ZAI_MODEL;

  if (!model) {
    try {
      const manager = getSettingsManager();
      model = manager.getCurrentModel();
    } catch (error) {
      console.warn("⚠️ Could not load model settings:", error instanceof Error ? error.message : String(error));
    }
  }

  // Validate model if loaded
  if (model) {
    const validModels = loadModelConfig();
    const modelNames = validModels.map(m => m.model);
    
    if (!modelNames.includes(model)) {
      console.warn(`⚠️ Warning: Model '${model}' not found in configuration`);
      console.warn(`Available models: ${modelNames.join(", ")}`);
      console.warn(`Tip: Run 'zai config' to update model selection`);
      
      // Use first available model as fallback
      model = validModels[0]?.model;
      console.log(`Using fallback model: ${model}`);
    }
  }

  return model;
}
```

---

### Issue 7: No Error Feedback for Invalid Commands

**Location:** `/src/hooks/use-input-handler.ts` - Missing case

**Problem:**
- User types `/unknown` command
- It's treated as regular message to AI
- No indication that it's not a recognized command

**Suggested Fix:**
Add validation before processing:

```typescript
const handleDirectCommand = async (input: string): Promise<boolean> => {
  const trimmedInput = input.trim();
  
  // First, check if it looks like a command
  if (trimmedInput.startsWith("/")) {
    const command = trimmedInput.split(" ")[0].toLowerCase();
    const validCommands = ["/clear", "/help", "/exit", "/settings", "/config", "/models", "/save", "/load", "/sessions", "/watch", "/commit-and-push"];
    
    if (!validCommands.includes(command)) {
      const errorEntry: ChatEntry = {
        type: "assistant",
        content: `❌ Unknown command: ${command}\n\nType /help to see available commands.`,
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, errorEntry]);
      clearInput();
      return true; // Command was processed (as an error)
    }
  }
  
  // ... rest of command handling
};
```

---

## 4. ACCESSIBILITY IMPROVEMENTS

### Issue 8: NO_COLOR Environment Variable Support

**Location:** All UI components

**Current:** Uses colors unconditionally

**Suggested Fix - Create a colors utility:**

```typescript
// src/ui/utils/color-support.ts
export function shouldUseColor(): boolean {
  // Check NO_COLOR environment variable (https://no-color.org/)
  if (process.env.NO_COLOR) {
    return false;
  }
  
  // Check if terminal supports color
  if (process.env.TERM === 'dumb') {
    return false;
  }
  
  // Check if stdout is a TTY
  if (!process.stdout.isTTY) {
    return false;
  }
  
  return true;
}

// Usage in components:
import { shouldUseColor } from '../utils/color-support';

const colorEnabled = shouldUseColor();

<Text color={colorEnabled ? "cyan" : undefined}>
  {message}
</Text>
```

---

## 5. MISSING LOADING STATES

### Issue 9: No Loading State During API Key Validation

**Location:** `/src/ui/components/api-key-input.tsx` lines 102-106

**Current Code:**
```typescript
{isSubmitting ? (
  <Box marginTop={1}>
    <Text color="yellow">🔄 Validating API key...</Text>
  </Box>
) : null}
```

**Problem:**
- Shows AFTER user submits
- User might try to submit again during validation

**Suggested Fix - Add immediate feedback:**

```typescript
const handleSubmit = async () => {
  if (!input.trim()) {
    setError("API key cannot be empty");
    return;
  }

  // Show loading state IMMEDIATELY
  setIsSubmitting(true);
  setError(""); // Clear any previous errors
  
  // Validate with timeout to prevent hanging
  const validationTimeout = setTimeout(() => {
    if (isSubmitting) {
      setError("Validation took too long. Check your connection and try again.");
      setIsSubmitting(false);
    }
  }, 10000); // 10 second timeout
  
  try {
    const apiKey = input.trim();
    const agent = new ZaiAgent(apiKey);
    
    clearTimeout(validationTimeout);
    
    try {
      const manager = getSettingsManager();
      manager.updateUserSetting('apiKey', apiKey);
      console.log(`\n✅ API key saved to ~/.zai/user-settings.json`);
    } catch (error) {
      console.log('\n⚠️ Could not save API key to settings file');
    }
    
    onApiKeySet(agent);
  } catch (error: any) {
    clearTimeout(validationTimeout);
    setError("Failed to validate API key. Check internet and try again.");
    setIsSubmitting(false);
  }
};
```

---

## SUMMARY

These code examples show:
1. How to improve error messages with specific guidance
2. How to add proper validation and confirmation dialogs
3. How to provide visual feedback during operations
4. How to handle edge cases and provide helpful hints
5. How to improve accessibility with environment variable support

All suggestions maintain backward compatibility while significantly improving user experience.

