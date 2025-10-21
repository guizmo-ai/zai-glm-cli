import React from "react";
import { ZaiAgent } from "../../agent/zai-agent.js";
import { SessionData } from "../../utils/session-manager.js";
interface ChatInterfaceProps {
    agent?: ZaiAgent;
    initialMessage?: string;
    initialSession?: SessionData;
    watchMode?: boolean;
}
export default function ChatInterface({ agent, initialMessage, initialSession, watchMode, }: ChatInterfaceProps): React.JSX.Element;
export {};
