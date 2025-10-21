import React from 'react';
import { Box, Text } from 'ink';

interface FileWatcherIndicatorProps {
  isActive: boolean;
  watchPath: string | null;
  recentChanges: number;
}

export default function FileWatcherIndicator({
  isActive,
  watchPath,
  recentChanges,
}: FileWatcherIndicatorProps) {
  if (!isActive) {
    return null;
  }

  return (
    <Box>
      <Text color="cyan">watching</Text>
      {recentChanges > 0 && (
        <Text color="yellow"> ({recentChanges} changes)</Text>
      )}
    </Box>
  );
}
