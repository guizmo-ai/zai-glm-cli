import React from "react";
import { ChatEntry } from "../../agent/zai-agent.js";
interface ChatHistoryProps {
    entries: ChatEntry[];
    isConfirmationActive?: boolean;
}
export declare function ChatHistory({ entries, isConfirmationActive, }: ChatHistoryProps): React.JSX.Element;
export {};
