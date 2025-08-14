import { OpenRouterProvider } from '../providers/openrouter.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { Logger } from './logger.js';

const logger = new Logger('ModelCaller');

// Initialize providers
const openrouterProvider = new OpenRouterProvider(process.env.OPENROUTER_API_KEY || '');
const anthropicProvider = new AnthropicProvider(process.env.ANTHROPIC_API_KEY || '');

interface ModelOptions {
  messages: Array<{
    role: string;
    content: string | Array<any>;
  }>;
  temperature?: number;
  maxTokens?: number;
  max_tokens?: number;
  system?: string;
}

/**
 * Call a model with the given prompt or messages
 */
export async function callModel(
  model: string,
  options: ModelOptions | string,
  legacyOptions?: {
    temperature?: number;
    maxTokens?: number;
    system?: string;
  }
): Promise<string> {
  try {
    let messages: Array<{ role: string; content: string | Array<any> }>;
    let temperature: number | undefined;
    let maxTokens: number | undefined;
    
    // Handle both old and new calling conventions
    if (typeof options === 'string') {
      // Legacy call with prompt string
      const prompt = options;
      messages = [
        ...(legacyOptions?.system ? [{ role: 'system', content: legacyOptions.system }] : []),
        { role: 'user', content: prompt }
      ];
      temperature = legacyOptions?.temperature;
      maxTokens = legacyOptions?.maxTokens;
    } else {
      // New call with messages array
      messages = options.messages;
      temperature = options.temperature;
      maxTokens = options.maxTokens || options.max_tokens;
    }
    
    // Route to appropriate provider based on model name
    if (model.startsWith('anthropic/') || model.startsWith('claude')) {
      // Convert messages to prompt if it's the old format
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const response = await anthropicProvider.complete(prompt, {
        model: model.replace('anthropic/', ''),
        temperature,
        maxTokens
      });
      return response;
    } else {
      // Default to OpenRouter for all other models
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const response = await openrouterProvider.complete(prompt, {
        model,
        temperature,
        maxTokens
      });
      return response;
    }
  } catch (error) {
    logger.error(`Failed to call model ${model}:`, error);
    throw error;
  }
}