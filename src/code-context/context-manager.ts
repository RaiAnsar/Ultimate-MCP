/**
 * Code Context Manager
 * Manages code context extraction, caching, and intelligent context window building
 */

import {
  CodeContext,
  ContextWindow,
  ContextExtractionOptions,
  FileContext,
  ContextCache,
  ContextStrategy
} from './types.js';
import { TypeScriptContextExtractor } from './extractors/typescript.js';
import { PythonContextExtractor } from './extractors/python.js';
import { BaseContextExtractor } from './extractors/base.js';
import { Logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

const logger = new Logger('ContextManager');

/**
 * Simple in-memory cache implementation
 */
class InMemoryCache implements ContextCache {
  private cache = new Map<string, { contexts: CodeContext[]; timestamp: number }>();
  private maxAge = 5 * 60 * 1000; // 5 minutes
  
  get(key: string): CodeContext[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.contexts;
  }
  
  set(key: string, contexts: CodeContext[]): void {
    this.cache.set(key, { contexts, timestamp: Date.now() });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

/**
 * Context strategies for different use cases
 */
class FunctionFocusedStrategy implements ContextStrategy {
  name = 'function-focused';
  description = 'Prioritizes function and method contexts';
  
  async extract(
    filePath: string,
    content: string,
    options: ContextExtractionOptions
  ): Promise<CodeContext[]> {
    // This will be handled by the extractor
    return [];
  }
  
  score(context: CodeContext, query: string): number {
    let score = context.relevanceScore || 0.5;
    
    // Boost function/method contexts
    if (context.type === 'function' || context.type === 'method') {
      score *= 1.5;
    }
    
    // Check query relevance
    const queryLower = query.toLowerCase();
    const nameMatch = context.metadata.name?.toLowerCase().includes(queryLower);
    const contentMatch = context.content.toLowerCase().includes(queryLower);
    
    if (nameMatch) score *= 2;
    if (contentMatch) score *= 1.2;
    
    return Math.min(score, 1);
  }
}

class ClassFocusedStrategy implements ContextStrategy {
  name = 'class-focused';
  description = 'Prioritizes class and type definitions';
  
  async extract(
    filePath: string,
    content: string,
    options: ContextExtractionOptions
  ): Promise<CodeContext[]> {
    return [];
  }
  
  score(context: CodeContext, query: string): number {
    let score = context.relevanceScore || 0.5;
    
    // Boost class contexts
    if (context.type === 'class') {
      score *= 1.5;
    }
    
    // Check query relevance
    const queryLower = query.toLowerCase();
    const nameMatch = context.metadata.name?.toLowerCase().includes(queryLower);
    
    if (nameMatch) score *= 2;
    
    return Math.min(score, 1);
  }
}

class ImportFocusedStrategy implements ContextStrategy {
  name = 'import-focused';
  description = 'Includes imports and dependencies';
  
  async extract(
    filePath: string,
    content: string,
    options: ContextExtractionOptions
  ): Promise<CodeContext[]> {
    return [];
  }
  
  score(context: CodeContext, query: string): number {
    let score = context.relevanceScore || 0.5;
    
    // Boost import contexts
    if (context.type === 'import') {
      score *= 1.2;
    }
    
    return Math.min(score, 1);
  }
}

/**
 * Main context manager
 */
export class CodeContextManager {
  private extractors = new Map<string, BaseContextExtractor>();
  private cache: ContextCache;
  private strategies = new Map<string, ContextStrategy>();
  
  constructor() {
    // Register extractors
    this.extractors.set('typescript', new TypeScriptContextExtractor());
    this.extractors.set('javascript', new TypeScriptContextExtractor());
    this.extractors.set('jsx', new TypeScriptContextExtractor());
    this.extractors.set('tsx', new TypeScriptContextExtractor());
    this.extractors.set('python', new PythonContextExtractor());
    
    // Initialize cache
    this.cache = new InMemoryCache();
    
    // Register strategies
    this.strategies.set('function-focused', new FunctionFocusedStrategy());
    this.strategies.set('class-focused', new ClassFocusedStrategy());
    this.strategies.set('import-focused', new ImportFocusedStrategy());
  }
  
  /**
   * Extract contexts from a file
   */
  async extractFromFile(
    filePath: string,
    options: ContextExtractionOptions = {}
  ): Promise<CodeContext[]> {
    // Check cache
    const cacheKey = this.getCacheKey(filePath, options);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for ${filePath}`);
      return cached;
    }
    
    try {
      // Read file
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Get appropriate extractor
      const ext = path.extname(filePath).substring(1).toLowerCase();
      const extractor = this.extractors.get(ext);
      
      if (!extractor) {
        logger.warn(`No extractor for file type: ${ext}`);
        return [{
          id: `unknown:full:${filePath}:1`,
          filePath,
          language: ext,
          content,
          startLine: 1,
          endLine: content.split('\n').length,
          type: 'full',
          metadata: {}
        }];
      }
      
      // Extract contexts
      const contexts = await extractor.extractContexts(filePath, content, options);
      
      // Apply strategy scoring if specified
      if (options.languages && options.languages.includes('strategy:')) {
        const strategyName = options.languages.find(l => l.startsWith('strategy:'))?.substring(9);
        const strategy = this.strategies.get(strategyName || '');
        if (strategy) {
          for (const context of contexts) {
            context.relevanceScore = strategy.score(context, '');
          }
        }
      }
      
      // Update file paths
      for (const context of contexts) {
        context.filePath = filePath;
      }
      
      // Cache results
      this.cache.set(cacheKey, contexts);
      
      return contexts;
    } catch (error) {
      logger.error(`Failed to extract contexts from ${filePath}:`, error);
      return [];
    }
  }
  
  /**
   * Extract file-level context information
   */
  async getFileContext(filePath: string): Promise<FileContext | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath).substring(1).toLowerCase();
      const extractor = this.extractors.get(ext);
      
      if (!extractor) {
        return null;
      }
      
      return await extractor.extractFileContext(filePath, content);
    } catch (error) {
      logger.error(`Failed to get file context for ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * Build a context window from multiple files
   */
  async buildContextWindow(
    files: string[],
    options: ContextExtractionOptions = {}
  ): Promise<ContextWindow> {
    const maxTokens = options.maxTokens || 8000;
    const allContexts: CodeContext[] = [];
    
    // Extract contexts from all files
    for (const file of files) {
      const contexts = await this.extractFromFile(file, options);
      allContexts.push(...contexts);
    }
    
    // Sort by relevance
    allContexts.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    // Build window within token limit
    const window: ContextWindow = {
      contexts: [],
      totalTokens: 0,
      maxTokens,
      files: new Set()
    };
    
    for (const context of allContexts) {
      const tokens = this.estimateTokens(context.content);
      if (window.totalTokens + tokens <= maxTokens) {
        window.contexts.push(context);
        window.totalTokens += tokens;
        window.files.add(context.filePath);
      } else if (window.contexts.length === 0) {
        // If first context is too large, truncate it
        const truncated = this.truncateContext(context, maxTokens);
        window.contexts.push(truncated);
        window.totalTokens = this.estimateTokens(truncated.content);
        window.files.add(context.filePath);
        break;
      } else {
        break;
      }
    }
    
    // Generate summary
    window.summary = this.generateWindowSummary(window);
    
    return window;
  }
  
  /**
   * Build context window focused on a specific query
   */
  async buildQueryFocusedWindow(
    query: string,
    files: string[],
    options: ContextExtractionOptions = {}
  ): Promise<ContextWindow> {
    const maxTokens = options.maxTokens || 8000;
    const allContexts: CodeContext[] = [];
    
    // Extract contexts from all files
    for (const file of files) {
      const contexts = await this.extractFromFile(file, options);
      
      // Score contexts based on query relevance
      for (const context of contexts) {
        context.relevanceScore = this.scoreContextRelevance(context, query);
      }
      
      allContexts.push(...contexts);
    }
    
    // Filter by minimum relevance
    const filtered = allContexts.filter(c => 
      (c.relevanceScore || 0) >= (options.minRelevance || 0.3)
    );
    
    // Sort by relevance
    filtered.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    // Build window
    const window: ContextWindow = {
      contexts: [],
      totalTokens: 0,
      maxTokens,
      files: new Set()
    };
    
    for (const context of filtered) {
      const tokens = this.estimateTokens(context.content);
      if (window.totalTokens + tokens <= maxTokens) {
        window.contexts.push(context);
        window.totalTokens += tokens;
        window.files.add(context.filePath);
      }
    }
    
    window.summary = `Context window for query "${query}": ${window.contexts.length} contexts from ${window.files.size} files`;
    
    return window;
  }
  
  /**
   * Find definition of a symbol
   */
  async findDefinition(
    symbol: string,
    searchPaths: string[]
  ): Promise<CodeContext | null> {
    for (const searchPath of searchPaths) {
      const files = await this.findFiles(searchPath);
      
      for (const file of files) {
        const contexts = await this.extractFromFile(file);
        
        // Look for exact match in function/class/method names
        const definition = contexts.find(ctx => 
          ctx.metadata.name === symbol &&
          (ctx.type === 'function' || ctx.type === 'class' || ctx.type === 'method')
        );
        
        if (definition) {
          return definition;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Find references to a symbol
   */
  async findReferences(
    symbol: string,
    searchPaths: string[]
  ): Promise<CodeContext[]> {
    const references: CodeContext[] = [];
    
    for (const searchPath of searchPaths) {
      const files = await this.findFiles(searchPath);
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');
          
          // Simple text search for references
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(symbol)) {
              const context = this.extractAroundLine(content, i + 1, file, 3);
              references.push(context);
            }
          }
        } catch (error) {
          logger.error(`Failed to search ${file}:`, error);
        }
      }
    }
    
    return references;
  }
  
  /**
   * Score context relevance to a query
   */
  private scoreContextRelevance(context: CodeContext, query: string): number {
    let score = context.relevanceScore || 0.5;
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);
    
    // Check name match
    if (context.metadata.name) {
      const nameLower = context.metadata.name.toLowerCase();
      if (nameLower === queryLower) {
        score = 1.0;
      } else if (nameLower.includes(queryLower)) {
        score *= 1.5;
      } else {
        // Check individual terms
        const matchingTerms = queryTerms.filter(term => nameLower.includes(term));
        score *= 1 + (matchingTerms.length / queryTerms.length) * 0.5;
      }
    }
    
    // Check content match
    const contentLower = context.content.toLowerCase();
    const contentMatches = queryTerms.filter(term => contentLower.includes(term));
    score *= 1 + (contentMatches.length / queryTerms.length) * 0.3;
    
    // Boost based on context type
    if (context.type === 'function' || context.type === 'class') {
      score *= 1.1;
    }
    
    return Math.min(score, 1);
  }
  
  /**
   * Estimate token count
   */
  private estimateTokens(content: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(content.length / 4);
  }
  
  /**
   * Truncate context to fit token limit
   */
  private truncateContext(context: CodeContext, maxTokens: number): CodeContext {
    const maxChars = maxTokens * 4;
    if (context.content.length <= maxChars) {
      return context;
    }
    
    return {
      ...context,
      content: context.content.substring(0, maxChars) + '\n... (truncated)',
      metadata: {
        ...context.metadata,
        truncated: true
      }
    };
  }
  
  /**
   * Generate cache key
   */
  private getCacheKey(filePath: string, options: ContextExtractionOptions): string {
    const optionsStr = JSON.stringify(options);
    return createHash('md5').update(`${filePath}:${optionsStr}`).digest('hex');
  }
  
  /**
   * Find files recursively
   */
  private async findFiles(searchPath: string): Promise<string[]> {
    const files: string[] = [];
    
    async function walk(dir: string) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
              await walk(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).substring(1);
            if (['js', 'ts', 'jsx', 'tsx', 'py'].includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }
    
    const stat = await fs.stat(searchPath);
    if (stat.isDirectory()) {
      await walk(searchPath);
    } else {
      files.push(searchPath);
    }
    
    return files;
  }
  
  /**
   * Extract context around a specific line
   */
  private extractAroundLine(
    content: string,
    line: number,
    filePath: string,
    contextLines: number = 3
  ): CodeContext {
    const lines = content.split('\n');
    const startLine = Math.max(1, line - contextLines);
    const endLine = Math.min(lines.length, line + contextLines);
    
    const contextContent = lines.slice(startLine - 1, endLine).join('\n');
    
    return {
      id: `reference:${filePath}:${line}`,
      filePath,
      language: path.extname(filePath).substring(1),
      content: contextContent,
      startLine,
      endLine,
      type: 'block',
      metadata: {
        targetLine: line
      },
      relevanceScore: 0.6
    };
  }
  
  /**
   * Generate window summary
   */
  private generateWindowSummary(window: ContextWindow): string {
    const types = new Map<string, number>();
    
    for (const context of window.contexts) {
      types.set(context.type, (types.get(context.type) || 0) + 1);
    }
    
    const typesSummary = Array.from(types.entries())
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');
    
    return `Context window: ${window.contexts.length} contexts (${typesSummary}) from ${window.files.size} files, ${window.totalTokens}/${window.maxTokens} tokens`;
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Context cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number } {
    return {
      size: this.cache.size()
    };
  }
}