import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { DiffResult } from "../../utils/diff-generator.js";
import { Colors } from "../utils/colors.js";
import { MaxSizedBox } from "../shared/max-sized-box.js";

export interface FileChange {
  filePath: string;
  oldContent: string;
  newContent: string;
  diff: DiffResult;
}

export interface InteractiveDiffViewerProps {
  changes: FileChange[];
  onAccept: (fileIndex: number) => void;
  onReject: (fileIndex: number) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onEdit?: (fileIndex: number) => void;
  showFullDiff?: boolean;
  terminalHeight?: number;
  terminalWidth?: number;
}

export const InteractiveDiffViewer = ({
  changes,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onEdit,
  showFullDiff = false,
  terminalHeight = 40,
  terminalWidth = 100,
}: InteractiveDiffViewerProps): React.ReactElement => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullDiffMode, setShowFullDiffMode] = useState(showFullDiff);
  const [showHelp, setShowHelp] = useState(false);

  const currentChange = changes[currentIndex];
  const hasMultipleFiles = changes.length > 1;

  useInput((input, key) => {
    // Help toggle
    if (input === "?" || input === "h") {
      setShowHelp(!showHelp);
      return;
    }

    if (showHelp) {
      // Close help on any key
      setShowHelp(false);
      return;
    }

    // Navigation
    if ((input === "n" || key.rightArrow) && hasMultipleFiles) {
      setCurrentIndex((prev) => (prev + 1) % changes.length);
      return;
    }

    if ((input === "p" || key.leftArrow) && hasMultipleFiles) {
      setCurrentIndex((prev) => (prev - 1 + changes.length) % changes.length);
      return;
    }

    // Actions
    if (input === "a" || input === "y") {
      onAccept(currentIndex);
      return;
    }

    if (input === "r" || input === "n") {
      onReject(currentIndex);
      return;
    }

    if (input === "A") {
      onAcceptAll();
      return;
    }

    if (input === "R") {
      onRejectAll();
      return;
    }

    if (input === "e" && onEdit) {
      onEdit(currentIndex);
      return;
    }

    if (input === "d") {
      setShowFullDiffMode(!showFullDiffMode);
      return;
    }

    if (key.escape) {
      onReject(currentIndex);
      return;
    }
  });

  if (showHelp) {
    return renderHelp(hasMultipleFiles, !!onEdit);
  }

  if (!currentChange) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={Colors.AccentYellow}>No changes to review.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color={Colors.Cyan}>
            File {currentIndex + 1} of {changes.length}:{" "}
          </Text>
          <Text color="white">{currentChange.filePath}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={Colors.Gray}>{currentChange.diff.summary}</Text>
        </Box>
      </Box>

      {/* Diff Content */}
      <Box flexDirection="column" marginBottom={1}>
        {showFullDiffMode ? (
          <FullDiffView
            change={currentChange}
            terminalHeight={terminalHeight - 12}
            terminalWidth={terminalWidth}
          />
        ) : (
          <CompactDiffView
            change={currentChange}
            terminalHeight={terminalHeight - 12}
            terminalWidth={terminalWidth}
          />
        )}
      </Box>

      {/* Actions */}
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
        <Box marginY={1}>
          <Text bold>Actions:</Text>
        </Box>
        <Box flexDirection="column">
          <Text>
            <Text color="green">a</Text>/<Text color="green">y</Text> - Accept this change
          </Text>
          <Text>
            <Text color="red">r</Text>/<Text color="red">n</Text> - Reject this change
          </Text>
          {hasMultipleFiles && (
            <>
              <Text>
                <Text color="cyan">n</Text>/→ - Next file
              </Text>
              <Text>
                <Text color="cyan">p</Text>/← - Previous file
              </Text>
              <Text>
                <Text color="green" bold>A</Text> - Accept all changes
              </Text>
              <Text>
                <Text color="red" bold>R</Text> - Reject all changes
              </Text>
            </>
          )}
          <Text>
            <Text color="yellow">d</Text> - Toggle full diff view
          </Text>
          {onEdit && (
            <Text>
              <Text color="magenta">e</Text> - Edit manually
            </Text>
          )}
          <Text>
            <Text color="gray">?</Text>/<Text color="gray">h</Text> - Show help
          </Text>
          <Text color="gray">Esc - Cancel</Text>
        </Box>
      </Box>
    </Box>
  );
};

const CompactDiffView = ({
  change,
  terminalHeight,
  terminalWidth,
}: {
  change: FileChange;
  terminalHeight: number;
  terminalWidth: number;
}): React.ReactElement => {
  const maxLines = Math.max(10, terminalHeight - 5);
  let lineCount = 0;
  const renderedLines: React.ReactNode[] = [];

  for (const hunk of change.diff.hunks) {
    if (lineCount >= maxLines) break;

    // Add hunk header
    renderedLines.push(
      <Box key={`hunk-${hunk.oldStart}-${hunk.newStart}`}>
        <Text color={Colors.Cyan}>
          @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
        </Text>
      </Box>
    );
    lineCount++;

    for (const line of hunk.lines) {
      if (lineCount >= maxLines) break;

      const lineNumber =
        line.type === "del"
          ? line.oldLineNumber
          : line.newLineNumber;

      const lineKey = `${hunk.oldStart}-${lineNumber}-${line.type}`;

      if (line.type === "add") {
        renderedLines.push(
          <Box key={lineKey} flexDirection="row">
            <Text color={Colors.Gray}>{(lineNumber || "").toString().padEnd(4)}</Text>
            <Text backgroundColor="#86efac" color="#000000">
              + {line.content}
            </Text>
          </Box>
        );
        lineCount++;
      } else if (line.type === "del") {
        renderedLines.push(
          <Box key={lineKey} flexDirection="row">
            <Text color={Colors.Gray}>{(lineNumber || "").toString().padEnd(4)}</Text>
            <Text backgroundColor="redBright" color="#000000">
              - {line.content}
            </Text>
          </Box>
        );
        lineCount++;
      } else if (line.type === "context") {
        renderedLines.push(
          <Box key={lineKey} flexDirection="row">
            <Text color={Colors.Gray}>{(lineNumber || "").toString().padEnd(4)}</Text>
            <Text dimColor>  {line.content}</Text>
          </Box>
        );
        lineCount++;
      }
    }
  }

  const totalChangedLines =
    change.diff.additions + change.diff.deletions;
  if (lineCount < totalChangedLines) {
    renderedLines.push(
      <Box key="more">
        <Text color={Colors.Gray} dimColor>
          ... ({totalChangedLines - lineCount} more lines, press 'd' to view full diff)
        </Text>
      </Box>
    );
  }

  return (
    <MaxSizedBox maxHeight={terminalHeight} maxWidth={terminalWidth}>
      {renderedLines}
    </MaxSizedBox>
  );
};

const FullDiffView = ({
  change,
  terminalHeight,
  terminalWidth,
}: {
  change: FileChange;
  terminalHeight: number;
  terminalWidth: number;
}): React.ReactElement => {
  const renderedLines: React.ReactNode[] = [];

  for (const hunk of change.diff.hunks) {
    // Add hunk header
    renderedLines.push(
      <Box key={`hunk-${hunk.oldStart}-${hunk.newStart}`}>
        <Text color={Colors.Cyan}>
          @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
        </Text>
      </Box>
    );

    for (const line of hunk.lines) {
      const lineNumber =
        line.type === "del"
          ? line.oldLineNumber
          : line.newLineNumber;

      const lineKey = `${hunk.oldStart}-${lineNumber}-${line.type}`;

      if (line.type === "add") {
        renderedLines.push(
          <Box key={lineKey} flexDirection="row">
            <Text color={Colors.Gray}>{(lineNumber || "").toString().padEnd(4)}</Text>
            <Text backgroundColor="#86efac" color="#000000">
              + {line.content}
            </Text>
          </Box>
        );
      } else if (line.type === "del") {
        renderedLines.push(
          <Box key={lineKey} flexDirection="row">
            <Text color={Colors.Gray}>{(lineNumber || "").toString().padEnd(4)}</Text>
            <Text backgroundColor="redBright" color="#000000">
              - {line.content}
            </Text>
          </Box>
        );
      } else if (line.type === "context") {
        renderedLines.push(
          <Box key={lineKey} flexDirection="row">
            <Text color={Colors.Gray}>{(lineNumber || "").toString().padEnd(4)}</Text>
            <Text dimColor>  {line.content}</Text>
          </Box>
        );
      }
    }
  }

  return (
    <MaxSizedBox maxHeight={terminalHeight} maxWidth={terminalWidth}>
      {renderedLines}
    </MaxSizedBox>
  );
};

const renderHelp = (hasMultipleFiles: boolean, hasEdit: boolean): React.ReactElement => {
  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
      <Box marginBottom={1}>
        <Text bold color={Colors.AccentYellow}>
          Interactive Diff Viewer - Help
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Navigation:</Text>
        {hasMultipleFiles && (
          <>
            <Text>  n / → - Next file</Text>
            <Text>  p / ← - Previous file</Text>
          </>
        )}
        <Text>  d - Toggle between compact and full diff view</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Actions:</Text>
        <Text>  a / y - Accept this change</Text>
        <Text>  r / n - Reject this change</Text>
        {hasMultipleFiles && (
          <>
            <Text>  A (shift+a) - Accept all remaining changes</Text>
            <Text>  R (shift+r) - Reject all remaining changes</Text>
          </>
        )}
        {hasEdit && <Text>  e - Edit file manually</Text>}
        <Text>  Esc - Cancel and reject current change</Text>
      </Box>

      <Box flexDirection="column">
        <Text bold>Diff Legend:</Text>
        <Text>
          <Text backgroundColor="#86efac" color="#000000">
            {" "}+ Added lines{" "}
          </Text>
        </Text>
        <Text>
          <Text backgroundColor="redBright" color="#000000">
            {" "}- Deleted lines{" "}
          </Text>
        </Text>
        <Text dimColor>   Context lines (unchanged)</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={Colors.Gray} dimColor>
          Press any key to close this help screen
        </Text>
      </Box>
    </Box>
  );
};
