import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BaseTransport, TransportType, TransportConfig, StdioTransport } from "./base.js";
import { SSETransport } from "./sse.js";
import { HTTPTransport } from "./http.js";
import { WebSocketTransport } from "./websocket.js";
import { Logger } from "../utils/logger.js";

export interface MultiTransportConfig {
  transports: TransportConfig[];
  defaultTransport?: TransportType;
}

export class TransportManager {
  private logger: Logger;
  private server: Server;
  private transports: Map<TransportType, BaseTransport> = new Map();
  private config: MultiTransportConfig;

  constructor(server: Server, config: MultiTransportConfig) {
    this.logger = new Logger("TransportManager");
    this.server = server;
    this.config = config;
  }

  private createTransport(config: TransportConfig): BaseTransport {
    switch (config.type) {
      case TransportType.STDIO:
        return new StdioTransport(this.server, config);
      case TransportType.SSE:
        return new SSETransport(this.server, config);
      case TransportType.HTTP:
        return new HTTPTransport(this.server, config);
      case TransportType.WEBSOCKET:
        return new WebSocketTransport(this.server, config);
      case TransportType.GRPC:
        // TODO: Implement gRPC transport
        throw new Error("gRPC transport not yet implemented");
      default:
        throw new Error(`Unknown transport type: ${config.type}`);
    }
  }

  async initialize(): Promise<void> {
    this.logger.info(`Initializing ${this.config.transports.length} transports`);

    for (const transportConfig of this.config.transports) {
      try {
        const transport = this.createTransport(transportConfig);
        this.transports.set(transportConfig.type, transport);
        this.logger.info(`Created ${transportConfig.type} transport`);
      } catch (error) {
        this.logger.error(`Failed to create ${transportConfig.type} transport`, error);
      }
    }
  }

  async start(): Promise<void> {
    const startPromises: Promise<void>[] = [];

    for (const [type, transport] of this.transports) {
      this.logger.info(`Starting ${type} transport`);
      startPromises.push(
        transport.start().catch(error => {
          this.logger.error(`Failed to start ${type} transport`, error);
          throw error;
        })
      );
    }

    await Promise.all(startPromises);
    this.logger.info("All transports started successfully");
  }

  async stop(): Promise<void> {
    const stopPromises: Promise<void>[] = [];

    for (const [type, transport] of this.transports) {
      if (transport.isRunning()) {
        this.logger.info(`Stopping ${type} transport`);
        stopPromises.push(
          transport.stop().catch(error => {
            this.logger.error(`Failed to stop ${type} transport`, error);
          })
        );
      }
    }

    await Promise.all(stopPromises);
    this.logger.info("All transports stopped");
  }

  getTransport(type: TransportType): BaseTransport | undefined {
    return this.transports.get(type);
  }

  getActiveTransports(): TransportType[] {
    const active: TransportType[] = [];
    for (const [type, transport] of this.transports) {
      if (transport.isRunning()) {
        active.push(type);
      }
    }
    return active;
  }

  isAnyTransportRunning(): boolean {
    for (const transport of this.transports.values()) {
      if (transport.isRunning()) {
        return true;
      }
    }
    return false;
  }

  getStatus(): Record<TransportType, boolean> {
    const status: Partial<Record<TransportType, boolean>> = {};
    for (const [type, transport] of this.transports) {
      status[type] = transport.isRunning();
    }
    return status as Record<TransportType, boolean>;
  }
}