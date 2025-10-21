import fs from 'fs';
import path from 'path';
import os from 'os';
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

export class SessionManager {
  private sessionsDir: string;

  constructor() {
    this.sessionsDir = path.join(os.homedir(), '.zai', 'sessions');
    this.ensureSessionsDirectory();
  }

  private ensureSessionsDirectory(): void {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.sessionsDir, `${sessionId}.json`);
  }

  saveSession(
    name: string,
    chatHistory: ChatEntry[],
    context: SessionData['context'],
    description?: string
  ): SessionMetadata {
    const sessionId = this.generateSessionId();
    const metadata: SessionMetadata = {
      id: sessionId,
      name,
      created: new Date(),
      lastModified: new Date(),
      messageCount: chatHistory.length,
      model: context.model,
      description,
    };

    const sessionData: SessionData = {
      metadata,
      chatHistory,
      context,
    };

    const sessionPath = this.getSessionPath(sessionId);
    fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));

    console.log(`✅ Session saved: ${name} (${sessionId})`);
    return metadata;
  }

  loadSession(sessionIdOrName: string): SessionData | null {
    // Try to find by ID first
    let sessionPath = this.getSessionPath(sessionIdOrName);

    if (!fs.existsSync(sessionPath)) {
      // Try to find by name
      const sessions = this.listSessions();
      const session = sessions.find(s => s.name === sessionIdOrName);
      if (session) {
        sessionPath = this.getSessionPath(session.id);
      } else {
        return null;
      }
    }

    try {
      const data = fs.readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(data) as SessionData;

      // Convert date strings back to Date objects
      sessionData.metadata.created = new Date(sessionData.metadata.created);
      sessionData.metadata.lastModified = new Date(sessionData.metadata.lastModified);

      // Convert timestamp strings in chat history
      sessionData.chatHistory = sessionData.chatHistory.map(entry => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));

      return sessionData;
    } catch (error) {
      console.error(`Failed to load session: ${error}`);
      return null;
    }
  }

  listSessions(): SessionMetadata[] {
    if (!fs.existsSync(this.sessionsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.sessionsDir);
    const sessions: SessionMetadata[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const sessionPath = path.join(this.sessionsDir, file);
        const data = fs.readFileSync(sessionPath, 'utf-8');
        const sessionData = JSON.parse(data) as SessionData;
        sessions.push({
          ...sessionData.metadata,
          created: new Date(sessionData.metadata.created),
          lastModified: new Date(sessionData.metadata.lastModified),
        });
      } catch (error) {
        console.warn(`Skipping invalid session file: ${file}`);
      }
    }

    // Sort by last modified, newest first
    return sessions.sort((a, b) =>
      b.lastModified.getTime() - a.lastModified.getTime()
    );
  }

  deleteSession(sessionIdOrName: string): boolean {
    const sessions = this.listSessions();
    const session = sessions.find(s =>
      s.id === sessionIdOrName || s.name === sessionIdOrName
    );

    if (!session) {
      return false;
    }

    const sessionPath = this.getSessionPath(session.id);

    try {
      fs.unlinkSync(sessionPath);
      console.log(`✅ Session deleted: ${session.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete session: ${error}`);
      return false;
    }
  }

  exportSessionToMarkdown(sessionIdOrName: string, outputPath?: string): string | null {
    const sessionData = this.loadSession(sessionIdOrName);
    if (!sessionData) {
      return null;
    }

    const { metadata, chatHistory } = sessionData;

    let markdown = `# ${metadata.name}\n\n`;
    markdown += `**Created**: ${metadata.created.toLocaleString()}\n`;
    markdown += `**Model**: ${metadata.model}\n`;
    if (metadata.description) {
      markdown += `**Description**: ${metadata.description}\n`;
    }
    markdown += `\n---\n\n`;

    for (const entry of chatHistory) {
      const timestamp = entry.timestamp.toLocaleTimeString();

      switch (entry.type) {
        case 'user':
          markdown += `## 👤 User (${timestamp})\n\n${entry.content}\n\n`;
          break;
        case 'assistant':
          markdown += `## 🤖 Assistant (${timestamp})\n\n${entry.content}\n\n`;
          break;
        case 'tool_call':
          if (entry.toolCall) {
            markdown += `### 🔧 Tool: ${entry.toolCall.function.name}\n\n`;
            markdown += `\`\`\`json\n${JSON.stringify(JSON.parse(entry.toolCall.function.arguments), null, 2)}\n\`\`\`\n\n`;
          }
          break;
        case 'tool_result':
          markdown += `### ✅ Result\n\n\`\`\`\n${entry.content.substring(0, 500)}${entry.content.length > 500 ? '...' : ''}\n\`\`\`\n\n`;
          break;
      }
    }

    if (outputPath) {
      fs.writeFileSync(outputPath, markdown);
      console.log(`✅ Session exported to: ${outputPath}`);
    }

    return markdown;
  }

  updateSessionMetadata(
    sessionIdOrName: string,
    updates: Partial<Pick<SessionMetadata, 'name' | 'description'>>
  ): boolean {
    const sessionData = this.loadSession(sessionIdOrName);
    if (!sessionData) {
      return false;
    }

    sessionData.metadata = {
      ...sessionData.metadata,
      ...updates,
      lastModified: new Date(),
    };

    const sessionPath = this.getSessionPath(sessionData.metadata.id);
    fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));

    return true;
  }
}

// Singleton
let sessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}
