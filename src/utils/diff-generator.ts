import * as Diff from "diff";

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "add" | "del" | "context";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffResult {
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  summary: string;
}

export class DiffGenerator {
  private static readonly CONTEXT_LINES = 3;

  /**
   * Generate a structured diff between old and new content
   */
  static generateDiff(
    oldContent: string,
    newContent: string,
    filename?: string
  ): DiffResult {
    const changes = Diff.structuredPatch(
      filename || "a",
      filename || "b",
      oldContent,
      newContent,
      "",
      "",
      { context: this.CONTEXT_LINES }
    );

    const hunks: DiffHunk[] = [];
    let additions = 0;
    let deletions = 0;

    for (const hunk of changes.hunks) {
      const lines: DiffLine[] = [];
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
        } else if (firstChar === "-") {
          lines.push({
            type: "del",
            content,
            oldLineNumber: oldLineNum++,
          });
          deletions++;
        } else {
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
  static generateUnifiedDiff(
    oldContent: string,
    newContent: string,
    filename?: string
  ): string {
    const patch = Diff.createPatch(
      filename || "file",
      oldContent,
      newContent,
      "",
      "",
      { context: this.CONTEXT_LINES }
    );

    return patch;
  }

  /**
   * Generate a summary string for the diff
   */
  private static generateSummary(
    filename: string | undefined,
    additions: number,
    deletions: number
  ): string {
    const parts: string[] = [];

    if (filename) {
      parts.push(filename);
    }

    if (additions > 0 && deletions > 0) {
      parts.push(
        `${additions} addition${additions !== 1 ? "s" : ""}, ${deletions} deletion${deletions !== 1 ? "s" : ""}`
      );
    } else if (additions > 0) {
      parts.push(`${additions} addition${additions !== 1 ? "s" : ""}`);
    } else if (deletions > 0) {
      parts.push(`${deletions} deletion${deletions !== 1 ? "s" : ""}`);
    } else {
      parts.push("no changes");
    }

    return parts.join(" - ");
  }

  /**
   * Convert DiffResult to traditional unified diff format
   */
  static toUnifiedFormat(diff: DiffResult, filename: string): string {
    const lines: string[] = [];

    lines.push(`--- a/${filename}`);
    lines.push(`+++ b/${filename}`);

    for (const hunk of diff.hunks) {
      lines.push(
        `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`
      );

      for (const line of hunk.lines) {
        if (line.type === "add") {
          lines.push(`+${line.content}`);
        } else if (line.type === "del") {
          lines.push(`-${line.content}`);
        } else {
          lines.push(` ${line.content}`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Check if two contents are identical
   */
  static areIdentical(oldContent: string, newContent: string): boolean {
    return oldContent === newContent;
  }

  /**
   * Count the number of changed lines (additions + deletions)
   */
  static countChangedLines(diff: DiffResult): number {
    return diff.additions + diff.deletions;
  }

  /**
   * Get a preview of changes (first N lines of diff)
   */
  static getPreview(diff: DiffResult, maxLines: number = 10): string {
    const lines: string[] = [];
    let lineCount = 0;

    for (const hunk of diff.hunks) {
      if (lineCount >= maxLines) break;

      for (const line of hunk.lines) {
        if (lineCount >= maxLines) break;

        if (line.type !== "context") {
          const prefix = line.type === "add" ? "+" : "-";
          lines.push(`${prefix} ${line.content}`);
          lineCount++;
        }
      }
    }

    if (diff.hunks.length > 0 && lineCount < this.countChangedLines(diff)) {
      lines.push(
        `... (${this.countChangedLines(diff) - lineCount} more changes)`
      );
    }

    return lines.join("\n");
  }

  /**
   * Generate line-by-line changes (without context)
   */
  static getChangedLines(diff: DiffResult): DiffLine[] {
    const changedLines: DiffLine[] = [];

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
  static isAddOnly(diff: DiffResult): boolean {
    return diff.additions > 0 && diff.deletions === 0;
  }

  /**
   * Check if the diff contains only deletions (no additions)
   */
  static isDeleteOnly(diff: DiffResult): boolean {
    return diff.deletions > 0 && diff.additions === 0;
  }

  /**
   * Generate a colored diff string for terminal display
   */
  static generateColoredDiff(diff: DiffResult, filename: string): string {
    const lines: string[] = [];

    // Add summary
    lines.push(diff.summary);
    lines.push(`--- a/${filename}`);
    lines.push(`+++ b/${filename}`);

    for (const hunk of diff.hunks) {
      lines.push(
        `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`
      );

      for (const line of hunk.lines) {
        if (line.type === "add") {
          lines.push(`+${line.content}`);
        } else if (line.type === "del") {
          lines.push(`-${line.content}`);
        } else {
          lines.push(` ${line.content}`);
        }
      }
    }

    return lines.join("\n");
  }
}
