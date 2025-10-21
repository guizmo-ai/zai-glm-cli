import * as Diff from "diff";
export class DiffGenerator {
    static CONTEXT_LINES = 3;
    /**
     * Generate a structured diff between old and new content
     */
    static generateDiff(oldContent, newContent, filename) {
        const changes = Diff.structuredPatch(filename || "a", filename || "b", oldContent, newContent, "", "", { context: this.CONTEXT_LINES });
        const hunks = [];
        let additions = 0;
        let deletions = 0;
        for (const hunk of changes.hunks) {
            const lines = [];
            let oldLineNum = hunk.oldStart;
            let newLineNum = hunk.newStart;
            for (const line of hunk.lines) {
                const firstChar = line[0];
                const content = line.substring(1);
                if (firstChar === "+") {
                    lines.push({
                        type: "add",
                        content,
                        newLineNumber: newLineNum++,
                    });
                    additions++;
                }
                else if (firstChar === "-") {
                    lines.push({
                        type: "del",
                        content,
                        oldLineNumber: oldLineNum++,
                    });
                    deletions++;
                }
                else {
                    lines.push({
                        type: "context",
                        content,
                        oldLineNumber: oldLineNum++,
                        newLineNumber: newLineNum++,
                    });
                }
            }
            hunks.push({
                oldStart: hunk.oldStart,
                oldLines: hunk.oldLines,
                newStart: hunk.newStart,
                newLines: hunk.newLines,
                lines,
            });
        }
        const summary = this.generateSummary(filename, additions, deletions);
        return {
            hunks,
            additions,
            deletions,
            summary,
        };
    }
    /**
     * Generate a unified diff string (traditional format)
     */
    static generateUnifiedDiff(oldContent, newContent, filename) {
        const patch = Diff.createPatch(filename || "file", oldContent, newContent, "", "", { context: this.CONTEXT_LINES });
        return patch;
    }
    /**
     * Generate a summary string for the diff
     */
    static generateSummary(filename, additions, deletions) {
        const parts = [];
        if (filename) {
            parts.push(filename);
        }
        if (additions > 0 && deletions > 0) {
            parts.push(`${additions} addition${additions !== 1 ? "s" : ""}, ${deletions} deletion${deletions !== 1 ? "s" : ""}`);
        }
        else if (additions > 0) {
            parts.push(`${additions} addition${additions !== 1 ? "s" : ""}`);
        }
        else if (deletions > 0) {
            parts.push(`${deletions} deletion${deletions !== 1 ? "s" : ""}`);
        }
        else {
            parts.push("no changes");
        }
        return parts.join(" - ");
    }
    /**
     * Convert DiffResult to traditional unified diff format
     */
    static toUnifiedFormat(diff, filename) {
        const lines = [];
        lines.push(`--- a/${filename}`);
        lines.push(`+++ b/${filename}`);
        for (const hunk of diff.hunks) {
            lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
            for (const line of hunk.lines) {
                if (line.type === "add") {
                    lines.push(`+${line.content}`);
                }
                else if (line.type === "del") {
                    lines.push(`-${line.content}`);
                }
                else {
                    lines.push(` ${line.content}`);
                }
            }
        }
        return lines.join("\n");
    }
    /**
     * Check if two contents are identical
     */
    static areIdentical(oldContent, newContent) {
        return oldContent === newContent;
    }
    /**
     * Count the number of changed lines (additions + deletions)
     */
    static countChangedLines(diff) {
        return diff.additions + diff.deletions;
    }
    /**
     * Get a preview of changes (first N lines of diff)
     */
    static getPreview(diff, maxLines = 10) {
        const lines = [];
        let lineCount = 0;
        for (const hunk of diff.hunks) {
            if (lineCount >= maxLines)
                break;
            for (const line of hunk.lines) {
                if (lineCount >= maxLines)
                    break;
                if (line.type !== "context") {
                    const prefix = line.type === "add" ? "+" : "-";
                    lines.push(`${prefix} ${line.content}`);
                    lineCount++;
                }
            }
        }
        if (diff.hunks.length > 0 && lineCount < this.countChangedLines(diff)) {
            lines.push(`... (${this.countChangedLines(diff) - lineCount} more changes)`);
        }
        return lines.join("\n");
    }
    /**
     * Generate line-by-line changes (without context)
     */
    static getChangedLines(diff) {
        const changedLines = [];
        for (const hunk of diff.hunks) {
            for (const line of hunk.lines) {
                if (line.type !== "context") {
                    changedLines.push(line);
                }
            }
        }
        return changedLines;
    }
    /**
     * Check if the diff contains only additions (no deletions)
     */
    static isAddOnly(diff) {
        return diff.additions > 0 && diff.deletions === 0;
    }
    /**
     * Check if the diff contains only deletions (no additions)
     */
    static isDeleteOnly(diff) {
        return diff.deletions > 0 && diff.additions === 0;
    }
    /**
     * Generate a colored diff string for terminal display
     */
    static generateColoredDiff(diff, filename) {
        const lines = [];
        // Add summary
        lines.push(diff.summary);
        lines.push(`--- a/${filename}`);
        lines.push(`+++ b/${filename}`);
        for (const hunk of diff.hunks) {
            lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
            for (const line of hunk.lines) {
                if (line.type === "add") {
                    lines.push(`+${line.content}`);
                }
                else if (line.type === "del") {
                    lines.push(`-${line.content}`);
                }
                else {
                    lines.push(` ${line.content}`);
                }
            }
        }
        return lines.join("\n");
    }
}
//# sourceMappingURL=diff-generator.js.map