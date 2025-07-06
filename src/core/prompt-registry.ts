import { Prompt, GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "../utils/logger.js";
import type { PromptDefinition } from "../types/index.js";

export class PromptRegistry {
  private prompts: Map<string, PromptDefinition> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger("PromptRegistry");
  }

  register(prompt: PromptDefinition): void {
    if (this.prompts.has(prompt.name)) {
      throw new Error(`Prompt ${prompt.name} is already registered`);
    }

    this.prompts.set(prompt.name, prompt);
    this.logger.info(`Registered prompt: ${prompt.name}`);
  }

  unregister(name: string): void {
    this.prompts.delete(name);
    this.logger.info(`Unregistered prompt: ${name}`);
  }

  async listPrompts(): Promise<Prompt[]> {
    return Array.from(this.prompts.values()).map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments?.map((arg) => ({
        name: arg.name,
        description: arg.description,
        required: arg.required,
      })),
    }));
  }

  async getPrompt(name: string, args?: Record<string, any>): Promise<GetPromptResult> {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new Error(`Prompt ${name} not found`);
    }

    try {
      // Validate required arguments
      if (prompt.arguments) {
        for (const arg of prompt.arguments) {
          if (arg.required && (!args || !(arg.name in args))) {
            throw new Error(`Missing required argument: ${arg.name}`);
          }
        }
      }

      // Apply defaults for missing optional arguments
      const finalArgs = { ...args };
      if (prompt.arguments) {
        for (const arg of prompt.arguments) {
          if (!arg.required && arg.default !== undefined && !(arg.name in finalArgs)) {
            finalArgs[arg.name] = arg.default;
          }
        }
      }

      // Execute prompt handler
      const result = await prompt.handler(finalArgs);
      
      return {
        description: prompt.description,
        messages: result.messages.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: {
            type: "text" as const,
            text: msg.content,
          },
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get prompt ${name}:`, error);
      throw error;
    }
  }

  getPromptCount(): number {
    return this.prompts.size;
  }

  getPromptDefinition(name: string): PromptDefinition | undefined {
    return this.prompts.get(name);
  }

  getPromptsByTag(tag: string): PromptDefinition[] {
    return Array.from(this.prompts.values()).filter(
      (prompt) => prompt.tags?.includes(tag)
    );
  }
}