import { ChatEntry } from '../agent/zai-agent.js';
export interface SessionMetadata {
    id: string;
    name: string;
    created: Date;
    lastModified: Date;
    messageCount: number;
    model: string;
    description?: string;
}
export interface SessionData {
    metadata: SessionMetadata;
    chatHistory: ChatEntry[];
    context: {
        workingDirectory: string;
        model: string;
        customInstructions?: string;
    };
}
export declare class SessionManager {
    private sessionsDir;
    constructor();
    private ensureSessionsDirectory;
    private generateSessionId;
    private getSessionPath;
    saveSession(name: string, chatHistory: ChatEntry[], context: SessionData['context'], description?: string): SessionMetadata;
    loadSession(sessionIdOrName: string): SessionData | null;
    listSessions(): SessionMetadata[];
    deleteSession(sessionIdOrName: string): boolean;
    exportSessionToMarkdown(sessionIdOrName: string, outputPath?: string): string | null;
    updateSessionMetadata(sessionIdOrName: string, updates: Partial<Pick<SessionMetadata, 'name' | 'description'>>): boolean;
}
export declare function getSessionManager(): SessionManager;
