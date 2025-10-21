export interface ModelOption {
    model: string;
}
export type ModelConfig = string;
/**
 * Get the effective current model
 * Priority: project current model > user default model > system default
 */
export declare function getCurrentModel(): string;
/**
 * Load model configuration
 * Priority: user-settings.json models > default hardcoded
 */
export declare function loadModelConfig(): ModelOption[];
/**
 * Get default models list
 */
export declare function getDefaultModels(): string[];
/**
 * Update the current model in project settings
 */
export declare function updateCurrentModel(modelName: string): void;
/**
 * Update the user's default model preference
 */
export declare function updateDefaultModel(modelName: string): void;
