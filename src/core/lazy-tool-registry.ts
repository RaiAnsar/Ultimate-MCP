/**
 * Smart Lazy Tool Registry
 * 
 * Implements eager registration with lazy implementation loading
 * to maintain fast startup while showing all tools immediately
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolDefinition } from '../types/index.js';

export interface LazyToolDefinition extends Omit<ToolDefinition, 'handler'> {
  loader: () => Promise<ToolDefinition>;
  loaded?: boolean;
  implementation?: ToolDefinition;
}

export class LazyToolRegistry {
  private tools = new Map<string, LazyToolDefinition>();
  private loadingPromises = new Map<string, Promise<void>>();
  private loadedCount = 0;
  private totalCount = 0;
  
  /**
   * Register a tool with lazy loading
   */
  registerLazyTool(config: {
    name: string;
    description: string;
    inputSchema: any;
    tags?: string[];
    loader: () => Promise<ToolDefinition>;
  }) {
    // Check for duplicates
    if (this.tools.has(config.name)) {
      throw new Error(`Tool ${config.name} is already registered`);
    }
    
    const lazyTool: LazyToolDefinition = {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema,
      tags: config.tags,
      loader: config.loader,
      loaded: false,
      handler: async (args: any) => {
        // Load implementation on first use
        await this.ensureLoaded(config.name);
        const tool = this.tools.get(config.name)!;
        return tool.implementation!.handler(args);
      }
    };
    
    this.tools.set(config.name, lazyTool);
    this.totalCount++;
  }
  
  /**
   * Check if a tool is registered (without loading)
   */
  hasToolMetadata(name: string): boolean {
    return this.tools.has(name);
  }
  
  /**
   * Get tool metadata without loading implementation
   */
  getToolMetadata(name: string): LazyToolDefinition | null {
    return this.tools.get(name) || null;
  }
  
  /**
   * Get all tool metadata without loading implementations
   */
  getAllToolMetadata(): LazyToolDefinition[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get tool implementation (loads if needed)
   */
  async getImplementation(name: string): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    
    await this.ensureLoaded(name);
    return tool.handler; // Return the handler function directly
  }
  
  /**
   * Register all tools with their loaders
   */
  registerAllTools() {
    // Debug tools
    this.registerLazyTool({
      name: 'analyze_error',
      description: 'Analyze an error message and provide debugging suggestions',
      inputSchema: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'The error message or stack trace' },
          code: { type: 'string', description: 'The code that caused the error' },
          language: { type: 'string', enum: ['javascript', 'typescript', 'python', 'java', 'go', 'rust'] }
        },
        required: ['error']
      },
      tags: ['debugging', 'error-analysis'],
      loader: () => import('../tools/debug-tools.js').then(m => m.analyzeError)
    });
    
    // RAG tools
    this.registerLazyTool({
      name: 'index_documents',
      description: 'Index documents for RAG system',
      inputSchema: {
        type: 'object',
        properties: {
          documents: { type: 'array', items: { type: 'object' } },
          namespace: { type: 'string' }
        },
        required: ['documents']
      },
      tags: ['rag', 'indexing'],
      loader: () => import('../tools/rag-tools.js').then(m => m.ragTools[0])
    });
    
    // UI Understanding tools
    this.registerLazyTool({
      name: 'analyze_ui_design',
      description: 'Analyze UI/UX design from URL or image',
      inputSchema: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          analysisType: { type: 'string', enum: ['comprehensive', 'layout', 'colors', 'typography', 'components'] }
        },
        required: ['source']
      },
      tags: ['ui', 'design', 'analysis'],
      loader: () => import('../tools/ui-understanding-tools.js').then(m => m.uiUnderstandingTools[0])
    });
    
    // Large Context tools
    this.registerLazyTool({
      name: 'analyze_large_codebase',
      description: 'Analyze entire codebases beyond typical context limits',
      inputSchema: {
        type: 'object',
        properties: {
          rootDir: { type: 'string' },
          pattern: { type: 'string' },
          query: { type: 'string' }
        },
        required: ['rootDir', 'query']
      },
      tags: ['codebase', 'analysis', 'large-context'],
      loader: () => import('../tools/large-context-tools.js').then(m => m.largeContextTools[0])
    });
    
    // Add more tools as needed...
  }
  
  /**
   * Ensure a tool is loaded
   */
  private async ensureLoaded(toolName: string): Promise<void> {
    const tool = this.tools.get(toolName);
    if (!tool || tool.loaded) return;
    
    // Check if already loading
    if (this.loadingPromises.has(toolName)) {
      await this.loadingPromises.get(toolName);
      return;
    }
    
    // Load implementation
    const loadingPromise = this.loadTool(tool);
    this.loadingPromises.set(toolName, loadingPromise);
    
    try {
      await loadingPromise;
    } finally {
      this.loadingPromises.delete(toolName);
    }
  }
  
  /**
   * Load a tool's implementation
   */
  private async loadTool(tool: LazyToolDefinition): Promise<void> {
    try {
      const implementation = await tool.loader();
      tool.implementation = implementation;
      tool.loaded = true;
      tool.handler = implementation.handler;
      this.loadedCount++;
    } catch (error) {
      console.error(`Failed to load tool ${tool.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all registered tools (immediate)
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get a specific tool
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }
  
  /**
   * Preload specific tools
   */
  async preloadTools(toolNames: string[]): Promise<void> {
    await Promise.all(
      toolNames.map(name => this.ensureLoaded(name))
    );
  }
  
  /**
   * Preload tools by tag
   */
  async preloadByTag(tag: string): Promise<void> {
    const toolsToLoad = Array.from(this.tools.values())
      .filter(tool => tool.tags?.includes(tag))
      .map(tool => tool.name);
    
    await this.preloadTools(toolsToLoad);
  }
  
  /**
   * Get loading statistics
   */
  getStats() {
    return {
      total: this.totalCount,
      loaded: this.loadedCount,
      percentage: Math.round((this.loadedCount / this.totalCount) * 100)
    };
  }
}