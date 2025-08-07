import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { Logger } from '../utils/logger.js';
import type { Message } from '../types/index.js';

interface SessionData {
  id: string;
  created: string;
  lastAccessed: string;
  conversations: ConversationData[];
  metadata: Record<string, any>;
  tools: ToolUsage[];
  files: FileAccess[];
}

interface ConversationData {
  id: string;
  title?: string;
  created: string;
  updated: string;
  messages: Message[];
  context: Record<string, any>;
  tokens: number;
}

interface ToolUsage {
  tool: string;
  timestamp: string;
  input: any;
  output: any;
  duration: number;
}

interface FileAccess {
  path: string;
  operation: 'read' | 'write' | 'edit';
  timestamp: string;
  content?: string;
}

export class SessionStorage {
  private logger: Logger;
  private sessionDir: string;
  private currentSession: SessionData | null = null;
  private sessionFile: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;

  constructor(sessionId?: string) {
    this.logger = new Logger('SessionStorage');
    
    // Determine session directory (similar to Claude Code's approach)
    const baseDir = process.env.MCP_SESSION_DIR || 
                   path.join(os.homedir(), '.ultimate-mcp', 'sessions');
    
    this.sessionDir = baseDir;
    
    // Generate or use provided session ID
    const id = sessionId || this.generateSessionId();
    this.sessionFile = path.join(this.sessionDir, `${id}.json`);
  }

  async initialize(): Promise<void> {
    try {
      // Ensure session directory exists
      await fs.mkdir(this.sessionDir, { recursive: true });
      
      // Try to load existing session
      await this.loadSession();
      
      // Start auto-save interval (every 30 seconds)
      this.startAutoSave();
      
      this.logger.info(`Session initialized: ${this.currentSession?.id}`);
    } catch (error) {
      this.logger.error('Failed to initialize session storage:', error);
      // Create new session if loading fails
      await this.createNewSession();
    }
  }

  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `session-${timestamp}-${random}`;
  }

  private async createNewSession(): Promise<void> {
    const sessionId = path.basename(this.sessionFile, '.json');
    
    this.currentSession = {
      id: sessionId,
      created: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      conversations: [],
      metadata: {
        platform: process.platform,
        nodeVersion: process.version,
        mcpVersion: '2.0.0',
        startTime: Date.now()
      },
      tools: [],
      files: []
    };
    
    await this.saveSession();
  }

  private async loadSession(): Promise<void> {
    try {
      const data = await fs.readFile(this.sessionFile, 'utf-8');
      this.currentSession = JSON.parse(data);
      
      // Update last accessed time
      if (this.currentSession) {
        this.currentSession.lastAccessed = new Date().toISOString();
        this.isDirty = true;
      }
    } catch (error) {
      // Session file doesn't exist or is corrupted
      await this.createNewSession();
    }
  }

  async saveSession(): Promise<void> {
    if (!this.currentSession) return;
    
    try {
      const data = JSON.stringify(this.currentSession, null, 2);
      await fs.writeFile(this.sessionFile, data, 'utf-8');
      this.isDirty = false;
      this.logger.debug('Session saved successfully');
    } catch (error) {
      this.logger.error('Failed to save session:', error);
    }
  }

  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(async () => {
      if (this.isDirty) {
        await this.saveSession();
      }
    }, 30000); // Save every 30 seconds if there are changes
  }

  async addMessage(conversationId: string, message: Message): Promise<void> {
    if (!this.currentSession) return;
    
    // Find or create conversation
    let conversation = this.currentSession.conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      conversation = {
        id: conversationId,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        messages: [],
        context: {},
        tokens: 0
      };
      this.currentSession.conversations.push(conversation);
    }
    
    // Add message
    conversation.messages.push(message);
    conversation.updated = new Date().toISOString();
    
    // Estimate tokens (rough calculation)
    const messageTokens = Math.ceil(message.content.length / 4);
    conversation.tokens += messageTokens;
    
    // Keep conversation size manageable (max 100 messages)
    if (conversation.messages.length > 100) {
      // Keep first 10 and last 90 messages for context
      conversation.messages = [
        ...conversation.messages.slice(0, 10),
        {
          role: 'system',
          content: '[... earlier messages truncated for space ...]'
        },
        ...conversation.messages.slice(-89)
      ];
    }
    
    this.isDirty = true;
  }

  async addToolUsage(tool: string, input: any, output: any, duration: number): Promise<void> {
    if (!this.currentSession) return;
    
    this.currentSession.tools.push({
      tool,
      timestamp: new Date().toISOString(),
      input,
      output,
      duration
    });
    
    // Keep only last 500 tool usages
    if (this.currentSession.tools.length > 500) {
      this.currentSession.tools = this.currentSession.tools.slice(-500);
    }
    
    this.isDirty = true;
  }

  async addFileAccess(filePath: string, operation: 'read' | 'write' | 'edit', content?: string): Promise<void> {
    if (!this.currentSession) return;
    
    this.currentSession.files.push({
      path: filePath,
      operation,
      timestamp: new Date().toISOString(),
      content: content ? content.substring(0, 1000) : undefined // Store first 1000 chars
    });
    
    // Keep only last 200 file accesses
    if (this.currentSession.files.length > 200) {
      this.currentSession.files = this.currentSession.files.slice(-200);
    }
    
    this.isDirty = true;
  }

  async getConversationHistory(conversationId: string, limit: number = 50): Promise<Message[]> {
    if (!this.currentSession) return [];
    
    const conversation = this.currentSession.conversations.find(c => c.id === conversationId);
    if (!conversation) return [];
    
    return conversation.messages.slice(-limit);
  }

  async getAllConversations(): Promise<ConversationData[]> {
    if (!this.currentSession) return [];
    return this.currentSession.conversations;
  }

  async getRecentTools(limit: number = 20): Promise<ToolUsage[]> {
    if (!this.currentSession) return [];
    return this.currentSession.tools.slice(-limit);
  }

  async getRecentFiles(limit: number = 20): Promise<FileAccess[]> {
    if (!this.currentSession) return [];
    return this.currentSession.files.slice(-limit);
  }

  async searchMessages(query: string, limit: number = 20): Promise<Message[]> {
    if (!this.currentSession) return [];
    
    const results: Message[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const conversation of this.currentSession.conversations) {
      for (const message of conversation.messages) {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          results.push(message);
          if (results.length >= limit) return results;
        }
      }
    }
    
    return results;
  }

  async getSessionMetadata(): Promise<Record<string, any>> {
    if (!this.currentSession) return {};
    
    return {
      ...this.currentSession.metadata,
      sessionId: this.currentSession.id,
      created: this.currentSession.created,
      lastAccessed: this.currentSession.lastAccessed,
      conversationCount: this.currentSession.conversations.length,
      totalMessages: this.currentSession.conversations.reduce((sum, c) => sum + c.messages.length, 0),
      totalTokens: this.currentSession.conversations.reduce((sum, c) => sum + c.tokens, 0),
      toolUsageCount: this.currentSession.tools.length,
      fileAccessCount: this.currentSession.files.length
    };
  }

  async listSessions(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.sessionDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => path.basename(f, '.json'));
    } catch (error) {
      return [];
    }
  }

  async switchSession(sessionId: string): Promise<void> {
    // Save current session
    await this.saveSession();
    
    // Switch to new session
    this.sessionFile = path.join(this.sessionDir, `${sessionId}.json`);
    await this.loadSession();
  }

  async deleteSession(sessionId?: string): Promise<void> {
    const targetId = sessionId || this.currentSession?.id;
    if (!targetId) return;
    
    const targetFile = path.join(this.sessionDir, `${targetId}.json`);
    
    try {
      await fs.unlink(targetFile);
      
      // If deleting current session, create a new one
      if (targetId === this.currentSession?.id) {
        await this.createNewSession();
      }
    } catch (error) {
      this.logger.error('Failed to delete session:', error);
    }
  }

  async exportSession(): Promise<string> {
    if (!this.currentSession) return '{}';
    return JSON.stringify(this.currentSession, null, 2);
  }

  async importSession(data: string): Promise<void> {
    try {
      const sessionData = JSON.parse(data);
      
      // Validate session data structure
      if (!sessionData.id || !sessionData.conversations) {
        throw new Error('Invalid session data format');
      }
      
      this.currentSession = sessionData;
      await this.saveSession();
    } catch (error) {
      this.logger.error('Failed to import session:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Stop auto-save
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    // Save final state
    await this.saveSession();
  }

  // Get current session ID
  getCurrentSessionId(): string | null {
    return this.currentSession?.id || null;
  }

  // Check if session has unsaved changes
  hasUnsavedChanges(): boolean {
    return this.isDirty;
  }
}