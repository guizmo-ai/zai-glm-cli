/**
 * Professional diff renderer component
 */
import React from 'react';
interface DiffRendererProps {
    diffContent: string;
    filename?: string;
    tabWidth?: number;
    availableTerminalHeight?: number;
    terminalWidth?: number;
}
export declare const DiffRenderer: ({ diffContent, filename, tabWidth, availableTerminalHeight, terminalWidth, }: DiffRendererProps) => React.ReactElement;
export {};
