import { ZaiTool } from "./client.js";
import { MCPManager, MCPTool } from "../mcp/client.js";
export declare const ZAI_TOOLS: ZaiTool[];
export declare function getMCPManager(): MCPManager;
export declare function initializeMCPServers(): Promise<void>;
export declare function convertMCPToolToZaiTool(mcpTool: MCPTool): ZaiTool;
export declare function addMCPToolsToZaiTools(baseTools: ZaiTool[]): ZaiTool[];
export declare function getAllZaiTools(): Promise<ZaiTool[]>;
