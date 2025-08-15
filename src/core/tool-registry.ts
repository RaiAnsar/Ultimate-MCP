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
    return Array.from(this.tools.values()).map((tool) => {
      const result: Tool = {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: "object" as const,
          properties: {} as { [x: string]: unknown },
        },
      };
      
      // Handle Zod schemas
      if (tool.inputSchema) {
        // Check if it's a Zod schema (has shape property)
        if ('shape' in tool.inputSchema && tool.inputSchema.shape) {
          const shape = tool.inputSchema.shape as any;
          const properties: any = {};
          const required: string[] = [];
          
          for (const [key, value] of Object.entries(shape)) {
            // Convert Zod types to JSON Schema
            const zodType = value as any;
            properties[key] = {
              type: this.getJsonSchemaType(zodType),
              description: zodType._def?.description
            };
            
            // Check if field is required (not optional)
            if (!zodType.isOptional || !zodType.isOptional()) {
              required.push(key);
            }
          }
          
          result.inputSchema.properties = properties;
          if (required.length > 0) {
            (result.inputSchema as any).required = required;
          }
        } else {
          // Fallback to direct properties assignment
          result.inputSchema.properties = (tool.inputSchema.properties || {}) as { [x: string]: unknown };
          
          // Only add required if it exists and is an array
          if (tool.inputSchema.required && Array.isArray(tool.inputSchema.required)) {
            (result.inputSchema as any).required = tool.inputSchema.required;
          }
        }
      }
      
      return result;
    });
  }
  
  private getJsonSchemaType(zodType: any): string {
    if (!zodType._def) return 'string';
    
    const typeName = zodType._def.typeName;
    switch (typeName) {
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodArray':
        return 'array';
      case 'ZodObject':
        return 'object';
      case 'ZodOptional':
        return this.getJsonSchemaType(zodType._def.innerType);
      default:
        return 'string';
    }
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
    // Handle Zod schemas
    if ('shape' in schema && schema.shape) {
      // For Zod schemas, use the parse method if available
      if ('parse' in schema && typeof schema.parse === 'function') {
        try {
          schema.parse(args);
          return;
        } catch (error: any) {
          throw new Error(`Validation failed: ${error.message}`);
        }
      }
      
      // Fallback to manual validation for Zod schemas
      const shape = schema.shape as any;
      for (const [key, value] of Object.entries(shape)) {
        const zodType = value as any;
        if (!zodType.isOptional || !zodType.isOptional()) {
          if (!(key in args)) {
            throw new Error(`Missing required argument: ${key}`);
          }
        }
      }
    } else {
      // Basic validation for non-Zod schemas
      const required = (schema.required || []) as string[];
      if (!Array.isArray(required)) {
        return; // Skip validation if required is not an array
      }
      
      for (const key of required) {
        if (!(key in args)) {
          throw new Error(`Missing required argument: ${key}`);
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