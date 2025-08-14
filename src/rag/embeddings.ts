import { EmbeddingProvider, EmbeddingConfig } from './types.js';
import OpenAI from 'openai';
import axios from 'axios';

// Re-export for compatibility
export type { EmbeddingProvider } from './types.js';

export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  abstract name: string;
  abstract model: string;
  abstract dimension: number;
  
  abstract embed(text: string): Promise<number[]>;
  abstract embedBatch(texts: string[]): Promise<number[][]>;
  
  protected normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }
}

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  name = 'openai';
  model: string;
  dimension: number;
  private client: OpenAI;
  
  constructor(config: EmbeddingConfig) {
    super();
    this.model = config.model || 'text-embedding-3-small';
    this.dimension = config.dimension || (this.model === 'text-embedding-3-small' ? 1536 : 3072);
    this.client = new OpenAI({ apiKey: config.apiKey || process.env.OPENAI_API_KEY });
  }
  
  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimension
    });
    
    return response.data[0].embedding;
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimension
    });
    
    return response.data.map(item => item.embedding);
  }
}

export class CohereEmbeddingProvider extends BaseEmbeddingProvider {
  name = 'cohere';
  model: string;
  dimension = 1024;
  private apiKey: string;
  private baseURL = 'https://api.cohere.ai/v1';
  
  constructor(config: EmbeddingConfig) {
    super();
    this.model = config.model || 'embed-english-v3.0';
    this.apiKey = config.apiKey || process.env.COHERE_API_KEY || '';
  }
  
  async embed(text: string): Promise<number[]> {
    const response = await axios.post(
      `${this.baseURL}/embed`,
      {
        texts: [text],
        model: this.model,
        input_type: 'search_document'
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.embeddings[0];
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await axios.post(
      `${this.baseURL}/embed`,
      {
        texts,
        model: this.model,
        input_type: 'search_document'
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.embeddings;
  }
}

export class LocalEmbeddingProvider extends BaseEmbeddingProvider {
  name = 'local';
  model = 'simple-hash';
  dimension = 384;
  
  constructor(config: EmbeddingConfig) {
    super();
    if (config.dimension) {
      this.dimension = config.dimension;
    }
  }
  
  async embed(text: string): Promise<number[]> {
    // Simple hash-based embedding for local testing
    // In production, use sentence-transformers or similar
    const vector = new Array(this.dimension).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = (charCode * (i + 1)) % this.dimension;
      vector[index] += charCode / 255.0;
    }
    
    // Add some randomness for variation
    for (let i = 0; i < this.dimension; i++) {
      vector[i] += (Math.sin(i * text.length) + 1) / 2;
    }
    
    return this.normalizeVector(vector);
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.embed(text)));
  }
}

export class EmbeddingProviderFactory {
  static create(config: EmbeddingConfig): EmbeddingProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIEmbeddingProvider(config);
      case 'cohere':
        return new CohereEmbeddingProvider(config);
      case 'local':
        return new LocalEmbeddingProvider(config);
      default:
        throw new Error(`Unknown embedding provider: ${config.provider}`);
    }
  }
}

// Export convenience function
export function createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider {
  return EmbeddingProviderFactory.create(config);
}