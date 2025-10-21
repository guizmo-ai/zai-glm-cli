/**
 * User-level settings stored in ~/.zai/user-settings.json
 * These are global settings that apply across all projects
 */
export interface UserSettings {
    apiKey?: string;
    baseURL?: string;
    defaultModel?: string;
    models?: string[];
    watchEnabled?: boolean;
    watchIgnorePatterns?: string[];
    watchDebounceMs?: number;
}
/**
 * Project-level settings stored in .zai/settings.json
 * These are project-specific settings
 */
export interface ProjectSettings {
    model?: string;
    mcpServers?: Record<string, any>;
}
/**
 * Unified settings manager that handles both user-level and project-level settings
 */
export declare class SettingsManager {
    private static instance;
    private userSettingsPath;
    private projectSettingsPath;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): SettingsManager;
    /**
     * Ensure directory exists for a given file path
     */
    private ensureDirectoryExists;
    /**
     * Load user settings from ~/.zai/user-settings.json
     */
    loadUserSettings(): UserSettings;
    /**
     * Save user settings to ~/.zai/user-settings.json
     */
    saveUserSettings(settings: Partial<UserSettings>): void;
    /**
     * Update a specific user setting
     */
    updateUserSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): void;
    /**
     * Get a specific user setting
     */
    getUserSetting<K extends keyof UserSettings>(key: K): UserSettings[K];
    /**
     * Load project settings from .zai/settings.json
     */
    loadProjectSettings(): ProjectSettings;
    /**
     * Save project settings to .zai/settings.json
     */
    saveProjectSettings(settings: Partial<ProjectSettings>): void;
    /**
     * Update a specific project setting
     */
    updateProjectSetting<K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]): void;
    /**
     * Get a specific project setting
     */
    getProjectSetting<K extends keyof ProjectSettings>(key: K): ProjectSettings[K];
    /**
     * Get the current model with proper fallback logic:
     * 1. Project-specific model setting
     * 2. User's default model
     * 3. System default
     */
    getCurrentModel(): string;
    /**
     * Set the current model for the project
     */
    setCurrentModel(model: string): void;
    /**
     * Get available models list from user settings
     */
    getAvailableModels(): string[];
    /**
     * Get API key from user settings or environment
     * Supports both ZAI_API_KEY and GROK_API_KEY (for backward compatibility)
     */
    getApiKey(): string | undefined;
    /**
     * Get base URL from user settings or environment
     * Supports both ZAI_BASE_URL and GROK_BASE_URL (for backward compatibility)
     */
    getBaseURL(): string;
    /**
     * Check if user settings exist and are configured
     */
    isConfigured(): boolean;
    /**
     * Initialize settings with interactive values from onboarding
     */
    initializeFromOnboarding(apiKey: string, baseURL: string, model: string): void;
    /**
     * Reset to default settings
     */
    resetToDefaults(): void;
    /**
     * Get the path to user settings file
     */
    getSettingsPath(): string;
}
/**
 * Convenience function to get the singleton instance
 */
export declare function getSettingsManager(): SettingsManager;
