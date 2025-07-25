import { createClient, RedisClientType } from "redis";
import postgres from "postgres";
import { Logger } from "../utils/logger.js";
import type { Message } from "../types/index.js";
import crypto from "crypto";

interface ConversationRecord {
  id: string;
  title?: string;
  created_at: Date;
  updated_at: Date;
}

interface MessageRecord extends Message {
  id: string;
  conversation_id: string;
  timestamp: Date;
  tokens?: number;
}

export class ContextManager {
  private redis: RedisClientType | null = null;
  private sql: postgres.Sql | null = null;
  private logger: Logger;
  private currentConversationId: string;
  private initialized: boolean = false;

  constructor() {
    this.logger = new Logger("ContextManager");
    this.currentConversationId = this.generateId();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize Redis for fast context retrieval
      if (process.env.REDIS_URL) {
        this.redis = createClient({ url: process.env.REDIS_URL });
        await this.redis.connect();
        this.logger.info("Connected to Redis");
      }

      // Initialize PostgreSQL for persistent storage
      if (process.env.DATABASE_URL) {
        this.sql = postgres(process.env.DATABASE_URL);
        await this.setupDatabase();
        this.logger.info("Connected to PostgreSQL");
      }

      this.initialized = true;
    } catch (error) {
      this.logger.warn("Context persistence not available:", error);
      // Continue without persistence - use in-memory only
    }
  }

  private async setupDatabase(): Promise<void> {
    if (!this.sql) return;

    await this.sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.sql`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(64) PRIMARY KEY,
        conversation_id VARCHAR(64) REFERENCES conversations(id),
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        name VARCHAR(100),
        metadata JSONB,
        tokens INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_conversation_timestamp (conversation_id, timestamp)
      )
    `;
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  async startNewConversation(title?: string): Promise<string> {
    this.currentConversationId = this.generateId();

    if (this.sql) {
      await this.sql`
        INSERT INTO conversations (id, title)
        VALUES (${this.currentConversationId}, ${title || null})
      `;
    }

    // Clear Redis cache for new conversation
    if (this.redis) {
      await this.redis.del(`conversation:${this.currentConversationId}`);
    }

    this.logger.info(`Started new conversation: ${this.currentConversationId}`);
    return this.currentConversationId;
  }

  async addMessage(message: Message): Promise<void> {
    const messageId = this.generateId();
    const timestamp = new Date();

    // Save to PostgreSQL
    if (this.sql) {
      await this.sql`
        INSERT INTO messages (id, conversation_id, role, content, name, metadata, timestamp)
        VALUES (
          ${messageId},
          ${this.currentConversationId},
          ${message.role},
          ${message.content},
          ${message.name || null},
          ${JSON.stringify(message.metadata) || null},
          ${timestamp}
        )
      `;
    }

    // Cache in Redis
    if (this.redis) {
      const key = `conversation:${this.currentConversationId}`;
      const messageData = JSON.stringify({ ...message, id: messageId, timestamp });
      await this.redis.rPush(key, messageData);
      await this.redis.expire(key, 3600); // 1 hour TTL
    }
  }

  async getConversationHistory(
    conversationId?: string,
    limit: number = 50
  ): Promise<MessageRecord[]> {
    const targetId = conversationId || this.currentConversationId;

    // Try Redis first
    if (this.redis) {
      const key = `conversation:${targetId}`;
      const messages = await this.redis.lRange(key, -limit, -1);
      if (messages.length > 0) {
        return messages.map(m => JSON.parse(m));
      }
    }

    // Fallback to PostgreSQL
    if (this.sql) {
      const messages = await this.sql<MessageRecord[]>`
        SELECT * FROM messages
        WHERE conversation_id = ${targetId}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
      return messages.reverse();
    }

    return [];
  }

  async searchMessages(query: string, limit: number = 20): Promise<MessageRecord[]> {
    if (!this.sql) {
      return [];
    }

    const messages = await this.sql<MessageRecord[]>`
      SELECT * FROM messages
      WHERE content ILIKE ${`%${query}%`}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    return messages;
  }

  async getConversations(limit: number = 20): Promise<ConversationRecord[]> {
    if (!this.sql) {
      return [];
    }

    const conversations = await this.sql<ConversationRecord[]>`
      SELECT * FROM conversations
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `;

    return conversations;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    if (this.sql) {
      await this.sql`
        DELETE FROM messages WHERE conversation_id = ${conversationId}
      `;
      await this.sql`
        DELETE FROM conversations WHERE id = ${conversationId}
      `;
    }

    if (this.redis) {
      await this.redis.del(`conversation:${conversationId}`);
    }
  }

  getCurrentConversationId(): string {
    return this.currentConversationId;
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    if (this.sql) {
      await this.sql.end();
    }
  }
}