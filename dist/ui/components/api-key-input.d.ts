import React from "react";
import { ZaiAgent } from "../../agent/zai-agent.js";
interface ApiKeyInputProps {
    onApiKeySet: (agent: ZaiAgent) => void;
}
export default function ApiKeyInput({ onApiKeySet }: ApiKeyInputProps): React.JSX.Element;
export {};
