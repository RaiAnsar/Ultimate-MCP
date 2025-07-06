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
import type { ServerCapabilities } from "../types/index.js";

export class UltimateMCPServer {
  private server: Server;
  private logger: Logger;
  private toolRegistry: ToolRegistry;
  private resourceRegistry: ResourceRegistry;
  private promptRegistry: PromptRegistry;
  private contextManager: ContextManager;
  private metrics: MetricsCollector;
  private capabilities: ServerCapabilities;

  constructor(name: string = "ultimate-mcp-server", version: string = "1.0.0") {
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
        name,
        version,
      },
      {
        capabilities: mcpCapabilities,
      }
    );

    this.setupHandlers();
    this.logger.info(`${name} v${version} initialized`);
  }

  private setupHandlers(): void {
    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await this.toolRegistry.listTools();
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      try {
        const { name, arguments: args } = request.params;
        
        // Log tool call
        this.logger.debug(`Calling tool: ${name}`, { args });
        
        // Execute tool
        const result = await this.toolRegistry.executeTool(name, args);
        
        // Collect metrics
        this.metrics.recordToolCall(name, Date.now() - startTime, true);
        
        return {
          content: [
            {
              type: "text",
              text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Tool execution failed: ${errorMessage}`);
        this.metrics.recordToolCall(request.params.name, Date.now() - startTime, false);
        
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = await this.resourceRegistry.listResources();
      return { resources };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        const { uri } = request.params;
        const content = await this.resourceRegistry.readResource(uri);
        
        return {
          contents: [
            {
              uri,
              mimeType: content.mimeType || "text/plain",
              text: content.text,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read resource: ${errorMessage}`);
      }
    });

    // Prompt handlers
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts = await this.promptRegistry.listPrompts();
      return { prompts };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        const result = await this.promptRegistry.getPrompt(name, args);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get prompt: ${errorMessage}`);
      }
    });

    // Logging handler - will be added when we have proper schema
    // this.server.setNotificationHandler("notifications/log", async (params) => {
    //   const { level, message, data } = params as any;
    //   this.logger.log(level || "info", message, data);
    // });
  }

  // Public API for registering tools, resources, and prompts
  public registerTool(tool: any): void {
    this.toolRegistry.register(tool);
  }

  public registerResource(resource: any): void {
    this.resourceRegistry.register(resource);
  }

  public registerPrompt(prompt: any): void {
    this.promptRegistry.register(prompt);
  }

  public getContextManager(): ContextManager {
    return this.contextManager;
  }

  public getMetrics(): MetricsCollector {
    return this.metrics;
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    this.logger.info("Ultimate MCP Server started successfully");
    this.logger.info("Capabilities:", this.capabilities);
    
    // Log startup metrics
    const startupMetrics = {
      tools: this.toolRegistry.getToolCount(),
      resources: this.resourceRegistry.getResourceCount(),
      prompts: this.promptRegistry.getPromptCount(),
    };
    
    this.logger.info("Registered components:", startupMetrics);
  }

  public async stop(): Promise<void> {
    await this.server.close();
    await this.contextManager.close();
    this.logger.info("Ultimate MCP Server stopped");
  }
}