import OpenAI from "openai";
import { AIProvider, Message, CompletionOptions, ModelConfig } from "../types/index.js";
import { Logger } from "../utils/logger.js";
import { MODELS, FALLBACK_MODELS, MODEL_CONTEXT_LIMITS, MODEL_SPECIALIZATIONS } from "../config/models.js";

export class OpenRouterProvider implements AIProvider {
  name = "openrouter";
  private client: OpenAI;
  private logger: Logger;
  models: ModelConfig[] = [
    // OpenAI models
    {
      id: "openai/gpt-4o",
      name: "GPT-4 Optimized",
      contextLength: 128000,
      pricing: { input: 0.000005, output: 0.000015 },
      capabilities: ["coding", "reasoning", "analysis"],
      provider: "openrouter",
    },
    {
      id: "openai/gpt-4o-mini",
      name: "GPT-4 Optimized Mini",
      contextLength: 128000,
      pricing: { input: 0.00000015, output: 0.0000006 },
      capabilities: ["coding", "reasoning", "efficiency"],
      provider: "openrouter",
    },
    {
      id: "openai/o1-preview",
      name: "O1 Preview",
      contextLength: 128000,
      pricing: { input: 0.000015, output: 0.00006 },
      capabilities: ["reasoning", "analysis", "complex-problems"],
      provider: "openrouter",
    },
    
    // Anthropic models
    {
      id: "anthropic/claude-3-opus",
      name: "Claude 3 Opus",
      contextLength: 200000,
      pricing: { input: 0.000015, output: 0.000075 },
      capabilities: ["coding", "reasoning", "creative", "analysis"],
      provider: "openrouter",
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      contextLength: 200000,
      pricing: { input: 0.000003, output: 0.000015 },
      capabilities: ["coding", "reasoning", "creative", "analysis"],
      provider: "openrouter",
    },
    {
      id: "anthropic/claude-3.5-sonnet-20241022",
      name: "Claude 3.5 Sonnet Latest",
      contextLength: 200000,
      pricing: { input: 0.000003, output: 0.000015 },
      capabilities: ["coding", "reasoning", "creative", "analysis"],
      provider: "openrouter",
    },
    
    // Google models
    {
      id: "google/gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      contextLength: 2097152,
      pricing: { input: 0.00000125, output: 0.00000375 },
      capabilities: ["coding", "reasoning", "multimodal", "long-context"],
      provider: "openrouter",
    },
    {
      id: "google/gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      contextLength: 1048576,
      pricing: { input: 0.00000035, output: 0.00000105 },
      capabilities: ["coding", "reasoning", "efficiency", "long-context"],
      provider: "openrouter",
    },
    {
      id: "google/gemini-2.0-flash-thinking-exp",
      name: "Gemini 2.0 Flash Thinking",
      contextLength: 32768,
      pricing: { input: 0.0000003, output: 0.0000009 },
      capabilities: ["reasoning", "analysis", "thinking"],
      provider: "openrouter",
    },
    
    // xAI models
    {
      id: "x-ai/grok-2",
      name: "Grok 2",
      contextLength: 131072,
      pricing: { input: 0.000002, output: 0.00001 },
      capabilities: ["coding", "reasoning", "creative"],
      provider: "openrouter",
    },
    {
      id: "x-ai/grok-2-vision",
      name: "Grok 2 Vision",
      contextLength: 131072,
      pricing: { input: 0.000002, output: 0.00001 },
      capabilities: ["coding", "reasoning", "vision", "multimodal"],
      provider: "openrouter",
    },
    {
      id: "x-ai/grok-3-beta",
      name: "Grok 3 Beta",
      contextLength: 131072,
      pricing: { input: 0.000005, output: 0.000015 },
      capabilities: ["coding", "reasoning", "creative", "analysis"],
      provider: "openrouter",
    },
    {
      id: "x-ai/grok-4-beta",
      name: "Grok 4 Beta",
      contextLength: 131072,
      pricing: { input: 0.00001, output: 0.00003 },
      capabilities: ["coding", "reasoning", "creative", "analysis", "advanced"],
      provider: "openrouter",
    },
    
    // DeepSeek models
    {
      id: "deepseek/deepseek-v3",
      name: "DeepSeek V3",
      contextLength: 128000,
      pricing: { input: 0.00000027, output: 0.00000108 },
      capabilities: ["coding", "reasoning", "efficiency"],
      provider: "openrouter",
    },
    {
      id: "deepseek/deepseek-r1",
      name: "DeepSeek R1",
      contextLength: 128000,
      pricing: { input: 0.00000055, output: 0.00000216 },
      capabilities: ["reasoning", "analysis", "complex-problems"],
      provider: "openrouter",
    },
    {
      id: "deepseek/deepseek-coder-v2-instruct",
      name: "DeepSeek Coder V2",
      contextLength: 128000,
      pricing: { input: 0.00000027, output: 0.00000108 },
      capabilities: ["coding", "debugging", "optimization"],
      provider: "openrouter",
    },
    
    // Meta models
    {
      id: "meta-llama/llama-3.3-70b-instruct",
      name: "Llama 3.3 70B",
      contextLength: 128000,
      pricing: { input: 0.00000018, output: 0.00000018 },
      capabilities: ["coding", "reasoning", "general"],
      provider: "openrouter",
    },
    {
      id: "meta-llama/llama-3.1-405b-instruct",
      name: "Llama 3.1 405B",
      contextLength: 128000,
      pricing: { input: 0.00000095, output: 0.00000095 },
      capabilities: ["coding", "reasoning", "analysis", "advanced"],
      provider: "openrouter",
    },
    {
      id: "meta-llama/llama-3.2-90b-vision-instruct",
      name: "Llama 3.2 90B Vision",
      contextLength: 128000,
      pricing: { input: 0.00000035, output: 0.00000035 },
      capabilities: ["coding", "reasoning", "vision", "multimodal"],
      provider: "openrouter",
    },
    {
      id: "meta-llama/llama-3.2-3b-instruct",
      name: "Llama 3.2 3B",
      contextLength: 128000,
      pricing: { input: 0.00000006, output: 0.00000006 },
      capabilities: ["general", "efficiency"],
      provider: "openrouter",
    },
    
    // Mistral models
    {
      id: "mistralai/mistral-large-2411",
      name: "Mistral Large 2411",
      contextLength: 128000,
      pricing: { input: 0.000002, output: 0.000006 },
      capabilities: ["coding", "reasoning", "analysis"],
      provider: "openrouter",
    },
    {
      id: "mistralai/codestral-2501",
      name: "Codestral 2501",
      contextLength: 256000,
      pricing: { input: 0.0000003, output: 0.0000009 },
      capabilities: ["coding", "debugging", "optimization", "long-context"],
      provider: "openrouter",
    },
    {
      id: "mistralai/mixtral-8x22b-instruct",
      name: "Mixtral 8x22B",
      contextLength: 65536,
      pricing: { input: 0.00000065, output: 0.00000195 },
      capabilities: ["coding", "reasoning", "general"],
      provider: "openrouter",
    },
    
    // Qwen models
    {
      id: "qwen/qwen-2.5-coder-32b-instruct",
      name: "Qwen 2.5 Coder 32B",
      contextLength: 128000,
      pricing: { input: 0.00000018, output: 0.00000018 },
      capabilities: ["coding", "debugging", "optimization"],
      provider: "openrouter",
    },
    {
      id: "qwen/qwen-2.5-72b-instruct",
      name: "Qwen 2.5 72B",
      contextLength: 128000,
      pricing: { input: 0.00000035, output: 0.00000035 },
      capabilities: ["coding", "reasoning", "general"],
      provider: "openrouter",
    },
    {
      id: "qwen/qwq-32b-preview",
      name: "QwQ 32B Preview",
      contextLength: 32768,
      pricing: { input: 0.00000018, output: 0.00000018 },
      capabilities: ["reasoning", "analysis", "thinking"],
      provider: "openrouter",
    },
    
    // Moonshot models
    {
      id: "moonshotai/kimi-k2-1t",
      name: "Kimi K2 (1T params)",
      contextLength: 1000000,
      pricing: { input: 0.00000142, output: 0.00000285 },
      capabilities: ["coding", "reasoning", "long-context", "analysis"],
      provider: "openrouter",
    },
    
    // Alibaba models
    {
      id: "alibaba/marco-o1",
      name: "Marco O1",
      contextLength: 32768,
      pricing: { input: 0.00000428, output: 0.00000428 },
      capabilities: ["reasoning", "analysis", "complex-problems"],
      provider: "openrouter",
    },
    
    // Perplexity models
    {
      id: "perplexity/llama-3.1-sonar-large-128k-online",
      name: "Perplexity Sonar Large Online",
      contextLength: 127072,
      pricing: { input: 0.000001, output: 0.000001 },
      capabilities: ["online", "research", "current-events"],
      provider: "openrouter",
    },
    
    // Cohere models
    {
      id: "cohere/command-r-plus",
      name: "Command R Plus",
      contextLength: 128000,
      pricing: { input: 0.000003, output: 0.000015 },
      capabilities: ["coding", "reasoning", "rag"],
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
        
        // Check if it's a rate limit error
        if (error?.status === 429) {
          this.logger.warn(`Rate limit hit for model ${model}: ${error.message}`);
          // Don't fallback for rate limits, just throw
          throw error;
        }
        
        // For other errors, try fallback on first attempt
        if (attempt === 0) {
          const fallbackModel = this.getModelWithFallback(model);
          if (fallbackModel !== model) {
            this.logger.warn(`Error with model ${model}, trying fallback: ${fallbackModel}`);
            model = fallbackModel;
            continue;
          }
        }
      }
    }
    
    // If we get here, both attempts failed
    throw lastError;
  }

  async completeWithMessages(messages: Message[], options?: CompletionOptions): Promise<string> {
    const originalModel = options?.model || MODELS.GPT_4O;
    let model = originalModel;
    let lastError: any;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const formattedMessages = messages.map(msg => ({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content,
        }));

        const response = await this.client.chat.completions.create({
          model,
          messages: formattedMessages,
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
        
        if (error?.status === 404 && attempt === 0) {
          const fallbackModel = this.getModelWithFallback(model);
          if (fallbackModel !== model) {
            this.logger.warn(`Model ${model} not found, trying fallback: ${fallbackModel}`);
            model = fallbackModel;
            continue;
          }
        }
        
        if (attempt === 0) {
          const fallbackModel = this.getModelWithFallback(model);
          if (fallbackModel !== model) {
            this.logger.warn(`Error with model ${model}, trying fallback: ${fallbackModel}`);
            model = fallbackModel;
            continue;
          }
        }
      }
    }
    
    throw lastError;
  }

  async completeWithContext(messages: Message[], options?: CompletionOptions): Promise<string> {
    const result = await this.client.chat.completions.create({
      model: options?.model || MODELS.GPT_4O,
      messages: messages.map(m => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    });

    return result.choices[0]?.message?.content || "";
  }

  async *stream(messages: Message[], options?: CompletionOptions): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options?.model || MODELS.GPT_4O,
      messages: messages.map(m => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content
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
  }

  getModelInfo(modelId: string): ModelConfig | undefined {
    return this.models.find(m => m.id === modelId);
  }

  listModels(): ModelConfig[] {
    return this.models;
  }

  // Helper method to get models by specialization
  getModelsBySpecialization(specialization: keyof typeof MODEL_SPECIALIZATIONS): string[] {
    return MODEL_SPECIALIZATIONS[specialization] || [];
  }

  // Helper method to get model context limit
  getModelContextLimit(modelId: string): number {
    return MODEL_CONTEXT_LIMITS[modelId as keyof typeof MODEL_CONTEXT_LIMITS] || 8192;
  }
}