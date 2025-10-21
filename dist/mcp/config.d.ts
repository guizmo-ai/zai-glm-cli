import { MCPServerConfig } from "./client.js";
export interface MCPConfig {
    servers: MCPServerConfig[];
}
/**
 * Load MCP configuration from project settings
 */
export declare function loadMCPConfig(): MCPConfig;
export declare function saveMCPConfig(config: MCPConfig): void;
export declare function addMCPServer(config: MCPServerConfig): void;
export declare function removeMCPServer(serverName: string): void;
export declare function getMCPServer(serverName: string): MCPServerConfig | undefined;
export declare const PREDEFINED_SERVERS: Record<string, MCPServerConfig>;
