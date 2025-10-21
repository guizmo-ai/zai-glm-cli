/**
 * Settings validation utilities for Z.ai configuration
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
}
/**
 * Validate API key format
 * Basic validation to ensure the API key is not empty and has a reasonable format
 */
export declare function validateApiKey(apiKey: string): ValidationResult;
/**
 * Validate base URL format
 * Ensures the URL is properly formatted and uses HTTPS
 */
export declare function validateBaseURL(url: string): ValidationResult;
/**
 * Validate model selection
 * Checks if the model is in the list of available models
 */
export declare function validateModel(model: string, availableModels: string[]): ValidationResult;
/**
 * Validate all settings at once
 * Useful for validating complete configuration before saving
 */
export declare function validateSettings(settings: {
    apiKey?: string;
    baseURL?: string;
    model?: string;
    availableModels?: string[];
}): {
    valid: boolean;
    errors: string[];
};
