import Anthropic from "@anthropic-ai/sdk";
import { AIProvider, Message, CompletionOptions, ModelConfig } from "../types/index.js";
import { Logger } from "../utils/logger.js";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;
  private logger: Logger;
  models: ModelConfig[] = [
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      contextLength: 200000,
      pricing: { input: 0.000015, output: 0.000075 },
      capabilities: ["coding", "reasoning", "creative", "analysis"],
      provider: "anthropic",
    },
    {
      id: "claude-3-sonnet-20240229",
      name: "Claude 3 Sonnet",
      contextLength: 200000,
      pricing: { input: 0.000003, output: 0.000015 },
      capabilities: ["coding", "reasoning", "analysis"],
      provider: "anthropic",
    },
  ];

  constructor(apiKey: string) {
    this.logger = new Logger("AnthropicProvider");
    this.client = new Anthropic({ apiKey });
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: options?.model || "claude-3-opus-20240229",
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature ?? 0.7,
        system: options?.systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });

      return message.content[0].type === 'text' ? message.content[0].text : '';
    } catch (error) {
      this.logger.error("Anthropic completion failed:", error);
      throw error;
    }
  }

  async completeWithContext(messages: Message[], options?: CompletionOptions): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: options?.model || "claude-3-opus-20240229",
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature ?? 0.7,
        system: options?.systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'assistant' : msg.role,
          content: msg.content,
        })),
      });

      return message.content[0].type === 'text' ? message.content[0].text : '';
    } catch (error) {
      this.logger.error("Anthropic completion with context failed:", error);
      throw error;
    }
  }
}