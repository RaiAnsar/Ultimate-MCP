import OpenAI from "openai";
import { AIProvider, Message, CompletionOptions, ModelConfig } from "../types/index.js";
import { Logger } from "../utils/logger.js";
import { MODELS, FALLBACK_MODELS } from "../config/models.js";

export class OpenRouterProvider implements AIProvider {
  name = "openrouter";
  private client: OpenAI;
  private logger: Logger;
  models: ModelConfig[] = [
    {
      id: "openai/gpt-4o",
      name: "GPT-4 Optimized",
      contextLength: 128000,
      pricing: { input: 0.000005, output: 0.000015 },
      capabilities: ["coding", "reasoning", "analysis"],
      provider: "openrouter",
    },
    {
      id: "anthropic/claude-3-opus",
      name: "Claude 3 Opus",
      contextLength: 200000,
      pricing: { input: 0.000015, output: 0.000075 },
      capabilities: ["coding", "reasoning", "creative", "analysis"],
      provider: "openrouter",
    },
    {
      id: "google/gemini-pro",
      name: "Gemini Pro",
      contextLength: 128000,
      pricing: { input: 0.00000125, output: 0.00000375 },
      capabilities: ["coding", "reasoning", "multimodal"],
      provider: "openrouter",
    },
    {
      id: "deepseek/deepseek-chat",
      name: "DeepSeek Chat",
      contextLength: 128000,
      pricing: { input: 0.00000038, output: 0.00000089 },
      capabilities: ["coding", "reasoning", "efficiency"],
      provider: "openrouter",
    },
  ];

  constructor(apiKey: string) {
    this.logger = new Logger("OpenRouterProvider");
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "Ultimate-MCP-Server",
      },
    });
  }

  private getModelWithFallback(requestedModel?: string): string {
    const model = requestedModel || MODELS.GPT_4O;
    
    // Check if this model has a fallback defined
    if (FALLBACK_MODELS[model as keyof typeof FALLBACK_MODELS]) {
      return FALLBACK_MODELS[model as keyof typeof FALLBACK_MODELS];
    }
    
    return model;
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const originalModel = options?.model || MODELS.GPT_4O;
    let model = originalModel;
    let lastError: any;

    // Try original model first, then fallback if needed
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model,
          messages: [
            ...(options?.systemPrompt ? [{ role: "system" as const, content: options.systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          stop: options?.stopSequences,
          stream: false,
        });

        if (model !== originalModel) {
          this.logger.info(`Used fallback model ${model} instead of ${originalModel}`);
        }
        return response.choices[0]?.message?.content || "";
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a 404 model not found error
        if (error?.status === 404 && attempt === 0) {
          const fallbackModel = this.getModelWithFallback(model);
          if (fallbackModel !== model) {
            this.logger.warn(`Model ${model} not found, trying fallback: ${fallbackModel}`);
            model = fallbackModel;
            continue;
          }
        }
        
        // If not a 404 or no fallback available, throw the error
        break;
      }
    }

    this.logger.error(`OpenRouter completion failed:`, lastError);
    throw lastError;
  }

  async completeWithContext(messages: Message[], options?: CompletionOptions): Promise<string> {
    const originalModel = options?.model || MODELS.GPT_4O;
    let model = originalModel;
    let lastError: any;

    // Try original model first, then fallback if needed
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          stop: options?.stopSequences,
          stream: false,
        });

        if (model !== originalModel) {
          this.logger.info(`Used fallback model ${model} instead of ${originalModel}`);
        }
        return response.choices[0]?.message?.content || "";
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a 404 model not found error
        if (error?.status === 404 && attempt === 0) {
          const fallbackModel = this.getModelWithFallback(model);
          if (fallbackModel !== model) {
            this.logger.warn(`Model ${model} not found, trying fallback: ${fallbackModel}`);
            model = fallbackModel;
            continue;
          }
        }
        
        // If not a 404 or no fallback available, throw the error
        break;
      }
    }

    this.logger.error(`OpenRouter completion with context failed:`, lastError);
    throw lastError;
  }

  async *stream(messages: Message[], options?: CompletionOptions): AsyncGenerator<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: options?.model || MODELS.GPT_4O,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      this.logger.error(`OpenRouter streaming failed:`, error);
      throw error;
    }
  }
}