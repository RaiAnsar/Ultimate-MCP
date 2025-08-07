import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  ServerCapabilities as MCPServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "../utils/logger.js";
import { ToolRegistry } from "./tool-registry.js";
import { ResourceRegistry } from "./resource-registry.js";
import { PromptRegistry } from "./prompt-registry.js";
import { ContextManager } from "./context-manager.js";
import { MetricsCollector } from "../utils/metrics.js";
import { TransportManager, TransportType, TransportConfig } from "../transports/index.js";
import type { ServerCapabilities } from "../types/index.js";

export interface ServerConfig {
  name?: string;
  version?: string;
  transports?: TransportConfig[];
  capabilities?: Partial<ServerCapabilities>;
}

export class UltimateMCPServer {
  private server: Server;
  private logger: Logger;
  private toolRegistry: ToolRegistry;
  private resourceRegistry: ResourceRegistry;
  private promptRegistry: PromptRegistry;
  private contextManager: ContextManager;
  private metrics: MetricsCollector;
  private transportManager?: TransportManager;
  private capabilities: ServerCapabilities;
  private config: ServerConfig;

  constructor(config: ServerConfig = {}) {
    this.config = {
      name: config.name || "ultimate-mcp-server",
      version: config.version || "2.0.0",
      transports: config.transports || [{ type: TransportType.STDIO }],
      capabilities: config.capabilities || {},
    };

    this.logger = new Logger("UltimateMCPServer");
    this.toolRegistry = new ToolRegistry();
    this.resourceRegistry = new ResourceRegistry();
    this.promptRegistry = new PromptRegistry();
    this.contextManager = new ContextManager();
    this.metrics = new MetricsCollector();

    this.capabilities = {
      tools: true,
      resources: true,
      prompts: true,
      logging: true,
      ...this.config.capabilities,
    };

    // Initialize MCP server with capabilities
    const mcpCapabilities: MCPServerCapabilities = {
      tools: {},
      resources: {},
      prompts: {},
      logging: {},
    };

    this.server = new Server(
      {
        name: this.config.name,
        version: this.config.version,
      },
      mcpCapabilities
    );

    this.setupHandlers();
    this.logger.info(`${this.config.name} v${this.config.version} initialized`);
  }

  private setupHandlers(): void {
    // Tool handlers
    if (this.capabilities.tools) {
      this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: this.toolRegistry.listTools(),
      }));

      this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        this.metrics.recordToolCall(request.params.name);
        return this.toolRegistry.callTool(request.params.name, request.params.arguments);
      });
    }

    // Resource handlers
    if (this.capabilities.resources) {
      this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: this.resourceRegistry.listResources(),
      }));

      this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => ({
        contents: await this.resourceRegistry.readResource(request.params.uri),
      }));
    }

    // Prompt handlers
    if (this.capabilities.prompts) {
      this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
        prompts: this.promptRegistry.listPrompts(),
      }));

      this.server.setRequestHandler(GetPromptRequestSchema, async (request) => ({
        messages: await this.promptRegistry.getPrompt(
          request.params.name,
          request.params.arguments
        ),
      }));
    }

    // Custom request handler for extended functionality
    this.server.handleRequest = async (request: any) => {
      this.logger.debug(`Handling request: ${request.method}`);
      
      // Add session context if available
      if ((request as any).sessionContext) {
        this.contextManager.setContext((request as any).sessionContext);
      }

      // Process the request through the standard MCP server
      const response = await this.server.handleRequest(request);
      
      // Update session context if needed
      if ((request as any).sessionContext) {
        (request as any).sessionContext = this.contextManager.getContext();
      }

      return response;
    };
  }

  async start(): Promise<void> {
    if (this.config.transports && this.config.transports.length > 0) {
      // Multi-transport mode
      this.transportManager = new TransportManager(this.server, {
        transports: this.config.transports,
      });
      
      await this.transportManager.initialize();
      await this.transportManager.start();
      
      const activeTransports = this.transportManager.getActiveTransports();
      this.logger.info(`Server started with transports: ${activeTransports.join(", ")}`);
    } else {
      // Default stdio mode for backward compatibility
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logger.info("Server started with STDIO transport");
    }

    // Start metrics collection
    this.metrics.startCollection();
  }

  async stop(): Promise<void> {
    this.logger.info("Shutting down server...");
    
    // Stop metrics collection
    this.metrics.stopCollection();

    // Stop all transports
    if (this.transportManager) {
      await this.transportManager.stop();
    }

    // Clear registries
    this.toolRegistry.clear();
    this.resourceRegistry.clear();
    this.promptRegistry.clear();
    
    this.logger.info("Server stopped");
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  getResourceRegistry(): ResourceRegistry {
    return this.resourceRegistry;
  }

  getPromptRegistry(): PromptRegistry {
    return this.promptRegistry;
  }

  getContextManager(): ContextManager {
    return this.contextManager;
  }

  getMetrics(): MetricsCollector {
    return this.metrics;
  }

  getTransportStatus(): Record<string, any> | null {
    if (this.transportManager) {
      return {
        active: this.transportManager.getActiveTransports(),
        status: this.transportManager.getStatus(),
      };
    }
    return null;
  }

  // Helper method to configure for specific platforms
  static createForPlatform(platform: string): UltimateMCPServer {
    let config: ServerConfig = {
      name: "ultimate-mcp-server",
      version: "2.0.0",
    };

    switch (platform) {
      case "gemini":
        config.transports = [
          { type: TransportType.HTTP, port: 3001 },
          { type: TransportType.SSE, port: 3000 },
        ];
        break;
      case "cursor":
      case "vscode":
        config.transports = [
          { type: TransportType.STDIO },
          { type: TransportType.HTTP, port: 3001 },
        ];
        break;
      case "web":
        config.transports = [
          { type: TransportType.HTTP, port: 3001 },
          { type: TransportType.SSE, port: 3000 },
        ];
        break;
      default:
        config.transports = [{ type: TransportType.STDIO }];
    }

    return new UltimateMCPServer(config);
  }
}