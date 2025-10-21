import OpenAI from "openai";
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

export class ZaiClient {
  private client: OpenAI;
  private currentModel: string = "glm-4.6"; // Modèle par défaut avec support thinking
  private defaultMaxTokens: number;
  private thinkingEnabled: boolean = false;

  constructor(apiKey: string, model?: string, baseURL?: string) {
    // OpenAI SDK automatically appends /chat/completions, so baseURL should be the root
    this.client = new OpenAI({
      apiKey,
      baseURL: baseURL || process.env.ZAI_BASE_URL || "https://api.z.ai/api/coding/paas/v4",
      timeout: 360000,
      dangerouslyAllowBrowser: false,
    });
    const envMax = Number(process.env.ZAI_MAX_TOKENS);
    this.defaultMaxTokens = Number.isFinite(envMax) && envMax > 0 ? envMax : 1536;
    if (model) {
      this.currentModel = model;
    }

    // Activer le thinking par défaut pour les modèles qui le supportent
    if (this.supportsThinking(this.currentModel)) {
      this.thinkingEnabled = true;
    }
  }

  private supportsThinking(model: string): boolean {
    // Liste des modèles qui supportent le thinking mode
    const thinkingModels = ['glm-4.6', 'glm-4-6', 'glm-4.5', 'glm-4-5'];
    return thinkingModels.some(m => model.toLowerCase().includes(m));
  }

  setThinkingEnabled(enabled: boolean): void {
    this.thinkingEnabled = enabled;
  }

  getThinkingEnabled(): boolean {
    return this.thinkingEnabled;
  }

  setModel(model: string): void {
    this.currentModel = model;
    // Réactiver le thinking si le nouveau modèle le supporte
    if (this.supportsThinking(model)) {
      this.thinkingEnabled = true;
    }
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  async chat(
    messages: ZaiMessage[],
    tools?: ZaiTool[],
    model?: string
  ): Promise<ZaiResponse> {
    try {
      const requestPayload: any = {
        model: model || this.currentModel,
        messages,
        tools: tools || [],
        tool_choice: tools && tools.length > 0 ? "auto" : undefined,
        temperature: 0.7,
        max_tokens: this.defaultMaxTokens,
      };

      // Add thinking parameter for GLM-4.6 and compatible models
      // L'API Z.ai retourne le thinking dans "reasoning_content"
      if (this.thinkingEnabled) {
        requestPayload.thinking = { type: "enabled" };
      }

      const response =
        await this.client.chat.completions.create(requestPayload);

      return response as ZaiResponse;
    } catch (error: any) {
      throw new Error(`Z.ai API error: ${error.message}`);
    }
  }

  async *chatStream(
    messages: ZaiMessage[],
    tools?: ZaiTool[],
    model?: string
  ): AsyncGenerator<any, void, unknown> {
    try {
      const requestPayload: any = {
        model: model || this.currentModel,
        messages,
        tools: tools || [],
        tool_choice: tools && tools.length > 0 ? "auto" : undefined,
        temperature: 0.7,
        max_tokens: this.defaultMaxTokens,
        stream: true,
      };

      // Add thinking parameter for GLM-4.6 and compatible models
      if (this.thinkingEnabled) {
        requestPayload.thinking = { type: "enabled" };
      }

      const stream = (await this.client.chat.completions.create(
        requestPayload
      )) as any;

      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error: any) {
      throw new Error(`Z.ai API error: ${error.message}`);
    }
  }
}
