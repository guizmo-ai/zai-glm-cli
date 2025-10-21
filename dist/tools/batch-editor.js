import * as fs from "fs-extra";
import * as path from "path";
import { TextEditorTool } from "./text-editor.js";
import { SearchTool } from "./search.js";
import { ConfirmationService } from "../utils/confirmation-service.js";
import { BackupManager } from "../utils/backup-manager.js";
export class BatchEditorTool {
    textEditor;
    search;
    confirmationService = ConfirmationService.getInstance();
    backupManager = BackupManager.getInstance();
    maxConcurrency = 5; // Process 5 files at a time
    constructor() {
        this.textEditor = new TextEditorTool();
        this.search = new SearchTool();
    }
    async batchEdit(operation) {
        try {
            // Step 1: Resolve file list
            const files = await this.resolveFiles(operation);
            if (files.length === 0) {
                return {
                    success: false,
                    error: "No files found matching the criteria",
                };
            }
            // Step 2: Preview changes for user confirmation
            const previewResults = await this.previewChanges(files, operation);
            // Step 3: Request user confirmation
            const shouldProceed = await this.requestConfirmation(files, previewResults, operation);
            if (!shouldProceed) {
                return {
                    success: false,
                    error: "Batch edit cancelled by user",
                };
            }
            // Step 4: Execute batch operation
            const results = await this.executeBatchOperation(files, operation);
            // Step 5: Format results
            return this.formatResults(results);
        }
        catch (error) {
            return {
                success: false,
                error: `Batch edit failed: ${error.message}`,
            };
        }
    }
    async resolveFiles(operation) {
        if (operation.files && operation.files.length > 0) {
            // Use explicit file list - resolve to absolute paths
            return operation.files
                .map((file) => path.resolve(file))
                .filter((file) => fs.existsSync(file));
        }
        if (operation.pattern) {
            // Use search to find files
            const searchResult = await this.search.search(operation.pattern, {
                searchType: operation.searchType || "files",
                includePattern: operation.includePattern,
                excludePattern: operation.excludePattern,
            });
            if (!searchResult.success) {
                return [];
            }
            // Parse search results to get file list
            const fileList = this.parseSearchResults(searchResult.output || "");
            return fileList.map((file) => path.resolve(file));
        }
        return [];
    }
    parseSearchResults(output) {
        const lines = output.split("\n");
        const files = new Set();
        for (const line of lines) {
            // Extract file paths from search output
            // Format: "path/to/file.ts:10:content" or "  path/to/file.ts"
            const trimmed = line.trim();
            // Skip header lines
            if (trimmed.startsWith("Search results") ||
                trimmed.startsWith("...") ||
                trimmed.length === 0) {
                continue;
            }
            // Try to extract file path
            const colonMatch = trimmed.match(/^(.+?):/);
            if (colonMatch) {
                files.add(colonMatch[1]);
            }
            else {
                // Direct file path (from files search)
                const pathMatch = trimmed.match(/^([^\s]+\.(ts|js|tsx|jsx|py|go|rs|java|cpp|c|h|css|scss|html|json|md|txt|yml|yaml))/i);
                if (pathMatch) {
                    files.add(pathMatch[1]);
                }
            }
        }
        return Array.from(files);
    }
    async previewChanges(files, operation) {
        const previews = [];
        // Preview first 3 files only to avoid overwhelming output
        for (const file of files.slice(0, 3)) {
            try {
                const content = await fs.readFile(file, "utf-8");
                const newContent = this.applyOperation(content, operation);
                const changes = this.countChanges(content, newContent);
                previews.push({
                    file,
                    success: true,
                    changes,
                    preview: this.generatePreview(content, newContent, 5),
                });
            }
            catch (error) {
                previews.push({
                    file,
                    success: false,
                    error: error.message,
                });
            }
        }
        return previews;
    }
    async requestConfirmation(files, previewResults, operation) {
        // Check session flags
        const sessionFlags = this.confirmationService.getSessionFlags();
        if (sessionFlags.fileOperations || sessionFlags.allOperations) {
            return true; // User has already approved all file operations
        }
        // Build confirmation content
        let confirmContent = `Batch Edit: ${operation.type}\n\n`;
        confirmContent += `Files to modify: ${files.length}\n\n`;
        // Show preview of changes
        confirmContent += `Preview (first ${Math.min(3, files.length)} files):\n`;
        for (const preview of previewResults) {
            confirmContent += `\n${preview.file}:\n`;
            if (preview.success) {
                confirmContent += `  Changes: ${preview.changes} lines\n`;
                if (preview.preview) {
                    confirmContent += preview.preview;
                }
            }
            else {
                confirmContent += `  Error: ${preview.error}\n`;
            }
        }
        if (files.length > 3) {
            confirmContent += `\n... and ${files.length - 3} more files\n`;
        }
        const confirmationResult = await this.confirmationService.requestConfirmation({
            operation: `Batch edit ${files.length} files`,
            filename: files[0],
            showVSCodeOpen: false,
            content: confirmContent,
        }, "file");
        return confirmationResult.confirmed;
    }
    async executeBatchOperation(files, operation) {
        const results = [];
        // Process files in chunks to avoid overwhelming the system
        const chunks = this.chunkArray(files, this.maxConcurrency);
        for (const chunk of chunks) {
            const chunkResults = await Promise.allSettled(chunk.map((file) => this.processFile(file, operation)));
            for (let i = 0; i < chunk.length; i++) {
                const result = chunkResults[i];
                if (result.status === "fulfilled") {
                    results.push(result.value);
                }
                else {
                    results.push({
                        file: chunk[i],
                        success: false,
                        error: result.reason?.message || "Unknown error",
                    });
                }
            }
        }
        return results;
    }
    async processFile(file, operation) {
        try {
            const content = await fs.readFile(file, "utf-8");
            const newContent = this.applyOperation(content, operation);
            if (content === newContent) {
                return {
                    file,
                    success: true,
                    changes: 0,
                };
            }
            // Create backup before writing
            await this.backupManager.createBackup(file);
            // Write the changes
            await fs.writeFile(file, newContent, "utf-8");
            return {
                file,
                success: true,
                changes: this.countChanges(content, newContent),
            };
        }
        catch (error) {
            return {
                file,
                success: false,
                error: error.message,
            };
        }
    }
    applyOperation(content, operation) {
        const { type, params } = operation;
        switch (type) {
            case "search-replace":
                return this.applySearchReplace(content, params);
            case "insert":
                return this.applyInsert(content, params);
            case "delete":
                return this.applyDelete(content, params);
            case "rename-symbol":
                return this.applyRenameSymbol(content, params);
            default:
                return content;
        }
    }
    applySearchReplace(content, params) {
        if (!params.search || params.replace === undefined) {
            return content;
        }
        let flags = "g";
        if (!params.caseSensitive)
            flags += "i";
        let pattern;
        if (params.regex) {
            try {
                pattern = new RegExp(params.search, flags);
            }
            catch (error) {
                // Invalid regex, return unchanged
                return content;
            }
        }
        else {
            // Escape special regex characters
            const escaped = params.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const wordBoundary = params.wholeWord ? "\\b" : "";
            pattern = new RegExp(`${wordBoundary}${escaped}${wordBoundary}`, flags);
        }
        return content.replace(pattern, params.replace);
    }
    applyInsert(content, params) {
        if (!params.content)
            return content;
        const lines = content.split("\n");
        if (params.position === "start") {
            return params.content + "\n" + content;
        }
        else if (params.position === "end") {
            return content + "\n" + params.content;
        }
        else if (typeof params.position === "object") {
            const { line, character } = params.position;
            if (line < 0 || line >= lines.length) {
                return content; // Invalid position
            }
            const targetLine = lines[line] || "";
            lines[line] =
                targetLine.slice(0, character) +
                    params.content +
                    targetLine.slice(character);
            return lines.join("\n");
        }
        return content;
    }
    applyDelete(content, params) {
        if (params.startLine === undefined || params.endLine === undefined) {
            return content;
        }
        const lines = content.split("\n");
        // Validate line numbers (0-indexed)
        if (params.startLine < 0 ||
            params.endLine < 0 ||
            params.startLine >= lines.length ||
            params.endLine >= lines.length ||
            params.startLine > params.endLine) {
            return content; // Invalid range
        }
        lines.splice(params.startLine, params.endLine - params.startLine + 1);
        return lines.join("\n");
    }
    applyRenameSymbol(content, params) {
        if (!params.oldName || !params.newName)
            return content;
        // Simple symbol rename (word boundaries)
        const escaped = params.oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`\\b${escaped}\\b`, "g");
        return content.replace(pattern, params.newName);
    }
    countChanges(oldContent, newContent) {
        const oldLines = oldContent.split("\n");
        const newLines = newContent.split("\n");
        let changes = 0;
        const maxLength = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLength; i++) {
            if (oldLines[i] !== newLines[i]) {
                changes++;
            }
        }
        return changes;
    }
    generatePreview(oldContent, newContent, maxChanges = 5) {
        // Generate a simple diff preview
        const oldLines = oldContent.split("\n");
        const newLines = newContent.split("\n");
        let preview = "";
        let changesShown = 0;
        const maxLength = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLength && changesShown < maxChanges; i++) {
            if (oldLines[i] !== newLines[i]) {
                if (oldLines[i] !== undefined) {
                    preview += `  -${oldLines[i]}\n`;
                }
                if (newLines[i] !== undefined) {
                    preview += `  +${newLines[i]}\n`;
                }
                changesShown++;
            }
        }
        if (changesShown === 0) {
            preview = "  (no changes)\n";
        }
        else if (this.countChanges(oldContent, newContent) > maxChanges) {
            preview += `  ... (${this.countChanges(oldContent, newContent) - maxChanges} more changes)\n`;
        }
        return preview;
    }
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    formatResults(results) {
        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);
        const totalChanges = successful.reduce((sum, r) => sum + (r.changes || 0), 0);
        const filesChanged = successful.filter((r) => (r.changes || 0) > 0).length;
        let output = `Batch Edit Complete\n\n`;
        output += `Summary:\n`;
        output += `  Successful: ${successful.length}/${results.length} files\n`;
        output += `  Files changed: ${filesChanged}\n`;
        output += `  Total line changes: ${totalChanges}\n\n`;
        if (failed.length > 0) {
            output += `Failed files:\n`;
            failed.forEach((f) => {
                output += `  - ${f.file}: ${f.error}\n`;
            });
            output += "\n";
        }
        const changedFiles = successful.filter((f) => f.changes && f.changes > 0);
        if (changedFiles.length > 0) {
            output += `Modified files:\n`;
            changedFiles.forEach((f) => {
                output += `  - ${f.file} (${f.changes} lines changed)\n`;
            });
        }
        else {
            output += `No files were modified (no changes needed).\n`;
        }
        return {
            success: failed.length === 0,
            output,
        };
    }
}
//# sourceMappingURL=batch-editor.js.map