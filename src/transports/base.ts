import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Logger } from "../utils/logger.js";

export enum TransportType {
  STDIO = "stdio",
  SSE = "sse",
  HTTP = "http",
  WEBSOCKET = "websocket",
  GRPC = "grpc"
}

export interface TransportConfig {
  type: TransportType;
  port?: number;
  host?: string;
  path?: string;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  auth?: {
    type: "none" | "api-key" | "jwt";
    apiKey?: string;
    jwtSecret?: string;
  };
}

export abstract class BaseTransport {
  protected logger: Logger;
  protected server: Server;
  protected config: TransportConfig;

  constructor(server: Server, config: TransportConfig) {
    this.server = server;
    this.config = config;
    this.logger = new Logger(`${config.type.toUpperCase()}Transport`);
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract isRunning(): boolean;

  protected validateAuth(headers: Record<string, string>): boolean {
    if (!this.config.auth || this.config.auth.type === "none") {
      return true;
    }

    if (this.config.auth.type === "api-key") {
      const apiKey = headers["x-api-key"] || headers["authorization"]?.replace("Bearer ", "");
      return apiKey === this.config.auth.apiKey;
    }

    // JWT auth would be implemented here
    return false;
  }
}

export class StdioTransport extends BaseTransport {
  private transport: StdioServerTransport;
  private running = false;

  constructor(server: Server, config: TransportConfig) {
    super(server, config);
    this.transport = new StdioServerTransport();
  }

  async start(): Promise<void> {
    try {
      await this.server.connect(this.transport);
      this.running = true;
      // No logging in stdio mode - it interferes with the protocol
    } catch (error) {
      // No logging in stdio mode - it interferes with the protocol
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    // No logging in stdio mode - it interferes with the protocol
  }

  isRunning(): boolean {
    return this.running;
  }
}