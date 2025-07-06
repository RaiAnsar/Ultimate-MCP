import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "../utils/logger.js";
import type { ToolDefinition } from "../types/index.js";
import { RateLimiter } from "../utils/rate-limiter.js";

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger("ToolRegistry");
  }

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered`);
    }

    this.tools.set(tool.name, tool);
    
    // Setup rate limiter if specified
    if (tool.rateLimit) {
      this.rateLimiters.set(
        tool.name,
        new RateLimiter(tool.rateLimit.requests, tool.rateLimit.window)
      );
    }

    this.logger.info(`Registered tool: ${tool.name}`);
  }

  unregister(name: string): void {
    this.tools.delete(name);
    this.rateLimiters.delete(name);
    this.logger.info(`Unregistered tool: ${name}`);
  }

  async listTools(): Promise<Tool[]> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: "object" as const,
        properties: (tool.inputSchema.properties || {}) as { [x: string]: unknown },
        required: (tool.inputSchema.required || []) as string[],
      },
    }));
  }

  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    // Check rate limit
    const rateLimiter = this.rateLimiters.get(name);
    if (rateLimiter && !rateLimiter.allow()) {
      throw new Error(`Rate limit exceeded for tool ${name}`);
    }

    try {
      // Validate arguments if schema is provided
      if (tool.inputSchema) {
        this.validateArgs(args, tool.inputSchema);
      }

      // Execute tool handler
      const result = await tool.handler(args);
      
      this.logger.debug(`Tool ${name} executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Tool ${name} execution failed:`, error);
      throw error;
    }
  }

  private validateArgs(args: any, schema: Record<string, unknown>): void {
    // Basic validation - can be enhanced with proper JSON Schema validation
    const required = (schema.required || []) as string[];
    const properties = (schema.properties || {}) as Record<string, any>;

    for (const key of required) {
      if (!(key in args)) {
        throw new Error(`Missing required argument: ${key}`);
      }
    }

    // Type validation for known properties
    for (const [key, value] of Object.entries(args)) {
      if (properties[key]) {
        const expectedType = properties[key].type;
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (expectedType && actualType !== expectedType) {
          throw new Error(`Invalid type for ${key}: expected ${expectedType}, got ${actualType}`);
        }
      }
    }
  }

  getToolCount(): number {
    return this.tools.size;
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getToolsByTag(tag: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(
      (tool) => tool.tags?.includes(tag)
    );
  }
}