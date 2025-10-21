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
export function validateApiKey(apiKey: string): ValidationResult {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      valid: false,
      error: "API key cannot be empty",
    };
  }

  // Check minimum length (most API keys are at least 20 characters)
  if (apiKey.length < 20) {
    return {
      valid: false,
      error: "API key appears to be too short (minimum 20 characters)",
    };
  }

  // Check for common placeholder values
  const placeholders = [
    "your-api-key",
    "your_api_key",
    "placeholder",
    "example",
    "test",
    "dummy",
  ];
  if (placeholders.some((p) => apiKey.toLowerCase().includes(p))) {
    return {
      valid: false,
      error: "API key appears to be a placeholder value",
    };
  }

  return { valid: true };
}

/**
 * Validate base URL format
 * Ensures the URL is properly formatted and uses HTTPS
 */
export function validateBaseURL(url: string): ValidationResult {
  if (!url || url.trim().length === 0) {
    return {
      valid: false,
      error: "Base URL cannot be empty",
    };
  }

  try {
    const parsedUrl = new URL(url);

    // Check protocol (should be https for security)
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return {
        valid: false,
        error: "Base URL must use HTTP or HTTPS protocol",
      };
    }

    // Warn if using HTTP instead of HTTPS (but still valid)
    if (parsedUrl.protocol === "http:") {
      console.warn(
        "Warning: Using HTTP instead of HTTPS is not recommended for API endpoints"
      );
    }

    // Check that hostname exists
    if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
      return {
        valid: false,
        error: "Base URL must have a valid hostname",
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Validate model selection
 * Checks if the model is in the list of available models
 */
export function validateModel(
  model: string,
  availableModels: string[]
): ValidationResult {
  if (!model || model.trim().length === 0) {
    return {
      valid: false,
      error: "Model name cannot be empty",
    };
  }

  if (!availableModels || availableModels.length === 0) {
    return {
      valid: false,
      error: "No available models to validate against",
    };
  }

  if (!availableModels.includes(model)) {
    return {
      valid: false,
      error: `Model "${model}" is not in the list of available models: ${availableModels.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validate all settings at once
 * Useful for validating complete configuration before saving
 */
export function validateSettings(settings: {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  availableModels?: string[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (settings.apiKey !== undefined) {
    const apiKeyResult = validateApiKey(settings.apiKey);
    if (!apiKeyResult.valid && apiKeyResult.error) {
      errors.push(apiKeyResult.error);
    }
  }

  if (settings.baseURL !== undefined) {
    const baseURLResult = validateBaseURL(settings.baseURL);
    if (!baseURLResult.valid && baseURLResult.error) {
      errors.push(baseURLResult.error);
    }
  }

  if (settings.model !== undefined && settings.availableModels !== undefined) {
    const modelResult = validateModel(settings.model, settings.availableModels);
    if (!modelResult.valid && modelResult.error) {
      errors.push(modelResult.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
