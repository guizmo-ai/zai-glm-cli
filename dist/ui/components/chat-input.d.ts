import React from "react";
interface ChatInputProps {
    input: string;
    cursorPosition: number;
    isProcessing: boolean;
    isStreaming: boolean;
}
export declare function ChatInput({ input, cursorPosition, isProcessing, isStreaming, }: ChatInputProps): React.JSX.Element;
export {};
