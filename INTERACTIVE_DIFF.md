# Interactive Diff Mode

This document describes the Interactive Diff Mode feature for the ZAI CLI project.

## Overview

Interactive Diff Mode provides a visual, interactive way to review and approve file changes before they are applied. It shows a side-by-side diff with syntax highlighting, keyboard navigation, and options to accept, reject, or manually edit changes.

## Features

### 1. Visual Diff Display
- **Line-by-line comparison**: Shows additions (green), deletions (red), and context (gray)
- **Line numbers**: Displays original and new line numbers
- **Syntax highlighting**: Colors based on file type
- **Compact and full modes**: Toggle between compact (first 10 changes) and full diff views
- **Context lines**: Shows 3 lines before and after each change

### 2. Interactive Controls
- **Accept (a/y)**: Apply the current change
- **Reject (r/n)**: Discard the current change
- **Accept All (A)**: Apply all remaining changes in batch
- **Reject All (R)**: Discard all remaining changes
- **Navigate (n/p or ←/→)**: Move between multiple file changes
- **Toggle View (d)**: Switch between compact and full diff
- **Edit Manually (e)**: Open file in editor for manual changes
- **Help (?/h)**: Show keyboard shortcuts
- **Cancel (Esc)**: Reject current change and exit

### 3. Automatic Backups
- **Pre-edit backups**: Automatic backup before applying any change
- **Backup location**: `~/.zai/backups/`
- **Backup retention**: Keeps last 50 backups per file
- **Restore capability**: Undo changes by restoring from backup
- **Backup metadata**: Tracks timestamp, size, and checksum

### 4. Session Management
- **Session flags**: "Don't ask again this session" option
- **Headless mode**: Disable confirmations with `--no-confirm` flag
- **Per-operation type**: Separate flags for file operations vs bash commands

## Architecture

### Core Components

#### 1. `BackupManager` (`src/utils/backup-manager.ts`)
Manages automatic file backups before edits.

```typescript
const backupManager = BackupManager.getInstance();

// Create backup
await backupManager.createBackup('/path/to/file.txt');

// Restore latest backup
await backupManager.restoreBackup('/path/to/file.txt');

// Get backup history
const history = backupManager.getBackupHistory('/path/to/file.txt');

// Clear backups
await backupManager.clearBackups('/path/to/file.txt');
```

**Key Features:**
- Singleton pattern for global access
- SHA-256 checksum verification
- Automatic pruning of old backups (max 50 per file)
- JSON index for fast lookups

#### 2. `DiffGenerator` (`src/utils/diff-generator.ts`)
Generates structured diffs between file versions.

```typescript
import { DiffGenerator } from './utils/diff-generator.js';

// Generate structured diff
const diff = DiffGenerator.generateDiff(oldContent, newContent, 'file.ts');

console.log(diff.summary); // "file.ts - 5 additions, 3 deletions"
console.log(diff.additions); // 5
console.log(diff.deletions); // 3

// Access hunks and lines
for (const hunk of diff.hunks) {
  for (const line of hunk.lines) {
    console.log(line.type); // 'add' | 'del' | 'context'
    console.log(line.content); // Line content
    console.log(line.newLineNumber); // Line number in new version
  }
}

// Generate unified diff string
const unifiedDiff = DiffGenerator.generateUnifiedDiff(oldContent, newContent);
```

**Key Features:**
- Uses the `diff` library for accurate change detection
- Structured output with hunks and lines
- Line number tracking
- Context line support (3 lines before/after changes)
- Summary generation

#### 3. `InteractiveDiffViewer` (`src/ui/components/interactive-diff-viewer.tsx`)
React Ink component for interactive diff review.

```typescript
import { InteractiveDiffViewer, FileChange } from './ui/components/interactive-diff-viewer.js';

const changes: FileChange[] = [
  {
    filePath: '/path/to/file1.ts',
    oldContent: '...',
    newContent: '...',
    diff: DiffGenerator.generateDiff(oldContent, newContent, 'file1.ts')
  }
];

<InteractiveDiffViewer
  changes={changes}
  onAccept={(index) => applyChange(index)}
  onReject={(index) => discardChange(index)}
  onAcceptAll={() => applyAllChanges()}
  onRejectAll={() => discardAllChanges()}
  onEdit={(index) => openInEditor(index)}
  terminalHeight={40}
  terminalWidth={100}
/>
```

**Key Features:**
- Keyboard navigation between multiple files
- Compact and full diff views
- Help screen with keyboard shortcuts
- Visual diff legend
- Responsive to terminal size

#### 4. `ConfirmationService` Updates (`src/utils/confirmation-service.ts`)
Enhanced to support interactive diff mode.

```typescript
const confirmationService = ConfirmationService.getInstance();

// Enable/disable interactive diff
confirmationService.setInteractiveDiff(true);

// Check if enabled
const enabled = confirmationService.isInteractiveDiffEnabled();

// Request confirmation with diff
await confirmationService.requestConfirmation({
  operation: 'Edit file',
  filename: '/path/to/file.ts',
  interactiveDiff: true,
  oldContent: originalContent,
  newContent: modifiedContent
}, 'file');
```

**New Options:**
- `interactiveDiff`: Enable interactive diff mode
- `oldContent`: Original file content
- `newContent`: Modified file content
- `editManually`: User wants to edit manually

### Integration with Tools

#### Text Editor Tool (`src/tools/text-editor.ts`)

The `TextEditorTool` has been updated to:
1. Create automatic backups before any edit operation
2. Generate diffs for preview in confirmation dialogs
3. Support restore from backup

```typescript
const editor = new TextEditorTool();

// All edit operations now create backups automatically
await editor.strReplace('/path/to/file.ts', 'oldText', 'newText');

// Restore from backup
await editor.restoreFromBackup('/path/to/file.ts');

// View backup history
const history = editor.getBackupHistory('/path/to/file.ts');
```

#### Batch Editor Tool (`src/tools/batch-editor.ts`)

The `BatchEditorTool` creates backups for each file in batch operations:

```typescript
const batchEditor = new BatchEditorTool();

await batchEditor.batchEdit({
  type: 'search-replace',
  files: ['/file1.ts', '/file2.ts'],
  params: {
    search: 'oldText',
    replace: 'newText'
  }
});

// Each file gets backed up before modification
```

## User Experience Flow

### Single File Edit

1. **User initiates edit**: AI or user triggers a file edit operation
2. **Diff generation**: System generates diff between old and new content
3. **Confirmation dialog**: Shows diff with options:
   - Accept (a/y)
   - Accept all (A) - don't ask again this session
   - Reject (r/n)
   - Edit manually (e)
4. **Backup creation**: If accepted, creates backup in `~/.zai/backups/`
5. **Apply changes**: Writes new content to file
6. **Success feedback**: Shows summary of changes applied

### Multiple File Edits

1. **User initiates batch edit**: AI triggers batch operation
2. **File resolution**: System identifies all files to modify
3. **Preview generation**: Creates diffs for first 3 files
4. **Batch confirmation**: Shows preview with file count
5. **Interactive navigation**: User can navigate between files:
   - Press `n` or `→` for next file
   - Press `p` or `←` for previous file
   - Press `a` to accept current file
   - Press `r` to reject current file
   - Press `A` to accept all remaining
   - Press `R` to reject all remaining
6. **Backups and apply**: Each accepted file gets backed up and modified
7. **Summary report**: Shows total files changed, lines added/removed

## Keyboard Shortcuts

### Navigation
- `n` or `→` - Next file (multi-file mode)
- `p` or `←` - Previous file (multi-file mode)
- `d` - Toggle between compact and full diff view
- `?` or `h` - Show help screen

### Actions
- `a` or `y` - Accept current change
- `r` or `n` - Reject current change
- `A` (Shift+a) - Accept all remaining changes
- `R` (Shift+r) - Reject all remaining changes
- `e` - Edit file manually (opens in editor)
- `Esc` - Cancel and reject current change

## Backup Management

### Backup Location
All backups are stored in: `~/.zai/backups/`

### Backup Filename Format
```
{dirname}_{filename}_{timestamp}.bak
```

Example:
```
_Users_alice_project_src_index.ts_1678901234567.bak
```

### Backup Index
A JSON index file tracks all backups:
```json
{
  "/Users/alice/project/src/index.ts": [
    {
      "originalPath": "/Users/alice/project/src/index.ts",
      "backupPath": "/Users/alice/.zai/backups/_Users_alice_project_src_index.ts_1678901234567.bak",
      "timestamp": 1678901234567,
      "size": 1024,
      "checksum": "sha256:abc123..."
    }
  ]
}
```

### Backup Retention
- **Maximum backups per file**: 50
- **Automatic pruning**: Oldest backups deleted when limit exceeded
- **Manual cleanup**: Use `clearBackups()` method

### Restore from Backup

```typescript
// Restore latest backup
await editor.restoreFromBackup('/path/to/file.ts');

// View backup history
const result = editor.getBackupHistory('/path/to/file.ts');
console.log(result.output);
// Output:
// Backup history for /path/to/file.ts:
// 1. 3/15/2024, 10:30:45 AM (1024 bytes)
// 2. 3/15/2024, 10:25:30 AM (980 bytes)
```

## Configuration

### Enable/Disable Interactive Diff

```typescript
import { ConfirmationService } from './utils/confirmation-service.js';

const service = ConfirmationService.getInstance();

// Enable interactive diff (default)
service.setInteractiveDiff(true);

// Disable interactive diff
service.setInteractiveDiff(false);
```

### Command Line Flags

```bash
# Disable all confirmations (headless mode)
zai --no-confirm

# Future: Disable only interactive diff
zai --no-interactive-diff
```

### Session Flags

Session flags persist for the duration of the CLI session:

```typescript
// Check session flags
const flags = confirmationService.getSessionFlags();
console.log(flags.fileOperations); // true if "don't ask again" enabled
console.log(flags.bashCommands);   // true if bash confirmations disabled
console.log(flags.interactiveDiff); // true if interactive diff enabled

// Set session flag
confirmationService.setSessionFlag('fileOperations', true);

// Reset all session flags
confirmationService.resetSession();
```

## Dependencies

### New Dependencies Added
- `diff` - Diff computation library
- `@types/diff` - TypeScript types for diff

### Installation
Already added via npm:
```bash
npm install diff
npm install --save-dev @types/diff
```

## Testing

### Manual Testing

1. **Test single file edit:**
```bash
# Start ZAI CLI
zai

# Ask AI to edit a file
> Edit src/index.ts and add a console.log statement
```

2. **Test batch edit:**
```bash
> Replace "oldText" with "newText" in all TypeScript files
```

3. **Test backup restore:**
```typescript
const editor = new TextEditorTool();
await editor.restoreFromBackup('/path/to/file.ts');
```

4. **Test keyboard navigation:**
- Make multiple file changes
- Use `n`/`p` to navigate
- Use `d` to toggle full diff
- Use `?` to view help

### Edge Cases Handled
- **Binary files**: Skipped with warning
- **Large files**: Truncated in compact view
- **No changes**: Shows "no changes" message
- **Invalid backups**: Checksum verification
- **Concurrent edits**: Backup index locking (file-based)

## Troubleshooting

### Issue: Backups not created
**Solution**: Check permissions for `~/.zai/backups/` directory

### Issue: Diff not showing
**Solution**: Verify `interactiveDiff` flag is enabled:
```typescript
confirmationService.setInteractiveDiff(true);
```

### Issue: Cannot restore backup
**Solution**: Check backup exists and checksum is valid:
```typescript
const history = backupManager.getBackupHistory('/path/to/file.ts');
console.log(history); // Should show backups
```

### Issue: Colors not displaying
**Solution**: Ensure terminal supports colors. Check `Colors` constants in `src/ui/utils/colors.ts`

## Future Enhancements

### Planned Features
1. **Word-level diffing**: Highlight specific words changed within lines
2. **Side-by-side view**: Split screen showing old and new side by side
3. **Search in diff**: Search for specific changes
4. **Diff statistics**: Charts showing change distribution
5. **Export diffs**: Save diff to file for later review
6. **Undo/redo**: Multi-level undo capability
7. **Backup compression**: Compress old backups to save space
8. **Cloud backup**: Optional backup to cloud storage
9. **Collaborative review**: Share diffs with team members
10. **AI suggestions**: Highlight potentially problematic changes

### Configuration Options to Add
```typescript
interface DiffConfig {
  contextLines: number; // Default: 3
  maxBackups: number; // Default: 50
  enableBackups: boolean; // Default: true
  compressBackups: boolean; // Default: false
  backupLocation: string; // Default: ~/.zai/backups
  colorScheme: 'default' | 'dark' | 'light';
  showLineNumbers: boolean; // Default: true
  highlightWhitespace: boolean; // Default: false
}
```

## Performance Considerations

### Optimization Strategies
1. **Lazy loading**: Load full diff only when toggling to full view
2. **Virtualization**: Render only visible lines for large files
3. **Diff caching**: Cache computed diffs to avoid recomputation
4. **Background processing**: Compute diffs in background for batch operations
5. **Incremental rendering**: Stream diff results as they're computed

### Memory Usage
- **Backup index**: In-memory map, persisted to JSON
- **Diff storage**: Temporary, not persisted
- **File content**: Loaded on-demand, not cached

### Disk Usage
- **Per backup**: Same size as original file
- **Maximum per file**: 50 backups × file size
- **Total**: Depends on number of files edited

## Security

### Backup Security
- **Location**: User home directory (`~/.zai/backups/`)
- **Permissions**: Inherits user's home directory permissions
- **Checksums**: SHA-256 for integrity verification
- **Sensitive data**: Not encrypted (store sensitive files cautiously)

### Best Practices
1. Don't backup files with credentials
2. Regularly clean old backups
3. Review diffs carefully before accepting
4. Use version control (Git) for important files

## API Reference

### BackupManager

```typescript
class BackupManager {
  static getInstance(): BackupManager

  async createBackup(filePath: string): Promise<BackupMetadata | null>
  async restoreBackup(filePath: string, timestamp?: number): Promise<boolean>

  getBackupHistory(filePath: string): BackupMetadata[]
  getLatestBackup(filePath: string): BackupMetadata | null

  async clearBackups(filePath?: string): Promise<void>

  getBackupDir(): string
  getTotalBackupSize(): number
  getBackupCount(): number
}
```

### DiffGenerator

```typescript
class DiffGenerator {
  static generateDiff(oldContent: string, newContent: string, filename?: string): DiffResult
  static generateUnifiedDiff(oldContent: string, newContent: string, filename?: string): string

  static toUnifiedFormat(diff: DiffResult, filename: string): string
  static areIdentical(oldContent: string, newContent: string): boolean

  static countChangedLines(diff: DiffResult): number
  static getPreview(diff: DiffResult, maxLines?: number): string
  static getChangedLines(diff: DiffResult): DiffLine[]

  static isAddOnly(diff: DiffResult): boolean
  static isDeleteOnly(diff: DiffResult): boolean
}
```

### InteractiveDiffViewer (React Component)

```typescript
interface InteractiveDiffViewerProps {
  changes: FileChange[]
  onAccept: (fileIndex: number) => void
  onReject: (fileIndex: number) => void
  onAcceptAll: () => void
  onRejectAll: () => void
  onEdit?: (fileIndex: number) => void
  showFullDiff?: boolean
  terminalHeight?: number
  terminalWidth?: number
}

const InteractiveDiffViewer: React.FC<InteractiveDiffViewerProps>
```

## Conclusion

Interactive Diff Mode provides a powerful, user-friendly way to review and approve file changes in the ZAI CLI. With automatic backups, visual diff display, and intuitive keyboard controls, it ensures users have full control over AI-generated edits while maintaining safety through backup mechanisms.
