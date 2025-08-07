import Anthropic from "@anthropic-ai/sdk";
import { AIProvider, Message, CompletionOptions, ModelConfig } from "../types/index.js";
import { Logger } from "../utils/logger.js";
import { PromptCache, AnthropicPromptCache } from "./cache/prompt-cache.js";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;
  private logger: Logger;
  private promptCache: PromptCache;
  private anthropicCache: AnthropicPromptCache;
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
    this.promptCache = new PromptCache({ enableSimilarity: true });
    this.anthropicCache = new AnthropicPromptCache();
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
      const model = options?.model || "claude-3-opus-20240229";
      
      // Check cache first
      const cached = this.promptCache.get(messages, model, this.name);
      if (cached) {
        this.logger.info("Using cached response");
        return cached;
      }

      // Prepare messages with cache control for Anthropic's prompt caching
      const preparedMessages = this.anthropicCache.prepareCachedMessages(messages);

      const response = await this.client.messages.create({
        model,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature ?? 0.7,
        system: options?.systemPrompt,
        messages: preparedMessages,
      });

      const result = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Store in cache (estimate tokens based on message length)
      const estimatedTokens = Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4);
      this.promptCache.set(messages, result, model, this.name, estimatedTokens);

      return result;
    } catch (error) {
      this.logger.error("Anthropic completion with context failed:", error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.promptCache.getStats();
  }

  /**
   * Clear prompt cache
   */
  clearCache() {
    this.promptCache.clear();
  }
}