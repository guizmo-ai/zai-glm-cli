import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { EventEmitter } from "events";
export type TransportType = 'stdio' | 'http' | 'sse' | 'streamable_http';
export interface TransportConfig {
    type: TransportType;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
}
export interface MCPTransport {
    connect(): Promise<Transport>;
    disconnect(): Promise<void>;
    getType(): TransportType;
}
export declare class StdioTransport implements MCPTransport {
    private config;
    private transport?;
    private process?;
    constructor(config: TransportConfig);
    connect(): Promise<Transport>;
    disconnect(): Promise<void>;
    getType(): TransportType;
}
export declare class HttpTransport extends EventEmitter implements MCPTransport {
    private config;
    private client?;
    private connected;
    constructor(config: TransportConfig);
    connect(): Promise<Transport>;
    disconnect(): Promise<void>;
    getType(): TransportType;
}
export declare class SSETransport extends EventEmitter implements MCPTransport {
    private config;
    private connected;
    constructor(config: TransportConfig);
    connect(): Promise<Transport>;
    disconnect(): Promise<void>;
    getType(): TransportType;
}
export declare class StreamableHttpTransport extends EventEmitter implements MCPTransport {
    private config;
    private connected;
    constructor(config: TransportConfig);
    connect(): Promise<Transport>;
    disconnect(): Promise<void>;
    getType(): TransportType;
}
export declare function createTransport(config: TransportConfig): MCPTransport;
