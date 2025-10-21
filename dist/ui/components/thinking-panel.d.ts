import React from "react";
interface ThinkingPanelProps {
    thinkingContent: string;
    modelName: string;
    isVisible: boolean;
    isStreaming: boolean;
}
export default function ThinkingPanel({ thinkingContent, modelName, isVisible, isStreaming, }: ThinkingPanelProps): React.JSX.Element;
export {};
