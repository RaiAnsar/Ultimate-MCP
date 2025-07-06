import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider, Message, CompletionOptions, ModelConfig } from "../types/index.js";
import { Logger } from "../utils/logger.js";

export class GoogleProvider implements AIProvider {
  name = "google";
  private genAI: GoogleGenerativeAI;
  private logger: Logger;
  models: ModelConfig[] = [
    {
      id: "gemini-pro",
      name: "Gemini Pro",
      contextLength: 32000,
      pricing: { input: 0.00000125, output: 0.00000375 },
      capabilities: ["coding", "reasoning", "analysis"],
      provider: "google",
    },
    {
      id: "gemini-pro-vision",
      name: "Gemini Pro Vision",
      contextLength: 32000,
      pricing: { input: 0.00000125, output: 0.00000375 },
      capabilities: ["coding", "reasoning", "vision"],
      provider: "google",
    },
  ];

  constructor(apiKey: string) {
    this.logger = new Logger("GoogleProvider");
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: options?.model || "gemini-pro",
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
        },
      });

      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error("Google completion failed:", error);
      throw error;
    }
  }

  async completeWithContext(messages: Message[], options?: CompletionOptions): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: options?.model || "gemini-pro",
      });

      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
        },
      });

      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error("Google completion with context failed:", error);
      throw error;
    }
  }
}