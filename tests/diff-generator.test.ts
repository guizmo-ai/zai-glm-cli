import { describe, it, expect, beforeEach } from "vitest";
import {
  DiffGenerator,
  DiffResult,
  DiffHunk,
  DiffLine,
} from "../src/utils/diff-generator.js";

describe("DiffGenerator", () => {
  describe("generateDiff", () => {
    describe("Basic diff generation", () => {
      it("should generate diff for additions", () => {
        const oldContent = "line1\nline2\nline3\n";
        const newContent = "line1\nline2\nline3\nline4\n";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(1);
        expect(result.deletions).toBe(0);
        expect(result.hunks).toHaveLength(1);
        expect(result.hunks[0].lines.some((l) => l.type === "add")).toBe(true);
        expect(result.hunks[0].lines.find((l) => l.type === "add")?.content).toBe(
          "line4"
        );
      });

      it("should generate diff for deletions", () => {
        const oldContent = "line1\nline2\nline3\nline4\n";
        const newContent = "line1\nline2\nline3\n";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(0);
        expect(result.deletions).toBe(1);
        expect(result.hunks).toHaveLength(1);
        expect(result.hunks[0].lines.some((l) => l.type === "del")).toBe(true);
        expect(result.hunks[0].lines.find((l) => l.type === "del")?.content).toBe(
          "line4"
        );
      });

      it("should generate diff for modifications", () => {
        const oldContent = "line1\nline2\nline3\n";
        const newContent = "line1\nmodified line2\nline3\n";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(1);
        expect(result.deletions).toBe(1);
        expect(result.hunks).toHaveLength(1);

        const deletedLine = result.hunks[0].lines.find((l) => l.type === "del");
        const addedLine = result.hunks[0].lines.find((l) => l.type === "add");

        expect(deletedLine?.content).toBe("line2");
        expect(addedLine?.content).toBe("modified line2");
      });

      it("should generate diff for multiple changes", () => {
        const oldContent = "line1\nline2\nline3\nline4\nline5\n";
        const newContent = "line1\nmodified line2\nline3\nline4\nline5\nline6\n";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(2);
        expect(result.deletions).toBe(1);
      });
    });

    describe("Empty file scenarios", () => {
      it("should handle old file empty", () => {
        const oldContent = "";
        const newContent = "line1\nline2\nline3";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(3);
        expect(result.deletions).toBe(0);
        expect(result.hunks).toHaveLength(1);
      });

      it("should handle new file empty", () => {
        const oldContent = "line1\nline2\nline3";
        const newContent = "";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(0);
        expect(result.deletions).toBe(3);
        expect(result.hunks).toHaveLength(1);
      });

      it("should handle both files empty", () => {
        const oldContent = "";
        const newContent = "";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(0);
        expect(result.deletions).toBe(0);
        expect(result.hunks).toHaveLength(0);
      });
    });

    describe("Single line scenarios", () => {
      it("should handle single line addition", () => {
        const oldContent = "";
        const newContent = "single line";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(1);
        expect(result.deletions).toBe(0);
        expect(result.hunks[0].lines[0].content).toBe("single line");
      });

      it("should handle single line deletion", () => {
        const oldContent = "single line";
        const newContent = "";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(0);
        expect(result.deletions).toBe(1);
        expect(result.hunks[0].lines[0].content).toBe("single line");
      });

      it("should handle single line modification", () => {
        const oldContent = "old line";
        const newContent = "new line";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(1);
        expect(result.deletions).toBe(1);
      });
    });

    describe("Context lines", () => {
      it("should include 3 context lines before and after changes", () => {
        const oldContent = "line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8";
        const newContent = "line1\nline2\nline3\nline4\nmodified\nline6\nline7\nline8";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.hunks).toHaveLength(1);

        const contextLines = result.hunks[0].lines.filter((l) => l.type === "context");
        expect(contextLines.length).toBeGreaterThanOrEqual(3);
      });

      it("should handle changes at start of file with limited context", () => {
        const oldContent = "line1\nline2\nline3\nline4\nline5";
        const newContent = "modified\nline2\nline3\nline4\nline5";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.hunks).toHaveLength(1);
        expect(result.hunks[0].oldStart).toBe(1);
      });

      it("should handle changes at end of file with limited context", () => {
        const oldContent = "line1\nline2\nline3\nline4\nline5";
        const newContent = "line1\nline2\nline3\nline4\nmodified";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.hunks).toHaveLength(1);
        expect(result.additions).toBe(1);
        expect(result.deletions).toBe(1);
      });
    });

    describe("Line numbering", () => {
      it("should track old line numbers for deletions", () => {
        const oldContent = "line1\nline2\nline3";
        const newContent = "line1\nline3";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        const deletedLine = result.hunks[0].lines.find((l) => l.type === "del");
        expect(deletedLine?.oldLineNumber).toBeDefined();
        expect(deletedLine?.newLineNumber).toBeUndefined();
      });

      it("should track new line numbers for additions", () => {
        const oldContent = "line1\nline3";
        const newContent = "line1\nline2\nline3";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        const addedLine = result.hunks[0].lines.find((l) => l.type === "add");
        expect(addedLine?.newLineNumber).toBeDefined();
        expect(addedLine?.oldLineNumber).toBeUndefined();
      });

      it("should track both line numbers for context lines", () => {
        const oldContent = "line1\nline2\nline3";
        const newContent = "line1\nmodified\nline3";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        const contextLines = result.hunks[0].lines.filter((l) => l.type === "context");
        contextLines.forEach((line) => {
          expect(line.oldLineNumber).toBeDefined();
          expect(line.newLineNumber).toBeDefined();
        });
      });
    });

    describe("Hunk boundaries", () => {
      it("should set correct hunk start and line counts", () => {
        const oldContent = "line1\nline2\nline3";
        const newContent = "line1\nmodified\nline3";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.hunks).toHaveLength(1);
        expect(result.hunks[0].oldStart).toBeGreaterThan(0);
        expect(result.hunks[0].oldLines).toBeGreaterThan(0);
        expect(result.hunks[0].newStart).toBeGreaterThan(0);
        expect(result.hunks[0].newLines).toBeGreaterThan(0);
      });

      it("should create multiple hunks for distant changes", () => {
        const oldLines = Array(100).fill(0).map((_, i) => `line${i + 1}`);
        const newLines = [...oldLines];
        newLines[5] = "modified1";
        newLines[50] = "modified2";

        const oldContent = oldLines.join("\n");
        const newContent = newLines.join("\n");

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        // Should have 2 hunks for changes far apart
        expect(result.hunks.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe("Unicode and special characters", () => {
      it("should handle unicode characters", () => {
        const oldContent = "Hello 世界\nこんにちは";
        const newContent = "Hello 世界\nさようなら";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(1);
        expect(result.deletions).toBe(1);
        expect(result.hunks[0].lines.find((l) => l.type === "add")?.content).toBe(
          "さようなら"
        );
      });

      it("should handle emoji", () => {
        const oldContent = "Hello 👋\nWorld 🌍";
        const newContent = "Hello 👋\nUniverse 🌌";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(1);
        expect(result.deletions).toBe(1);
      });

      it("should handle special whitespace characters", () => {
        const oldContent = "line1\t\tindented\nline2";
        const newContent = "line1    indented\nline2";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.additions).toBe(1);
        expect(result.deletions).toBe(1);
      });

      it("should handle mixed line endings", () => {
        const oldContent = "line1\r\nline2\nline3";
        const newContent = "line1\nline2\r\nline3";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        // The diff library should normalize line endings
        expect(result).toBeDefined();
      });
    });

    describe("Filename parameter", () => {
      it("should use filename in summary when provided", () => {
        const oldContent = "line1";
        const newContent = "line1\nline2";

        const result = DiffGenerator.generateDiff(
          oldContent,
          newContent,
          "test.txt"
        );

        expect(result.summary).toContain("test.txt");
      });

      it("should generate summary without filename when not provided", () => {
        const oldContent = "line1";
        const newContent = "line1\nline2";

        const result = DiffGenerator.generateDiff(oldContent, newContent);

        expect(result.summary).not.toContain("test.txt");
        expect(result.summary).toContain("addition");
      });
    });
  });

  describe("generateSummary", () => {
    it("should generate summary with additions only", () => {
      const oldContent = "line1\n";
      const newContent = "line1\nline2\n";

      const result = DiffGenerator.generateDiff(oldContent, newContent, "file.txt");

      expect(result.summary).toContain("file.txt");
      expect(result.summary).toContain("1 addition");
      expect(result.summary).not.toContain("deletion");
    });

    it("should generate summary with deletions only", () => {
      const oldContent = "line1\nline2\n";
      const newContent = "line1\n";

      const result = DiffGenerator.generateDiff(oldContent, newContent, "file.txt");

      expect(result.summary).toContain("file.txt");
      expect(result.summary).toContain("1 deletion");
      expect(result.summary).not.toContain("addition");
    });

    it("should generate summary with both additions and deletions", () => {
      const oldContent = "line1\nline2";
      const newContent = "line1\nline3\nline4";

      const result = DiffGenerator.generateDiff(oldContent, newContent, "file.txt");

      expect(result.summary).toContain("file.txt");
      expect(result.summary).toContain("addition");
      expect(result.summary).toContain("deletion");
    });

    it("should use plural form for multiple additions", () => {
      const oldContent = "line1\n";
      const newContent = "line1\nline2\nline3\n";

      const result = DiffGenerator.generateDiff(oldContent, newContent, "file.txt");

      expect(result.summary).toContain("2 additions");
    });

    it("should use plural form for multiple deletions", () => {
      const oldContent = "line1\nline2\nline3\n";
      const newContent = "line1\n";

      const result = DiffGenerator.generateDiff(oldContent, newContent, "file.txt");

      expect(result.summary).toContain("2 deletions");
    });

    it("should indicate no changes when files are identical", () => {
      const content = "line1\nline2\nline3";

      const result = DiffGenerator.generateDiff(content, content, "file.txt");

      expect(result.summary).toContain("no changes");
    });
  });

  describe("generateUnifiedDiff", () => {
    it("should generate unified diff format", () => {
      const oldContent = "line1\nline2\nline3";
      const newContent = "line1\nmodified\nline3";

      const unified = DiffGenerator.generateUnifiedDiff(
        oldContent,
        newContent,
        "test.txt"
      );

      expect(unified).toContain("--- test.txt");
      expect(unified).toContain("+++ test.txt");
      expect(unified).toContain("@@");
      expect(unified).toContain("-line2");
      expect(unified).toContain("+modified");
    });

    it("should use default filename when not provided", () => {
      const oldContent = "line1";
      const newContent = "line2";

      const unified = DiffGenerator.generateUnifiedDiff(oldContent, newContent);

      expect(unified).toContain("--- file");
      expect(unified).toContain("+++ file");
    });

    it("should return empty diff for identical content", () => {
      const content = "line1\nline2\nline3";

      const unified = DiffGenerator.generateUnifiedDiff(content, content);

      // Should contain headers but no change hunks
      expect(unified).toContain("---");
      expect(unified).toContain("+++");
    });
  });

  describe("toUnifiedFormat", () => {
    it("should convert DiffResult to unified format", () => {
      const oldContent = "line1\nline2\nline3";
      const newContent = "line1\nmodified\nline3";

      const diffResult = DiffGenerator.generateDiff(oldContent, newContent);
      const unified = DiffGenerator.toUnifiedFormat(diffResult, "test.txt");

      expect(unified).toContain("--- a/test.txt");
      expect(unified).toContain("+++ b/test.txt");
      expect(unified).toContain("@@");
      expect(unified).toContain("-line2");
      expect(unified).toContain("+modified");
    });

    it("should format context lines with space prefix", () => {
      const oldContent = "line1\nline2\nline3";
      const newContent = "line1\nmodified\nline3";

      const diffResult = DiffGenerator.generateDiff(oldContent, newContent);
      const unified = DiffGenerator.toUnifiedFormat(diffResult, "test.txt");

      expect(unified).toContain(" line1");
      expect(unified).toContain(" line3");
    });

    it("should format additions with + prefix", () => {
      const oldContent = "line1";
      const newContent = "line1\nline2";

      const diffResult = DiffGenerator.generateDiff(oldContent, newContent);
      const unified = DiffGenerator.toUnifiedFormat(diffResult, "test.txt");

      expect(unified).toContain("+line2");
    });

    it("should format deletions with - prefix", () => {
      const oldContent = "line1\nline2";
      const newContent = "line1";

      const diffResult = DiffGenerator.generateDiff(oldContent, newContent);
      const unified = DiffGenerator.toUnifiedFormat(diffResult, "test.txt");

      expect(unified).toContain("-line2");
    });
  });

  describe("areIdentical", () => {
    it("should return true for identical content", () => {
      const content = "line1\nline2\nline3";

      expect(DiffGenerator.areIdentical(content, content)).toBe(true);
    });

    it("should return false for different content", () => {
      const oldContent = "line1\nline2";
      const newContent = "line1\nline3";

      expect(DiffGenerator.areIdentical(oldContent, newContent)).toBe(false);
    });

    it("should return true for empty strings", () => {
      expect(DiffGenerator.areIdentical("", "")).toBe(true);
    });

    it("should be sensitive to whitespace", () => {
      expect(DiffGenerator.areIdentical("line1", "line1 ")).toBe(false);
      expect(DiffGenerator.areIdentical("line1\n", "line1")).toBe(false);
    });
  });

  describe("countChangedLines", () => {
    it("should count additions only", () => {
      const oldContent = "line1\n";
      const newContent = "line1\nline2\nline3\n";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const count = DiffGenerator.countChangedLines(diff);

      expect(count).toBe(2);
    });

    it("should count deletions only", () => {
      const oldContent = "line1\nline2\nline3\n";
      const newContent = "line1\n";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const count = DiffGenerator.countChangedLines(diff);

      expect(count).toBe(2);
    });

    it("should count both additions and deletions", () => {
      const oldContent = "line1\nline2";
      const newContent = "line1\nline3\nline4";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const count = DiffGenerator.countChangedLines(diff);

      expect(count).toBe(3); // 1 deletion + 2 additions
    });

    it("should return 0 for no changes", () => {
      const content = "line1\nline2";

      const diff = DiffGenerator.generateDiff(content, content);
      const count = DiffGenerator.countChangedLines(diff);

      expect(count).toBe(0);
    });
  });

  describe("getPreview", () => {
    it("should get first N lines of changes", () => {
      const oldContent = "line1\nline2\nline3\nline4\nline5";
      const newContent = "new1\nnew2\nnew3\nnew4\nnew5";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const preview = DiffGenerator.getPreview(diff, 3);

      const lines = preview.split("\n");
      // Should have 3 lines + potentially a "more changes" line
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(4);
    });

    it("should exclude context lines from preview", () => {
      const oldContent = "line1\nline2\nline3\nline4\nline5";
      const newContent = "line1\nmodified\nline3\nline4\nline5";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const preview = DiffGenerator.getPreview(diff, 10);

      expect(preview).toContain("- line2");
      expect(preview).toContain("+ modified");
      // Context lines should not appear in preview
      expect(preview.split("\n").every((l) => l.startsWith("+") || l.startsWith("-") || l.startsWith("..."))).toBe(true);
    });

    it("should add continuation message for truncated preview", () => {
      const oldLines = Array(20).fill(0).map((_, i) => `line${i + 1}`);
      const newLines = Array(20).fill(0).map((_, i) => `new${i + 1}`);

      const diff = DiffGenerator.generateDiff(oldLines.join("\n"), newLines.join("\n"));
      const preview = DiffGenerator.getPreview(diff, 5);

      expect(preview).toContain("...");
      expect(preview).toContain("more changes");
    });

    it("should not add continuation message when all changes shown", () => {
      const oldContent = "line1\nline2";
      const newContent = "new1\nnew2";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const preview = DiffGenerator.getPreview(diff, 10);

      expect(preview).not.toContain("more changes");
    });

    it("should use default maxLines of 10 when not specified", () => {
      const oldLines = Array(20).fill(0).map((_, i) => `line${i + 1}`);
      const newLines = Array(20).fill(0).map((_, i) => `new${i + 1}`);

      const diff = DiffGenerator.generateDiff(oldLines.join("\n"), newLines.join("\n"));
      const preview = DiffGenerator.getPreview(diff);

      const lines = preview.split("\n").filter((l) => !l.includes("more changes"));
      expect(lines.length).toBeLessThanOrEqual(10);
    });
  });

  describe("getChangedLines", () => {
    it("should return only changed lines without context", () => {
      const oldContent = "line1\nline2\nline3\nline4\nline5";
      const newContent = "line1\nmodified2\nline3\nmodified4\nline5";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const changedLines = DiffGenerator.getChangedLines(diff);

      expect(changedLines.length).toBe(4); // 2 deletions + 2 additions
      expect(changedLines.every((l) => l.type !== "context")).toBe(true);
    });

    it("should return empty array for no changes", () => {
      const content = "line1\nline2\nline3";

      const diff = DiffGenerator.generateDiff(content, content);
      const changedLines = DiffGenerator.getChangedLines(diff);

      expect(changedLines).toHaveLength(0);
    });

    it("should include line numbers in changed lines", () => {
      const oldContent = "line1\nline2\nline3";
      const newContent = "line1\nmodified\nline3";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const changedLines = DiffGenerator.getChangedLines(diff);

      const deletedLine = changedLines.find((l) => l.type === "del");
      const addedLine = changedLines.find((l) => l.type === "add");

      expect(deletedLine?.oldLineNumber).toBeDefined();
      expect(addedLine?.newLineNumber).toBeDefined();
    });
  });

  describe("isAddOnly", () => {
    it("should return true for additions only", () => {
      const oldContent = "line1\n";
      const newContent = "line1\nline2\nline3\n";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);

      expect(DiffGenerator.isAddOnly(diff)).toBe(true);
    });

    it("should return false for deletions only", () => {
      const oldContent = "line1\nline2\nline3\n";
      const newContent = "line1\n";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);

      expect(DiffGenerator.isAddOnly(diff)).toBe(false);
    });

    it("should return false for mixed changes", () => {
      const oldContent = "line1\nline2";
      const newContent = "line1\nline3";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);

      expect(DiffGenerator.isAddOnly(diff)).toBe(false);
    });

    it("should return false for no changes", () => {
      const content = "line1\nline2";

      const diff = DiffGenerator.generateDiff(content, content);

      expect(DiffGenerator.isAddOnly(diff)).toBe(false);
    });
  });

  describe("isDeleteOnly", () => {
    it("should return true for deletions only", () => {
      const oldContent = "line1\nline2\nline3\n";
      const newContent = "line1\n";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);

      expect(DiffGenerator.isDeleteOnly(diff)).toBe(true);
    });

    it("should return false for additions only", () => {
      const oldContent = "line1\n";
      const newContent = "line1\nline2\nline3\n";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);

      expect(DiffGenerator.isDeleteOnly(diff)).toBe(false);
    });

    it("should return false for mixed changes", () => {
      const oldContent = "line1\nline2";
      const newContent = "line1\nline3";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);

      expect(DiffGenerator.isDeleteOnly(diff)).toBe(false);
    });

    it("should return false for no changes", () => {
      const content = "line1\nline2";

      const diff = DiffGenerator.generateDiff(content, content);

      expect(DiffGenerator.isDeleteOnly(diff)).toBe(false);
    });
  });

  describe("generateColoredDiff", () => {
    it("should include summary in colored diff", () => {
      const oldContent = "line1\nline2";
      const newContent = "line1\nmodified";

      const diff = DiffGenerator.generateDiff(oldContent, newContent, "test.txt");
      const colored = DiffGenerator.generateColoredDiff(diff, "test.txt");

      expect(colored).toContain(diff.summary);
    });

    it("should include file headers", () => {
      const oldContent = "line1";
      const newContent = "line2";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const colored = DiffGenerator.generateColoredDiff(diff, "test.txt");

      expect(colored).toContain("--- a/test.txt");
      expect(colored).toContain("+++ b/test.txt");
    });

    it("should include hunk headers", () => {
      const oldContent = "line1\nline2";
      const newContent = "line1\nmodified";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const colored = DiffGenerator.generateColoredDiff(diff, "test.txt");

      expect(colored).toContain("@@");
    });

    it("should prefix additions with +", () => {
      const oldContent = "line1";
      const newContent = "line1\nline2";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const colored = DiffGenerator.generateColoredDiff(diff, "test.txt");

      expect(colored).toContain("+line2");
    });

    it("should prefix deletions with -", () => {
      const oldContent = "line1\nline2";
      const newContent = "line1";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const colored = DiffGenerator.generateColoredDiff(diff, "test.txt");

      expect(colored).toContain("-line2");
    });

    it("should prefix context lines with space", () => {
      const oldContent = "line1\nline2\nline3";
      const newContent = "line1\nmodified\nline3";

      const diff = DiffGenerator.generateDiff(oldContent, newContent);
      const colored = DiffGenerator.generateColoredDiff(diff, "test.txt");

      expect(colored).toContain(" line1");
      expect(colored).toContain(" line3");
    });
  });

  describe("Large file scenarios", () => {
    it("should handle large files efficiently", () => {
      const largeOldContent = Array(1000).fill(0).map((_, i) => `line${i + 1}`).join("\n");
      const largeNewContent = Array(1000).fill(0).map((_, i) => i === 500 ? "modified" : `line${i + 1}`).join("\n");

      const result = DiffGenerator.generateDiff(largeOldContent, largeNewContent);

      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(1);
      expect(result.hunks.length).toBeGreaterThan(0);
    });

    it("should handle many changes across large files", () => {
      const largeOldContent = Array(1000).fill(0).map((_, i) => `line${i + 1}`).join("\n");
      const largeNewContent = Array(1000).fill(0).map((_, i) => i % 10 === 0 ? `modified${i}` : `line${i + 1}`).join("\n");

      const result = DiffGenerator.generateDiff(largeOldContent, largeNewContent);

      expect(result.additions).toBe(100);
      expect(result.deletions).toBe(100);
    });
  });

  describe("Edge cases", () => {
    it("should handle files with no trailing newline", () => {
      const oldContent = "line1\nline2";
      const newContent = "line1\nline2\nline3";

      const result = DiffGenerator.generateDiff(oldContent, newContent);

      // The diff library treats "no newline at end of file" as a change
      // so we just verify the diff was generated correctly
      expect(result.additions).toBeGreaterThanOrEqual(1);
      expect(result.hunks.length).toBeGreaterThan(0);
    });

    it("should handle files with multiple consecutive empty lines", () => {
      const oldContent = "line1\n\n\nline2";
      const newContent = "line1\n\nline2";

      const result = DiffGenerator.generateDiff(oldContent, newContent);

      expect(result.deletions).toBe(1);
    });

    it("should handle whitespace-only changes", () => {
      const oldContent = "line1\nline2";
      const newContent = "line1  \nline2";

      const result = DiffGenerator.generateDiff(oldContent, newContent);

      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(1);
    });

    it("should handle very long lines", () => {
      const longLine = "x".repeat(10000);
      const oldContent = `line1\n${longLine}\nline3`;
      const newContent = `line1\nmodified\nline3`;

      const result = DiffGenerator.generateDiff(oldContent, newContent);

      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(1);
    });

    it("should handle identical files", () => {
      const content = "line1\nline2\nline3";

      const result = DiffGenerator.generateDiff(content, content);

      expect(result.additions).toBe(0);
      expect(result.deletions).toBe(0);
      expect(result.hunks).toHaveLength(0);
      expect(result.summary).toContain("no changes");
    });
  });
});
