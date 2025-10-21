# Persistent Command History Feature

This document describes the persistent command history feature implemented for the ZAI CLI.

## Overview

The ZAI CLI now includes a robust persistent command history system that allows users to:
- Access their command history across sessions
- Search through history with fuzzy matching (Ctrl+R)
- Navigate history with arrow keys (Up/Down)
- Store metadata about each command (timestamp, working directory, model used)
- Configure history behavior (enable/disable, limit size, etc.)

## Architecture

### Components

1. **HistoryManager** (`src/utils/history-manager.ts`)
   - Singleton class managing persistent storage
   - Stores history in `~/.zai/history.json`
   - Handles loading, saving, searching, and configuration
   - Implements debounced writes to minimize disk I/O

2. **useInputHistory Hook** (`src/hooks/use-input-history.ts`)
   - React hook integrating HistoryManager with UI
   - Manages history navigation state
   - Provides search functionality
   - Respects user settings for history enable/disable

3. **useEnhancedInput Hook** (`src/hooks/use-enhanced-input.ts`)
   - Enhanced input handler with Ctrl+R search support
   - Manages search UI state
   - Handles keyboard shortcuts for history features

4. **HistorySearch Component** (`src/ui/components/history-search.tsx`)
   - Visual component for Ctrl+R search interface
   - Displays matching history entries with metadata
   - Shows timestamp, working directory, and model for each entry

### Data Storage

History is stored in `~/.zai/history.json` with the following structure:

```json
[
  {
    "command": "npm install",
    "timestamp": 1729533600000,
    "workingDirectory": "/Users/user/project",
    "model": "glm-4.6"
  },
  {
    "command": "git commit -m 'fix'",
    "timestamp": 1729533650000,
    "workingDirectory": "/Users/user/project",
    "model": "glm-4.5"
  }
]
```

## User Features

### Navigation with Arrow Keys

- **Up Arrow**: Navigate backward through history
- **Down Arrow**: Navigate forward through history
- History navigation preserves the current input when you start navigating

### Reverse Search (Ctrl+R)

1. Press **Ctrl+R** to activate history search
2. Type your search query - fuzzy matching finds relevant commands
3. Use **Up/Down arrows** to navigate through matching results
4. Press **Enter** to select a command
5. Press **Escape** to cancel search

The search interface displays:
- Matching commands with highlighting
- Timestamp of each command
- Working directory where command was executed
- Model that was active when command was run

### Features

- **Persistent Storage**: History survives across sessions
- **Deduplication**: Consecutive identical commands are automatically deduplicated
- **Size Limit**: History is limited to 1000 entries by default
- **Metadata**: Each entry includes timestamp, working directory, and model
- **Privacy Control**: History can be disabled via settings
- **Search**: Fuzzy search through all history entries
- **Export/Import**: Export history for backup or transfer

## Configuration

### Settings

History behavior can be configured via `~/.zai/user-settings.json`:

```json
{
  "enableHistory": true  // Default: true
}
```

### Programmatic Configuration

```typescript
import { HistoryManager } from './utils/history-manager';

const manager = HistoryManager.getInstance({
  maxEntries: 1000,              // Maximum history entries (default: 1000)
  deduplicateConsecutive: true,  // Deduplicate consecutive duplicates (default: true)
  enabled: true                   // Enable/disable history (default: true)
});
```

## API Reference

### HistoryManager

#### Methods

- `addEntry(command: string, metadata?: { workingDirectory?: string; model?: string })` - Add a command to history
- `getAll(): HistoryEntry[]` - Get all history entries
- `getAllCommands(): string[]` - Get all commands as strings
- `search(options: HistorySearchOptions): HistoryEntry[]` - Search history
- `clear()` - Clear all history
- `getRecent(count: number): HistoryEntry[]` - Get recent entries
- `exportToFile(path: string)` - Export history to file
- `importFromFile(path: string, append?: boolean)` - Import history from file
- `updateConfig(config: Partial<HistoryConfig>)` - Update configuration

#### Search Options

```typescript
interface HistorySearchOptions {
  query?: string;           // Search query
  fuzzy?: boolean;          // Use fuzzy matching (default: false)
  limit?: number;           // Limit number of results
  startDate?: Date;         // Filter by start date
  endDate?: Date;           // Filter by end date
  workingDirectory?: string; // Filter by working directory
}
```

## Implementation Details

### Deduplication

The system automatically deduplicates consecutive identical commands to keep history clean and relevant. Non-consecutive duplicates are preserved as they may represent different contexts or time periods.

### Debounced Saves

History saves are debounced with a 500ms delay to avoid excessive disk writes during rapid command entry. This improves performance while ensuring history is persisted.

### Privacy & Security

- History files are created with `0o600` permissions (user read/write only)
- History can be completely disabled via settings
- No sensitive data is automatically logged (users control what they type)
- History directory (`~/.zai/`) uses `0o700` permissions

### File Locking

The current implementation uses a debounced write approach to minimize race conditions. For multi-instance scenarios, consider:
- File locking mechanisms (future enhancement)
- Atomic write operations
- Conflict resolution strategies

## Testing

Comprehensive test suite in `tests/history-manager.test.ts` covers:
- Basic operations (add, retrieve, clear)
- Persistence (save/load from disk)
- Search functionality (substring, fuzzy matching)
- Configuration options
- Edge cases (corrupted files, invalid data)
- Import/export functionality

Run tests:
```bash
npm test -- history-manager
```

## Future Enhancements

Potential improvements for future versions:

1. **Advanced Search**
   - Regular expression support
   - Full-text search indexing
   - Search by date range in UI

2. **Analytics**
   - Most used commands
   - Command frequency analysis
   - Time-based usage patterns

3. **Sharing**
   - Export/import history snippets
   - Team history sharing
   - Command templates from history

4. **Smart Suggestions**
   - Context-aware suggestions
   - Command completion based on history
   - Learning user patterns

5. **Cloud Sync**
   - Optional cloud backup
   - Multi-device synchronization
   - Encrypted remote storage

## Troubleshooting

### History not persisting

1. Check that history is enabled: `~/.zai/user-settings.json` should have `"enableHistory": true`
2. Verify file permissions on `~/.zai/` directory
3. Check disk space availability

### Search not finding commands

1. Try different search queries
2. Disable fuzzy matching for exact substring search
3. Check that commands were actually saved (may take up to 500ms after entry)

### Performance issues

1. Reduce `maxEntries` if history is very large
2. Clear old history: Use HistoryManager.clear()
3. Check disk I/O performance

## Migration

For users upgrading from versions without persistent history:

1. First run will create `~/.zai/history.json`
2. Previous session commands are not automatically imported
3. History starts fresh from first use of new version
4. No action required - feature is automatic

## Credits

Implemented as part of ZAI CLI enhancement project to provide users with powerful command history capabilities similar to shell history but with AI-context awareness.
