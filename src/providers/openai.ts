import OpenAI from "openai";
import { AIProvider, Message, CompletionOptions, ModelConfig } from "../types/index.js";
import { Logger } from "../utils/logger.js";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private client: OpenAI;
  private logger: Logger;
  models: ModelConfig[] = [
    {
      id: "gpt-4-turbo-preview",
      name: "GPT-4 Turbo",
      contextLength: 128000,
      pricing: { input: 0.00001, output: 0.00003 },
      capabilities: ["coding", "reasoning", "analysis"],
      provider: "openai",
    },
    {
      id: "gpt-4o",
      name: "GPT-4 Optimized",
      contextLength: 128000,
      pricing: { input: 0.000005, output: 0.000015 },
      capabilities: ["coding", "reasoning", "vision"],
      provider: "openai",
    },
  ];

  constructor(apiKey: string) {
    this.logger = new Logger("OpenAIProvider");
    this.client = new OpenAI({ apiKey });
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: options?.model || "gpt-4o",
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
      });

      return completion.choices[0]?.message?.content || "";
    } catch (error) {
      this.logger.error("OpenAI completion failed:", error);
      throw error;
    }
  }

  async completeWithContext(messages: Message[], options?: CompletionOptions): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: options?.model || "gpt-4o",
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
      });

      return completion.choices[0]?.message?.content || "";
    } catch (error) {
      this.logger.error("OpenAI completion with context failed:", error);
      throw error;
    }
  }
}