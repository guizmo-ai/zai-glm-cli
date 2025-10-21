import React from "react";
import { Box, Text } from "ink";
import { HistoryEntry } from "../../utils/history-manager.js";

interface HistorySearchProps {
  query: string;
  results: HistoryEntry[];
  selectedIndex: number;
  isVisible: boolean;
  maxResults?: number;
}

/**
 * History search component for Ctrl+R reverse search
 * Displays matching history entries with highlighted selection
 */
export function HistorySearch({
  query,
  results,
  selectedIndex,
  isVisible,
  maxResults = 10,
}: HistorySearchProps) {
  if (!isVisible) {
    return null;
  }

  const displayResults = results.slice(-maxResults);
  const adjustedIndex = selectedIndex - Math.max(0, results.length - maxResults);

  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          History Search (Ctrl+R)
        </Text>
        {query && (
          <Text color="gray" dimColor>
            {" "}
            - searching for: "{query}"
          </Text>
        )}
      </Box>

      {displayResults.length === 0 ? (
        <Box>
          <Text color="gray" dimColor>
            {query ? `No matches found for "${query}"` : "Start typing to search history..."}
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {displayResults.map((entry, index) => {
            const isSelected = index === adjustedIndex;
            const displayTimestamp = new Date(entry.timestamp).toLocaleString();

            return (
              <Box key={`${entry.timestamp}-${index}`} marginBottom={0}>
                <Box width={4}>
                  <Text color={isSelected ? "green" : "gray"}>
                    {isSelected ? "▶ " : "  "}
                  </Text>
                </Box>
                <Box flexDirection="column" flexGrow={1}>
                  <Text
                    color={isSelected ? "green" : "white"}
                    bold={isSelected}
                  >
                    {highlightMatch(entry.command, query)}
                  </Text>
                  <Box>
                    <Text color="gray" dimColor>
                      {displayTimestamp}
                    </Text>
                    {entry.workingDirectory && (
                      <Text color="gray" dimColor>
                        {" "}
                        • {shortenPath(entry.workingDirectory)}
                      </Text>
                    )}
                    {entry.model && (
                      <Text color="gray" dimColor>
                        {" "}
                        • {entry.model}
                      </Text>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑/↓ navigate • Enter to select • Esc to cancel
        </Text>
      </Box>

      {results.length > maxResults && (
        <Box>
          <Text color="yellow" dimColor>
            Showing {maxResults} of {results.length} matches
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Highlight matching characters in the command
 */
function highlightMatch(text: string, query: string): string {
  if (!query) {
    return text;
  }

  // For fuzzy matching visualization, we could add highlighting here
  // For now, just return the text as-is since terminal highlighting is complex
  return text;
}

/**
 * Shorten directory paths for display
 */
function shortenPath(path: string): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  if (homeDir && path.startsWith(homeDir)) {
    return "~" + path.slice(homeDir.length);
  }

  // If path is too long, show only the last 2 segments
  const segments = path.split("/").filter(Boolean);
  if (segments.length > 3) {
    return ".../" + segments.slice(-2).join("/");
  }

  return path;
}
