import * as fs from "fs-extra";
import * as path from "path";
import { writeFile as writeFilePromise } from "fs/promises";
import { ConfirmationService } from "../utils/confirmation-service.js";
import { FileNotFoundError, FilePermissionError, FileOperationError, FileAlreadyExistsError, InvalidLineNumberError } from "../errors/index.js";
import { ErrorHandler } from "../utils/error-handler.js";
export class TextEditorTool {
    editHistory = [];
    confirmationService = ConfirmationService.getInstance();
    async view(filePath, viewRange) {
        try {
            const resolvedPath = path.resolve(filePath);
            if (await fs.pathExists(resolvedPath)) {
                const stats = await fs.stat(resolvedPath);
                if (stats.isDirectory()) {
                    const files = await fs.readdir(resolvedPath);
                    return {
                        success: true,
                        output: `Directory contents of ${filePath}:\n${files.join("\n")}`,
                    };
                }
                const content = await fs.readFile(resolvedPath, "utf-8");
                const lines = content.split("\n");
                if (viewRange) {
                    const [start, end] = viewRange;
                    const selectedLines = lines.slice(start - 1, end);
                    const numberedLines = selectedLines
                        .map((line, idx) => `${start + idx}: ${line}`)
                        .join("\n");
                    return {
                        success: true,
                        output: `Lines ${start}-${end} of ${filePath}:\n${numberedLines}`,
                    };
                }
                const totalLines = lines.length;
                const displayLines = totalLines > 10 ? lines.slice(0, 10) : lines;
                const numberedLines = displayLines
                    .map((line, idx) => `${idx + 1}: ${line}`)
                    .join("\n");
                const additionalLinesMessage = totalLines > 10 ? `\n... +${totalLines - 10} lines` : "";
                return {
                    success: true,
                    output: `Contents of ${filePath}:\n${numberedLines}${additionalLinesMessage}`,
                };
            }
            else {
                const notFoundError = new FileNotFoundError(filePath, 'view');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(notFoundError),
                };
            }
        }
        catch (error) {
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                const permError = new FilePermissionError(filePath, 'read');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(permError),
                };
            }
            return {
                success: false,
                error: `Error viewing ${filePath}: ${error.message}`,
            };
        }
    }
    async strReplace(filePath, oldStr, newStr, replaceAll = false) {
        try {
            const resolvedPath = path.resolve(filePath);
            if (!(await fs.pathExists(resolvedPath))) {
                const notFoundError = new FileNotFoundError(filePath, 'edit');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(notFoundError),
                };
            }
            const content = await fs.readFile(resolvedPath, "utf-8");
            if (!content.includes(oldStr)) {
                if (oldStr.includes('\n')) {
                    const fuzzyResult = this.findFuzzyMatch(content, oldStr);
                    if (fuzzyResult) {
                        oldStr = fuzzyResult;
                    }
                    else {
                        return {
                            success: false,
                            error: `String not found in file. For multi-line replacements, consider using line-based editing.`,
                        };
                    }
                }
                else {
                    return {
                        success: false,
                        error: `String not found in file: "${oldStr}"`,
                    };
                }
            }
            const occurrences = (content.match(new RegExp(oldStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
            const sessionFlags = this.confirmationService.getSessionFlags();
            if (!sessionFlags.fileOperations && !sessionFlags.allOperations) {
                const previewContent = replaceAll
                    ? content.split(oldStr).join(newStr)
                    : content.replace(oldStr, newStr);
                const oldLines = content.split("\n");
                const newLines = previewContent.split("\n");
                const diffContent = this.generateDiff(oldLines, newLines, filePath);
                const confirmationResult = await this.confirmationService.requestConfirmation({
                    operation: `Edit file${replaceAll && occurrences > 1 ? ` (${occurrences} occurrences)` : ''}`,
                    filename: filePath,
                    showVSCodeOpen: false,
                    content: diffContent,
                }, "file");
                if (!confirmationResult.confirmed) {
                    return {
                        success: false,
                        error: confirmationResult.feedback || "File edit cancelled by user",
                    };
                }
            }
            const newContent = replaceAll
                ? content.split(oldStr).join(newStr)
                : content.replace(oldStr, newStr);
            await writeFilePromise(resolvedPath, newContent, "utf-8");
            this.editHistory.push({
                command: "str_replace",
                path: filePath,
                old_str: oldStr,
                new_str: newStr,
            });
            const oldLines = content.split("\n");
            const newLines = newContent.split("\n");
            const diff = this.generateDiff(oldLines, newLines, filePath);
            return {
                success: true,
                output: diff,
            };
        }
        catch (error) {
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                const permError = new FilePermissionError(filePath, 'write');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(permError),
                };
            }
            const opError = new FileOperationError(`Failed to replace text: ${error.message}`, { file: filePath, operation: 'str_replace' });
            return {
                success: false,
                error: ErrorHandler.toSimpleMessage(opError),
            };
        }
    }
    async create(filePath, content) {
        try {
            const resolvedPath = path.resolve(filePath);
            // Check if file already exists
            if (await fs.pathExists(resolvedPath)) {
                const existsError = new FileAlreadyExistsError(filePath);
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(existsError),
                };
            }
            // Check if user has already accepted file operations for this session
            const sessionFlags = this.confirmationService.getSessionFlags();
            if (!sessionFlags.fileOperations && !sessionFlags.allOperations) {
                // Create a diff-style preview for file creation
                const contentLines = content.split("\n");
                const diffContent = [
                    `Created ${filePath}`,
                    `--- /dev/null`,
                    `+++ b/${filePath}`,
                    `@@ -0,0 +1,${contentLines.length} @@`,
                    ...contentLines.map((line) => `+${line}`),
                ].join("\n");
                const confirmationResult = await this.confirmationService.requestConfirmation({
                    operation: "Write",
                    filename: filePath,
                    showVSCodeOpen: false,
                    content: diffContent,
                }, "file");
                if (!confirmationResult.confirmed) {
                    return {
                        success: false,
                        error: confirmationResult.feedback || "File creation cancelled by user",
                    };
                }
            }
            const dir = path.dirname(resolvedPath);
            await fs.ensureDir(dir);
            await writeFilePromise(resolvedPath, content, "utf-8");
            this.editHistory.push({
                command: "create",
                path: filePath,
                content,
            });
            // Generate diff output using the same method as str_replace
            const oldLines = []; // Empty for new files
            const newLines = content.split("\n");
            const diff = this.generateDiff(oldLines, newLines, filePath);
            return {
                success: true,
                output: diff,
            };
        }
        catch (error) {
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                const permError = new FilePermissionError(filePath, 'create');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(permError),
                };
            }
            const opError = new FileOperationError(`Failed to create file: ${error.message}`, { file: filePath, operation: 'create' });
            return {
                success: false,
                error: ErrorHandler.toSimpleMessage(opError),
            };
        }
    }
    async replaceLines(filePath, startLine, endLine, newContent) {
        try {
            const resolvedPath = path.resolve(filePath);
            if (!(await fs.pathExists(resolvedPath))) {
                const notFoundError = new FileNotFoundError(filePath, 'edit lines');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(notFoundError),
                };
            }
            const fileContent = await fs.readFile(resolvedPath, "utf-8");
            const lines = fileContent.split("\n");
            if (startLine < 1 || startLine > lines.length) {
                const lineError = new InvalidLineNumberError(filePath, startLine, lines.length, 'replace');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(lineError),
                };
            }
            if (endLine < startLine || endLine > lines.length) {
                const lineError = new InvalidLineNumberError(filePath, endLine, lines.length, 'replace');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(lineError),
                };
            }
            const sessionFlags = this.confirmationService.getSessionFlags();
            if (!sessionFlags.fileOperations && !sessionFlags.allOperations) {
                const newLines = [...lines];
                const replacementLines = newContent.split("\n");
                newLines.splice(startLine - 1, endLine - startLine + 1, ...replacementLines);
                const diffContent = this.generateDiff(lines, newLines, filePath);
                const confirmationResult = await this.confirmationService.requestConfirmation({
                    operation: `Replace lines ${startLine}-${endLine}`,
                    filename: filePath,
                    showVSCodeOpen: false,
                    content: diffContent,
                }, "file");
                if (!confirmationResult.confirmed) {
                    return {
                        success: false,
                        error: confirmationResult.feedback || "Line replacement cancelled by user",
                    };
                }
            }
            const replacementLines = newContent.split("\n");
            lines.splice(startLine - 1, endLine - startLine + 1, ...replacementLines);
            const newFileContent = lines.join("\n");
            await writeFilePromise(resolvedPath, newFileContent, "utf-8");
            this.editHistory.push({
                command: "str_replace",
                path: filePath,
                old_str: `lines ${startLine}-${endLine}`,
                new_str: newContent,
            });
            const oldLines = fileContent.split("\n");
            const diff = this.generateDiff(oldLines, lines, filePath);
            return {
                success: true,
                output: diff,
            };
        }
        catch (error) {
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                const permError = new FilePermissionError(filePath, 'write');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(permError),
                };
            }
            const opError = new FileOperationError(`Failed to replace lines: ${error.message}`, { file: filePath, operation: 'replace_lines' });
            return {
                success: false,
                error: ErrorHandler.toSimpleMessage(opError),
            };
        }
    }
    async insert(filePath, insertLine, content) {
        try {
            const resolvedPath = path.resolve(filePath);
            if (!(await fs.pathExists(resolvedPath))) {
                const notFoundError = new FileNotFoundError(filePath, 'insert into');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(notFoundError),
                };
            }
            const fileContent = await fs.readFile(resolvedPath, "utf-8");
            const lines = fileContent.split("\n");
            lines.splice(insertLine - 1, 0, content);
            const newContent = lines.join("\n");
            await writeFilePromise(resolvedPath, newContent, "utf-8");
            this.editHistory.push({
                command: "insert",
                path: filePath,
                insert_line: insertLine,
                content,
            });
            return {
                success: true,
                output: `Successfully inserted content at line ${insertLine} in ${filePath}`,
            };
        }
        catch (error) {
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                const permError = new FilePermissionError(filePath, 'write');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(permError),
                };
            }
            const opError = new FileOperationError(`Failed to insert content: ${error.message}`, { file: filePath, operation: 'insert' });
            return {
                success: false,
                error: ErrorHandler.toSimpleMessage(opError),
            };
        }
    }
    async undoEdit() {
        if (this.editHistory.length === 0) {
            return {
                success: false,
                error: "No edits to undo",
            };
        }
        const lastEdit = this.editHistory.pop();
        try {
            switch (lastEdit.command) {
                case "str_replace":
                    if (lastEdit.path && lastEdit.old_str && lastEdit.new_str) {
                        const content = await fs.readFile(lastEdit.path, "utf-8");
                        const revertedContent = content.replace(lastEdit.new_str, lastEdit.old_str);
                        await writeFilePromise(lastEdit.path, revertedContent, "utf-8");
                    }
                    break;
                case "create":
                    if (lastEdit.path) {
                        await fs.remove(lastEdit.path);
                    }
                    break;
                case "insert":
                    if (lastEdit.path && lastEdit.insert_line) {
                        const content = await fs.readFile(lastEdit.path, "utf-8");
                        const lines = content.split("\n");
                        lines.splice(lastEdit.insert_line - 1, 1);
                        await writeFilePromise(lastEdit.path, lines.join("\n"), "utf-8");
                    }
                    break;
            }
            return {
                success: true,
                output: `Successfully undid ${lastEdit.command} operation`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Error undoing edit: ${error.message}`,
            };
        }
    }
    findFuzzyMatch(content, searchStr) {
        const functionMatch = searchStr.match(/function\s+(\w+)/);
        if (!functionMatch)
            return null;
        const functionName = functionMatch[1];
        const contentLines = content.split('\n');
        let functionStart = -1;
        for (let i = 0; i < contentLines.length; i++) {
            if (contentLines[i].includes(`function ${functionName}`) && contentLines[i].includes('{')) {
                functionStart = i;
                break;
            }
        }
        if (functionStart === -1)
            return null;
        let braceCount = 0;
        let functionEnd = functionStart;
        for (let i = functionStart; i < contentLines.length; i++) {
            const line = contentLines[i];
            for (const char of line) {
                if (char === '{')
                    braceCount++;
                if (char === '}')
                    braceCount--;
            }
            if (braceCount === 0 && i > functionStart) {
                functionEnd = i;
                break;
            }
        }
        const actualFunction = contentLines.slice(functionStart, functionEnd + 1).join('\n');
        const searchNormalized = this.normalizeForComparison(searchStr);
        const actualNormalized = this.normalizeForComparison(actualFunction);
        if (this.isSimilarStructure(searchNormalized, actualNormalized)) {
            return actualFunction;
        }
        return null;
    }
    normalizeForComparison(str) {
        return str
            .replace(/["'`]/g, '"')
            .replace(/\s+/g, ' ')
            .replace(/{\s+/g, '{ ')
            .replace(/\s+}/g, ' }')
            .replace(/;\s*/g, ';')
            .trim();
    }
    isSimilarStructure(search, actual) {
        const extractTokens = (str) => {
            const tokens = str.match(/\b(function|console\.log|return|if|else|for|while)\b/g) || [];
            return tokens;
        };
        const searchTokens = extractTokens(search);
        const actualTokens = extractTokens(actual);
        if (searchTokens.length !== actualTokens.length)
            return false;
        for (let i = 0; i < searchTokens.length; i++) {
            if (searchTokens[i] !== actualTokens[i])
                return false;
        }
        return true;
    }
    generateDiff(oldLines, newLines, filePath) {
        const CONTEXT_LINES = 3;
        const changes = [];
        let i = 0, j = 0;
        while (i < oldLines.length || j < newLines.length) {
            while (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
                i++;
                j++;
            }
            if (i < oldLines.length || j < newLines.length) {
                const changeStart = { old: i, new: j };
                let oldEnd = i;
                let newEnd = j;
                while (oldEnd < oldLines.length || newEnd < newLines.length) {
                    let matchFound = false;
                    let matchLength = 0;
                    for (let k = 0; k < Math.min(2, oldLines.length - oldEnd, newLines.length - newEnd); k++) {
                        if (oldEnd + k < oldLines.length &&
                            newEnd + k < newLines.length &&
                            oldLines[oldEnd + k] === newLines[newEnd + k]) {
                            matchLength++;
                        }
                        else {
                            break;
                        }
                    }
                    if (matchLength >= 2 || (oldEnd >= oldLines.length && newEnd >= newLines.length)) {
                        matchFound = true;
                    }
                    if (matchFound) {
                        break;
                    }
                    if (oldEnd < oldLines.length)
                        oldEnd++;
                    if (newEnd < newLines.length)
                        newEnd++;
                }
                changes.push({
                    oldStart: changeStart.old,
                    oldEnd: oldEnd,
                    newStart: changeStart.new,
                    newEnd: newEnd
                });
                i = oldEnd;
                j = newEnd;
            }
        }
        const hunks = [];
        let accumulatedOffset = 0;
        for (let changeIdx = 0; changeIdx < changes.length; changeIdx++) {
            const change = changes[changeIdx];
            let contextStart = Math.max(0, change.oldStart - CONTEXT_LINES);
            let contextEnd = Math.min(oldLines.length, change.oldEnd + CONTEXT_LINES);
            if (hunks.length > 0) {
                const lastHunk = hunks[hunks.length - 1];
                const lastHunkEnd = lastHunk.oldStart + lastHunk.oldCount;
                if (lastHunkEnd >= contextStart) {
                    const oldHunkEnd = lastHunk.oldStart + lastHunk.oldCount;
                    const newContextEnd = Math.min(oldLines.length, change.oldEnd + CONTEXT_LINES);
                    for (let idx = oldHunkEnd; idx < change.oldStart; idx++) {
                        lastHunk.lines.push({ type: ' ', content: oldLines[idx] });
                    }
                    for (let idx = change.oldStart; idx < change.oldEnd; idx++) {
                        lastHunk.lines.push({ type: '-', content: oldLines[idx] });
                    }
                    for (let idx = change.newStart; idx < change.newEnd; idx++) {
                        lastHunk.lines.push({ type: '+', content: newLines[idx] });
                    }
                    for (let idx = change.oldEnd; idx < newContextEnd && idx < oldLines.length; idx++) {
                        lastHunk.lines.push({ type: ' ', content: oldLines[idx] });
                    }
                    lastHunk.oldCount = newContextEnd - lastHunk.oldStart;
                    lastHunk.newCount = lastHunk.oldCount + (change.newEnd - change.newStart) - (change.oldEnd - change.oldStart);
                    continue;
                }
            }
            const hunk = {
                oldStart: contextStart + 1,
                oldCount: contextEnd - contextStart,
                newStart: contextStart + 1 + accumulatedOffset,
                newCount: contextEnd - contextStart + (change.newEnd - change.newStart) - (change.oldEnd - change.oldStart),
                lines: []
            };
            for (let idx = contextStart; idx < change.oldStart; idx++) {
                hunk.lines.push({ type: ' ', content: oldLines[idx] });
            }
            for (let idx = change.oldStart; idx < change.oldEnd; idx++) {
                hunk.lines.push({ type: '-', content: oldLines[idx] });
            }
            for (let idx = change.newStart; idx < change.newEnd; idx++) {
                hunk.lines.push({ type: '+', content: newLines[idx] });
            }
            for (let idx = change.oldEnd; idx < contextEnd && idx < oldLines.length; idx++) {
                hunk.lines.push({ type: ' ', content: oldLines[idx] });
            }
            hunks.push(hunk);
            accumulatedOffset += (change.newEnd - change.newStart) - (change.oldEnd - change.oldStart);
        }
        let addedLines = 0;
        let removedLines = 0;
        for (const hunk of hunks) {
            for (const line of hunk.lines) {
                if (line.type === '+')
                    addedLines++;
                if (line.type === '-')
                    removedLines++;
            }
        }
        let summary = `Updated ${filePath}`;
        if (addedLines > 0 && removedLines > 0) {
            summary += ` with ${addedLines} addition${addedLines !== 1 ? "s" : ""} and ${removedLines} removal${removedLines !== 1 ? "s" : ""}`;
        }
        else if (addedLines > 0) {
            summary += ` with ${addedLines} addition${addedLines !== 1 ? "s" : ""}`;
        }
        else if (removedLines > 0) {
            summary += ` with ${removedLines} removal${removedLines !== 1 ? "s" : ""}`;
        }
        else if (changes.length === 0) {
            return `No changes in ${filePath}`;
        }
        let diff = summary + "\n";
        diff += `--- a/${filePath}\n`;
        diff += `+++ b/${filePath}\n`;
        for (const hunk of hunks) {
            diff += `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@\n`;
            for (const line of hunk.lines) {
                diff += `${line.type}${line.content}\n`;
            }
        }
        return diff.trim();
    }
    getEditHistory() {
        return [...this.editHistory];
    }
}
//# sourceMappingURL=text-editor.js.map