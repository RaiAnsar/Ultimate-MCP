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
      version: config.version || "2.0.9",
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
        name: this.config.name!,
        version: this.config.version!,
      },
      {
        capabilities: mcpCapabilities
      }
    );

    this.setupHandlers();
    // Only log if not in pure stdio mode
    const isStdioOnly = this.config.transports?.length === 1 && this.config.transports[0].type === TransportType.STDIO;
    if (!isStdioOnly) {
      this.logger.info(`${this.config.name} v${this.config.version} initialized`);
    }
  }

  private setupHandlers(): void {
    // Tool handlers
    if (this.capabilities.tools) {
      this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: await this.toolRegistry.listTools(),
      }));

      this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const startTime = Date.now();
        try {
          const result = await this.toolRegistry.executeTool(request.params.name, request.params.arguments);
          this.metrics.recordToolCall(request.params.name, Date.now() - startTime, true);
          
          // MCP expects tool results to be wrapped in a content array
          // Check if result is already in the correct format
          if (result && typeof result === 'object' && 'content' in result && Array.isArray(result.content)) {
            return result;
          }
          
          // Wrap the result in the expected MCP format
          return {
            content: [{
              type: "text",
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          this.metrics.recordToolCall(request.params.name, Date.now() - startTime, false);
          throw error;
        }
      });
    }

    // Resource handlers
    if (this.capabilities.resources) {
      this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: await this.resourceRegistry.listResources(),
      }));

      this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => ({
        contents: await this.resourceRegistry.readResource(request.params.uri),
      }));
    }

    // Prompt handlers
    if (this.capabilities.prompts) {
      this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
        prompts: await this.promptRegistry.listPrompts(),
      }));

      this.server.setRequestHandler(GetPromptRequestSchema, async (request) => ({
        messages: await this.promptRegistry.getPrompt(
          request.params.name,
          request.params.arguments
        ),
      }));
    }

    // Context management can be handled differently
    // We'll manage context through the tool calls themselves
  }

  async start(): Promise<void> {
    // Check if we're in pure stdio mode
    const isStdioOnly = 
      !this.config.transports || 
      this.config.transports.length === 0 || 
      (this.config.transports.length === 1 && this.config.transports[0].type === TransportType.STDIO);
    
    if (isStdioOnly) {
      // Use direct stdio transport for simplicity and compatibility
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      // No logging in pure stdio mode - it interferes with the protocol
    } else {
      // Multi-transport mode
      this.transportManager = new TransportManager(this.server, {
        transports: this.config.transports!,
      });
      
      await this.transportManager.initialize();
      await this.transportManager.start();
      
      const activeTransports = this.transportManager.getActiveTransports();
      this.logger.info(`Server started with transports: ${activeTransports.join(", ")}`);
    }

    // Metrics are collected automatically on each call
  }

  async stop(): Promise<void> {
    const isStdioOnly = this.config.transports?.length === 1 && this.config.transports[0].type === TransportType.STDIO;
    if (!isStdioOnly) {
      this.logger.info("Shutting down server...");
    }
    
    // Metrics collection stops automatically

    // Stop all transports
    if (this.transportManager) {
      await this.transportManager.stop();
    }

    // Registries will be garbage collected
    
    if (!isStdioOnly) {
      this.logger.info("Server stopped");
    }
  }

  // Registry access methods
  registerTool(tool: any): void {
    this.toolRegistry.register(tool);
  }

  registerPrompt(prompt: any): void {
    this.promptRegistry.register(prompt);
  }

  registerResource(resource: any): void {
    this.resourceRegistry.register(resource);
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
      version: "2.0.9",
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