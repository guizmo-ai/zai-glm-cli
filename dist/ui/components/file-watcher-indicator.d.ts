import React from 'react';
interface FileWatcherIndicatorProps {
    isActive: boolean;
    watchPath: string | null;
    recentChanges: number;
}
export default function FileWatcherIndicator({ isActive, watchPath, recentChanges, }: FileWatcherIndicatorProps): React.JSX.Element;
export {};
