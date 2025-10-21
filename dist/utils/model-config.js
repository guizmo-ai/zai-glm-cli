import { getSettingsManager } from './settings-manager.js';
/**
 * Get the effective current model
 * Priority: project current model > user default model > system default
 */
export function getCurrentModel() {
    const manager = getSettingsManager();
    return manager.getCurrentModel();
}
/**
 * Load model configuration
 * Priority: user-settings.json models > default hardcoded
 */
export function loadModelConfig() {
    const manager = getSettingsManager();
    const models = manager.getAvailableModels();
    return models.map(model => ({
        model: model.trim()
    }));
}
/**
 * Get default models list
 */
export function getDefaultModels() {
    const manager = getSettingsManager();
    return manager.getAvailableModels();
}
/**
 * Update the current model in project settings
 */
export function updateCurrentModel(modelName) {
    const manager = getSettingsManager();
    manager.setCurrentModel(modelName);
}
/**
 * Update the user's default model preference
 */
export function updateDefaultModel(modelName) {
    const manager = getSettingsManager();
    manager.updateUserSetting('defaultModel', modelName);
}
//# sourceMappingURL=model-config.js.map