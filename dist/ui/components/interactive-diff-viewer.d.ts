import React from "react";
import { DiffResult } from "../../utils/diff-generator.js";
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
export declare const InteractiveDiffViewer: ({ changes, onAccept, onReject, onAcceptAll, onRejectAll, onEdit, showFullDiff, terminalHeight, terminalWidth, }: InteractiveDiffViewerProps) => React.ReactElement;
