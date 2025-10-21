import { ZaiAgent, ChatEntry } from "../agent/zai-agent.js";
interface UseInputHandlerProps {
    agent: ZaiAgent;
    chatHistory: ChatEntry[];
    setChatHistory: React.Dispatch<React.SetStateAction<ChatEntry[]>>;
    setIsProcessing: (processing: boolean) => void;
    setIsStreaming: (streaming: boolean) => void;
    setTokenCount: (count: number) => void;
    setProcessingTime: (time: number) => void;
    processingStartTime: React.MutableRefObject<number>;
    isProcessing: boolean;
    isStreaming: boolean;
    isConfirmationActive?: boolean;
    setShowThinking?: React.Dispatch<React.SetStateAction<boolean>>;
    setThinkingContent?: React.Dispatch<React.SetStateAction<string>>;
}
interface CommandSuggestion {
    command: string;
    description: string;
}
interface ModelOption {
    model: string;
}
export declare function useInputHandler({ agent, chatHistory, setChatHistory, setIsProcessing, setIsStreaming, setTokenCount, setProcessingTime, processingStartTime, isProcessing, isStreaming, isConfirmationActive, setShowThinking, setThinkingContent, }: UseInputHandlerProps): {
    input: string;
    cursorPosition: number;
    showCommandSuggestions: boolean;
    selectedCommandIndex: number;
    showModelSelection: boolean;
    selectedModelIndex: number;
    commandSuggestions: CommandSuggestion[];
    availableModels: ModelOption[];
    agent: ZaiAgent;
    autoEditEnabled: boolean;
    showThinking: boolean;
};
export {};
