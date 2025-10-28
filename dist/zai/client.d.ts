import type { ChatCompletionMessageParam } from "openai/resources/chat";
export type ZaiMessage = ChatCompletionMessageParam;
export interface ZaiTool {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, any>;
            required: string[];
        };
    };
}
export interface ZaiToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}
export interface ZaiResponse {
    choices: Array<{
        message: {
            role: string;
            content: string | null;
            tool_calls?: ZaiToolCall[];
        };
        finish_reason: string;
    }>;
}
export declare class ZaiClient {
    private client;
    private currentModel;
    private defaultMaxTokens;
    private thinkingEnabled;
    readonly apiKey: string;
    readonly baseURL: string;
    constructor(apiKey: string, model?: string, baseURL?: string);
    private supportsThinking;
    setThinkingEnabled(enabled: boolean): void;
    getThinkingEnabled(): boolean;
    setModel(model: string): void;
    getCurrentModel(): string;
    get model(): string;
    chat(messages: ZaiMessage[], tools?: ZaiTool[], model?: string): Promise<ZaiResponse>;
    chatStream(messages: ZaiMessage[], tools?: ZaiTool[], model?: string): AsyncGenerator<any, void, unknown>;
}
