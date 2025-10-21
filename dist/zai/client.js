import OpenAI from "openai";
export class ZaiClient {
    client;
    currentModel = "glm-4.6"; // Modèle par défaut avec support thinking
    defaultMaxTokens;
    thinkingEnabled = false;
    constructor(apiKey, model, baseURL) {
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
    supportsThinking(model) {
        // Liste des modèles qui supportent le thinking mode
        const thinkingModels = ['glm-4.6', 'glm-4-6', 'glm-4.5', 'glm-4-5'];
        return thinkingModels.some(m => model.toLowerCase().includes(m));
    }
    setThinkingEnabled(enabled) {
        this.thinkingEnabled = enabled;
    }
    getThinkingEnabled() {
        return this.thinkingEnabled;
    }
    setModel(model) {
        this.currentModel = model;
        // Réactiver le thinking si le nouveau modèle le supporte
        if (this.supportsThinking(model)) {
            this.thinkingEnabled = true;
        }
    }
    getCurrentModel() {
        return this.currentModel;
    }
    async chat(messages, tools, model) {
        try {
            const requestPayload = {
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
            const response = await this.client.chat.completions.create(requestPayload);
            return response;
        }
        catch (error) {
            throw new Error(`Z.ai API error: ${error.message}`);
        }
    }
    async *chatStream(messages, tools, model) {
        try {
            const requestPayload = {
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
            const stream = (await this.client.chat.completions.create(requestPayload));
            for await (const chunk of stream) {
                yield chunk;
            }
        }
        catch (error) {
            throw new Error(`Z.ai API error: ${error.message}`);
        }
    }
}
//# sourceMappingURL=client.js.map