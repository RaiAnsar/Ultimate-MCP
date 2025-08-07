/**
 * Prompt Caching for LLM Providers
 * Implements caching strategies to reduce token usage and costs
 */

import { createHash } from 'crypto';
import { Logger } from '../../utils/logger.js';
import { Message } from '../../types/index.js';

interface CacheEntry {
  key: string;
  response: string;
  messages: Message[];
  timestamp: number;
  tokenCount: number;
  model: string;
  provider: string;
  hits: number;
}

interface CacheOptions {
  maxSize?: number;          // Max cache entries
  ttl?: number;              // Time to live in ms
  enableSimilarity?: boolean; // Enable semantic similarity matching
  threshold?: number;         // Similarity threshold (0-1)
}

export class PromptCache {
  private cache = new Map<string, CacheEntry>();
  private logger: Logger;
  private options: Required<CacheOptions>;
  private stats = {
    hits: 0,
    misses: 0,
    tokensSaved: 0,
    costSaved: 0
  };

  constructor(options: CacheOptions = {}) {
    this.logger = new Logger('PromptCache');
    this.options = {
      maxSize: options.maxSize || 1000,
      ttl: options.ttl || 3600000, // 1 hour default
      enableSimilarity: options.enableSimilarity || false,
      threshold: options.threshold || 0.95
    };
  }

  /**
   * Generate cache key from messages
   */
  private generateKey(messages: Message[], model: string): string {
    const content = messages.map(m => `${m.role}:${m.content}`).join('|');
    return createHash('sha256')
      .update(`${model}:${content}`)
      .digest('hex');
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.options.ttl;
  }

  /**
   * Get cached response if available
   */
  get(messages: Message[], model: string, provider: string): string | null {
    const key = this.generateKey(messages, model);
    const entry = this.cache.get(key);

    if (entry && this.isValid(entry)) {
      entry.hits++;
      this.stats.hits++;
      this.stats.tokensSaved += entry.tokenCount;
      this.logger.debug(`Cache hit for ${model} (${entry.hits} hits, ${entry.tokenCount} tokens saved)`);
      return entry.response;
    }

    // Try similarity matching if enabled
    if (this.options.enableSimilarity) {
      const similar = this.findSimilar(messages, model, provider);
      if (similar) {
        this.stats.hits++;
        this.stats.tokensSaved += similar.tokenCount;
        this.logger.debug(`Similar cache hit for ${model} (${similar.tokenCount} tokens saved)`);
        return similar.response;
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store response in cache
   */
  set(
    messages: Message[], 
    response: string, 
    model: string, 
    provider: string,
    tokenCount: number
  ): void {
    // Enforce max size
    if (this.cache.size >= this.options.maxSize) {
      this.evictOldest();
    }

    const key = this.generateKey(messages, model);
    const entry: CacheEntry = {
      key,
      response,
      messages,
      timestamp: Date.now(),
      tokenCount,
      model,
      provider,
      hits: 0
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cached response for ${model} (${tokenCount} tokens)`);
  }

  /**
   * Find semantically similar cached entry
   */
  private findSimilar(
    messages: Message[], 
    model: string, 
    provider: string
  ): CacheEntry | null {
    // Simple implementation - can be enhanced with embeddings
    const targetLength = messages.length;
    
    for (const [_, entry] of this.cache) {
      if (entry.model !== model || entry.provider !== provider) continue;
      if (!this.isValid(entry)) continue;
      
      // Check if message count is similar
      if (Math.abs(entry.messages.length - targetLength) > 1) continue;
      
      // Check last message similarity (simple approach)
      const lastTarget = messages[messages.length - 1];
      const lastCached = entry.messages[entry.messages.length - 1];
      
      if (lastTarget.role === lastCached.role) {
        const similarity = this.calculateSimilarity(lastTarget.content, lastCached.content);
        if (similarity >= this.options.threshold) {
          return entry;
        }
      }
    }
    
    return null;
  }

  /**
   * Calculate simple similarity between two strings
   */
  private calculateSimilarity(a: string, b: string): number {
    // Simple Jaccard similarity - can be replaced with better algorithms
    const setA = new Set(a.toLowerCase().split(/\s+/));
    const setB = new Set(b.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return intersection.size / union.size;
  }

  /**
   * Evict oldest entries
   */
  private evictOldest(): void {
    let oldest: CacheEntry | null = null;
    let oldestKey: string | null = null;

    for (const [key, entry] of this.cache) {
      if (!oldest || entry.timestamp < oldest.timestamp) {
        oldest = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted cache entry: ${oldestKey}`);
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.options.ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug(`Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalEntries = this.cache.size;
    const avgHits = totalEntries > 0 
      ? Array.from(this.cache.values()).reduce((sum, e) => sum + e.hits, 0) / totalEntries 
      : 0;

    return {
      ...this.stats,
      totalEntries,
      avgHits,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      memorySizeEstimate: this.estimateMemorySize()
    };
  }

  /**
   * Estimate memory usage
   */
  private estimateMemorySize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry).length * 2; // Rough estimate (2 bytes per char)
    }
    return size;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Export cache for persistence
   */
  export(): string {
    return JSON.stringify({
      entries: Array.from(this.cache.entries()),
      stats: this.stats
    });
  }

  /**
   * Import cache from persistence
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.cache = new Map(parsed.entries);
      this.stats = parsed.stats;
      this.clearExpired();
      this.logger.info(`Imported ${this.cache.size} cache entries`);
    } catch (error) {
      this.logger.error('Failed to import cache:', error);
    }
  }
}

/**
 * Anthropic-specific prompt caching
 * Implements Anthropic's beta caching feature
 */
export class AnthropicPromptCache {
  private logger: Logger;
  private cacheBreakpoints: Map<string, number> = new Map();

  constructor() {
    this.logger = new Logger('AnthropicPromptCache');
  }

  /**
   * Prepare messages with cache control for Anthropic API
   */
  prepareCachedMessages(messages: Message[]): any[] {
    const result: any[] = [];
    
    // Mark system message and initial context for caching
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const formatted: any = {
        role: msg.role === 'system' ? 'assistant' : msg.role,
        content: msg.content
      };

      // Add cache control to system messages and long context
      if (msg.role === 'system' || 
          (i < 3 && msg.content.length > 1000)) {
        formatted.cache_control = { type: 'ephemeral' };
      }

      result.push(formatted);
    }

    return result;
  }

  /**
   * Calculate potential token savings from caching
   */
  estimateSavings(messages: Message[], cachedTokens: number): number {
    // Anthropic charges 25% for cached tokens
    const savings = cachedTokens * 0.75;
    this.logger.debug(`Estimated savings: ${savings} tokens (${cachedTokens} cached)`);
    return savings;
  }
}