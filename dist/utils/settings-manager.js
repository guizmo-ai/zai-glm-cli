import * as fs from "fs";
import * as path from "path";
import * as os from "os";
/**
 * Default values for user settings
 */
const DEFAULT_USER_SETTINGS = {
    baseURL: "https://api.z.ai/api/coding/paas/v4",
    defaultModel: "glm-4.6",
    models: ["glm-4.6", "glm-4.5", "glm-4.5-air"],
    watchEnabled: false,
    watchIgnorePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/.zai/**',
        '**/coverage/**',
        '**/*.log',
        '**/.DS_Store',
    ],
    watchDebounceMs: 300,
};
/**
 * Default values for project settings
 */
const DEFAULT_PROJECT_SETTINGS = {
    model: "glm-4.6",
};
/**
 * Unified settings manager that handles both user-level and project-level settings
 */
export class SettingsManager {
    static instance;
    userSettingsPath;
    projectSettingsPath;
    constructor() {
        // User settings path: ~/.zai/user-settings.json
        this.userSettingsPath = path.join(os.homedir(), ".zai", "user-settings.json");
        // Project settings path: .zai/settings.json (in current working directory)
        this.projectSettingsPath = path.join(process.cwd(), ".zai", "settings.json");
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    }
    /**
     * Ensure directory exists for a given file path
     */
    ensureDirectoryExists(filePath) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        }
    }
    /**
     * Load user settings from ~/.zai/user-settings.json
     */
    loadUserSettings() {
        try {
            if (!fs.existsSync(this.userSettingsPath)) {
                // Create default user settings if file doesn't exist
                this.saveUserSettings(DEFAULT_USER_SETTINGS);
                return { ...DEFAULT_USER_SETTINGS };
            }
            const content = fs.readFileSync(this.userSettingsPath, "utf-8");
            const settings = JSON.parse(content);
            // Merge with defaults to ensure all required fields exist
            return { ...DEFAULT_USER_SETTINGS, ...settings };
        }
        catch (error) {
            console.warn("Failed to load user settings:", error instanceof Error ? error.message : "Unknown error");
            return { ...DEFAULT_USER_SETTINGS };
        }
    }
    /**
     * Save user settings to ~/.zai/user-settings.json
     */
    saveUserSettings(settings) {
        try {
            this.ensureDirectoryExists(this.userSettingsPath);
            // Read existing settings directly to avoid recursion
            let existingSettings = { ...DEFAULT_USER_SETTINGS };
            if (fs.existsSync(this.userSettingsPath)) {
                try {
                    const content = fs.readFileSync(this.userSettingsPath, "utf-8");
                    const parsed = JSON.parse(content);
                    existingSettings = { ...DEFAULT_USER_SETTINGS, ...parsed };
                }
                catch (error) {
                    // If file is corrupted, use defaults
                    console.warn("Corrupted user settings file, using defaults");
                }
            }
            const mergedSettings = { ...existingSettings, ...settings };
            fs.writeFileSync(this.userSettingsPath, JSON.stringify(mergedSettings, null, 2), { mode: 0o600 } // Secure permissions for API key
            );
        }
        catch (error) {
            console.error("Failed to save user settings:", error instanceof Error ? error.message : "Unknown error");
            throw error;
        }
    }
    /**
     * Update a specific user setting
     */
    updateUserSetting(key, value) {
        const settings = { [key]: value };
        this.saveUserSettings(settings);
    }
    /**
     * Get a specific user setting
     */
    getUserSetting(key) {
        const settings = this.loadUserSettings();
        return settings[key];
    }
    /**
     * Load project settings from .zai/settings.json
     */
    loadProjectSettings() {
        try {
            if (!fs.existsSync(this.projectSettingsPath)) {
                // Create default project settings if file doesn't exist
                this.saveProjectSettings(DEFAULT_PROJECT_SETTINGS);
                return { ...DEFAULT_PROJECT_SETTINGS };
            }
            const content = fs.readFileSync(this.projectSettingsPath, "utf-8");
            const settings = JSON.parse(content);
            // Merge with defaults
            return { ...DEFAULT_PROJECT_SETTINGS, ...settings };
        }
        catch (error) {
            console.warn("Failed to load project settings:", error instanceof Error ? error.message : "Unknown error");
            return { ...DEFAULT_PROJECT_SETTINGS };
        }
    }
    /**
     * Save project settings to .zai/settings.json
     */
    saveProjectSettings(settings) {
        try {
            this.ensureDirectoryExists(this.projectSettingsPath);
            // Read existing settings directly to avoid recursion
            let existingSettings = { ...DEFAULT_PROJECT_SETTINGS };
            if (fs.existsSync(this.projectSettingsPath)) {
                try {
                    const content = fs.readFileSync(this.projectSettingsPath, "utf-8");
                    const parsed = JSON.parse(content);
                    existingSettings = { ...DEFAULT_PROJECT_SETTINGS, ...parsed };
                }
                catch (error) {
                    // If file is corrupted, use defaults
                    console.warn("Corrupted project settings file, using defaults");
                }
            }
            const mergedSettings = { ...existingSettings, ...settings };
            fs.writeFileSync(this.projectSettingsPath, JSON.stringify(mergedSettings, null, 2));
        }
        catch (error) {
            console.error("Failed to save project settings:", error instanceof Error ? error.message : "Unknown error");
            throw error;
        }
    }
    /**
     * Update a specific project setting
     */
    updateProjectSetting(key, value) {
        const settings = { [key]: value };
        this.saveProjectSettings(settings);
    }
    /**
     * Get a specific project setting
     */
    getProjectSetting(key) {
        const settings = this.loadProjectSettings();
        return settings[key];
    }
    /**
     * Get the current model with proper fallback logic:
     * 1. Project-specific model setting
     * 2. User's default model
     * 3. System default
     */
    getCurrentModel() {
        const projectModel = this.getProjectSetting("model");
        if (projectModel) {
            return projectModel;
        }
        const userDefaultModel = this.getUserSetting("defaultModel");
        if (userDefaultModel) {
            return userDefaultModel;
        }
        return DEFAULT_PROJECT_SETTINGS.model || "glm-4.6";
    }
    /**
     * Set the current model for the project
     */
    setCurrentModel(model) {
        this.updateProjectSetting("model", model);
    }
    /**
     * Get available models list from user settings
     */
    getAvailableModels() {
        const models = this.getUserSetting("models");
        return models || DEFAULT_USER_SETTINGS.models || [];
    }
    /**
     * Get API key from user settings or environment
     * Supports both ZAI_API_KEY and GROK_API_KEY (for backward compatibility)
     */
    getApiKey() {
        // First check ZAI_API_KEY environment variable
        const zaiApiKey = process.env.ZAI_API_KEY;
        if (zaiApiKey) {
            return zaiApiKey;
        }
        // Fall back to GROK_API_KEY for backward compatibility
        const grokApiKey = process.env.GROK_API_KEY;
        if (grokApiKey) {
            return grokApiKey;
        }
        // Then check user settings
        return this.getUserSetting("apiKey");
    }
    /**
     * Get base URL from user settings or environment
     * Supports both ZAI_BASE_URL and GROK_BASE_URL (for backward compatibility)
     */
    getBaseURL() {
        // First check ZAI_BASE_URL environment variable
        const zaiBaseURL = process.env.ZAI_BASE_URL;
        if (zaiBaseURL) {
            return zaiBaseURL;
        }
        // Fall back to GROK_BASE_URL for backward compatibility
        const grokBaseURL = process.env.GROK_BASE_URL;
        if (grokBaseURL) {
            return grokBaseURL;
        }
        // Then check user settings
        const userBaseURL = this.getUserSetting("baseURL");
        return (userBaseURL ||
            DEFAULT_USER_SETTINGS.baseURL ||
            "https://api.z.ai/api/coding/paas/v4");
    }
    /**
     * Check if user settings exist and are configured
     */
    isConfigured() {
        return fs.existsSync(this.userSettingsPath) && !!this.getApiKey();
    }
    /**
     * Initialize settings with interactive values from onboarding
     */
    initializeFromOnboarding(apiKey, baseURL, model) {
        this.saveUserSettings({
            apiKey,
            baseURL,
            defaultModel: model,
            models: DEFAULT_USER_SETTINGS.models,
        });
    }
    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.saveUserSettings(DEFAULT_USER_SETTINGS);
    }
    /**
     * Get the path to user settings file
     */
    getSettingsPath() {
        return this.userSettingsPath;
    }
}
/**
 * Convenience function to get the singleton instance
 */
export function getSettingsManager() {
    return SettingsManager.getInstance();
}
//# sourceMappingURL=settings-manager.js.map