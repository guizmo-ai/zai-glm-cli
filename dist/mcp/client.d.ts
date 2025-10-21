import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { EventEmitter } from "events";
import { TransportType, TransportConfig } from "./transports.js";
export interface MCPServerConfig {
    name: string;
    transport: TransportConfig;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
}
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: any;
    serverName: string;
}
export declare class MCPManager extends EventEmitter {
    private clients;
    private transports;
    private tools;
    addServer(config: MCPServerConfig): Promise<void>;
    removeServer(serverName: string): Promise<void>;
    callTool(toolName: string, arguments_: any): Promise<CallToolResult>;
    getTools(): MCPTool[];
    getServers(): string[];
    shutdown(): Promise<void>;
    getTransportType(serverName: string): TransportType | undefined;
    ensureServersInitialized(): Promise<void>;
}
