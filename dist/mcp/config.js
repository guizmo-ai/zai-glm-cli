import { getSettingsManager } from "../utils/settings-manager.js";
/**
 * Load MCP configuration from project settings
 */
export function loadMCPConfig() {
    const manager = getSettingsManager();
    const projectSettings = manager.loadProjectSettings();
    const servers = projectSettings.mcpServers ? Object.values(projectSettings.mcpServers) : [];
    return { servers };
}
export function saveMCPConfig(config) {
    const manager = getSettingsManager();
    const mcpServers = {};
    // Convert servers array to object keyed by name
    for (const server of config.servers) {
        mcpServers[server.name] = server;
    }
    manager.updateProjectSetting('mcpServers', mcpServers);
}
export function addMCPServer(config) {
    const manager = getSettingsManager();
    const projectSettings = manager.loadProjectSettings();
    const mcpServers = projectSettings.mcpServers || {};
    mcpServers[config.name] = config;
    manager.updateProjectSetting('mcpServers', mcpServers);
}
export function removeMCPServer(serverName) {
    const manager = getSettingsManager();
    const projectSettings = manager.loadProjectSettings();
    const mcpServers = projectSettings.mcpServers;
    if (mcpServers) {
        delete mcpServers[serverName];
        manager.updateProjectSetting('mcpServers', mcpServers);
    }
}
export function getMCPServer(serverName) {
    const manager = getSettingsManager();
    const projectSettings = manager.loadProjectSettings();
    return projectSettings.mcpServers?.[serverName];
}
// Predefined server configurations
export const PREDEFINED_SERVERS = {};
//# sourceMappingURL=config.js.map