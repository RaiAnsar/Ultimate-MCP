/**
 * Code Context Analysis Tools
 * Provides intelligent code context extraction and navigation
 */

import { z } from 'zod';
import { ToolDefinition } from '../types/index.js';
import { CodeContextManager } from '../code-context/context-manager.js';
import { Logger } from '../utils/logger.js';
import * as path from 'path';

const logger = new Logger('CodeContextTools');

// Global context manager instance
let contextManager: CodeContextManager | null = null;

// Initialize context manager
function getContextManager(): CodeContextManager {
  if (!contextManager) {
    contextManager = new CodeContextManager();
  }
  return contextManager;
}

// Tool definitions

export const extractCodeContext: ToolDefinition = {
  name: 'extract_code_context',
  description: 'Extract intelligent code context from files with smart filtering and token management',
  inputSchema: z.object({
    filePaths: z.array(z.string()).describe('File paths to extract context from'),
    options: z.object({
      maxTokens: z.number().optional().default(8000)
        .describe('Maximum tokens for context window'),
      includeImports: z.boolean().optional().default(true),
      includeExports: z.boolean().optional().default(true),
      includeDocstrings: z.boolean().optional().default(true),
      includeComments: z.boolean().optional().default(false),
      contextLines: z.number().optional().default(5)
        .describe('Lines of context around key elements'),
      minRelevance: z.number().optional().default(0.3)
        .describe('Minimum relevance score (0-1)'),
      strategy: z.enum(['function-focused', 'class-focused', 'import-focused'])
        .optional()
        .describe('Context extraction strategy')
    }).optional()
  }).strict() as any,
  handler: async (args) => {
    const manager = getContextManager();
    const { filePaths, options = {} } = args;
    
    // Apply strategy if specified
    const extractionOptions = {
      ...options,
      languages: options.strategy ? [`strategy:${options.strategy}`] : undefined
    };
    
    // Build context window
    const window = await manager.buildContextWindow(filePaths, extractionOptions);
    
    return {
      window: {
        totalContexts: window.contexts.length,
        totalTokens: window.totalTokens,
        maxTokens: window.maxTokens,
        filesIncluded: Array.from(window.files),
        summary: window.summary
      },
      contexts: window.contexts.map(ctx => ({
        id: ctx.id,
        filePath: ctx.filePath,
        type: ctx.type,
        name: ctx.metadata.name,
        startLine: ctx.startLine,
        endLine: ctx.endLine,
        content: ctx.content,
        relevanceScore: ctx.relevanceScore,
        metadata: ctx.metadata
      }))
    };
  }
};

export const analyzeFileStructure: ToolDefinition = {
  name: 'analyze_file_structure',
  description: 'Analyze the structure of a code file including imports, exports, classes, and functions',
  inputSchema: z.object({
    filePath: z.string().describe('File path to analyze')
  }).strict() as any,
  handler: async (args) => {
    const manager = getContextManager();
    const fileContext = await manager.getFileContext(args.filePath);
    
    if (!fileContext) {
      throw new Error(`Could not analyze file: ${args.filePath}`);
    }
    
    return {
      filePath: fileContext.filePath,
      language: fileContext.language,
      structure: {
        imports: fileContext.imports.map(imp => ({
          source: imp.source,
          specifiers: imp.specifiers,
          line: imp.line,
          type: imp.type
        })),
        exports: fileContext.exports.map(exp => ({
          name: exp.name,
          type: exp.type,
          line: exp.line
        })),
        classes: fileContext.classes.map(cls => ({
          name: cls.name,
          lines: `${cls.startLine}-${cls.endLine}`,
          methods: cls.methods.map(m => m.name),
          extends: cls.extends,
          implements: cls.implements
        })),
        functions: fileContext.functions.map(func => ({
          name: func.name,
          lines: `${func.startLine}-${func.endLine}`,
          parameters: func.parameters.map(p => p.name),
          async: func.async,
          generator: func.generator,
          complexity: func.complexity
        })),
        variables: fileContext.variables.filter(v => v.scope === 'module').map(v => ({
          name: v.name,
          line: v.line,
          constant: v.constant
        }))
      },
      outline: fileContext.outline,
      stats: {
        totalLines: fileContext.outline.totalLines,
        hasTests: fileContext.outline.hasTests,
        hasDocumentation: fileContext.outline.hasDocumentation,
        importCount: fileContext.imports.length,
        exportCount: fileContext.exports.length,
        classCount: fileContext.classes.length,
        functionCount: fileContext.functions.length
      }
    };
  }
};

export const searchCodeContext: ToolDefinition = {
  name: 'search_code_context',
  description: 'Search for code context based on a query, focusing on relevant functions, classes, and symbols',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    searchPaths: z.array(z.string()).describe('Paths to search in'),
    options: z.object({
      maxTokens: z.number().optional().default(8000),
      minRelevance: z.number().optional().default(0.4),
      includeReferences: z.boolean().optional().default(false)
        .describe('Include references to the query')
    }).optional()
  }).strict() as any,
  handler: async (args) => {
    const manager = getContextManager();
    const { query, searchPaths, options = {} } = args;
    
    // Build query-focused context window
    const window = await manager.buildQueryFocusedWindow(
      query,
      searchPaths,
      options
    );
    
    // Find exact definition if possible
    const definition = await manager.findDefinition(query, searchPaths);
    
    // Find references if requested
    let references: any[] = [];
    if (options.includeReferences) {
      references = await manager.findReferences(query, searchPaths);
    }
    
    return {
      query,
      definition: definition ? {
        filePath: definition.filePath,
        type: definition.type,
        name: definition.metadata.name,
        startLine: definition.startLine,
        content: definition.content
      } : null,
      contexts: window.contexts.map(ctx => ({
        filePath: ctx.filePath,
        type: ctx.type,
        name: ctx.metadata.name || 'unnamed',
        startLine: ctx.startLine,
        endLine: ctx.endLine,
        relevanceScore: ctx.relevanceScore,
        preview: ctx.content.split('\n').slice(0, 3).join('\n') + '...'
      })),
      references: references.map(ref => ({
        filePath: ref.filePath,
        line: ref.metadata.targetLine,
        preview: ref.content
      })),
      summary: {
        totalContexts: window.contexts.length,
        totalReferences: references.length,
        filesSearched: window.files.size,
        tokensUsed: window.totalTokens
      }
    };
  }
};

export const findSymbolDefinition: ToolDefinition = {
  name: 'find_symbol_definition',
  description: 'Find the definition of a function, class, or variable',
  inputSchema: z.object({
    symbol: z.string().describe('Symbol name to find'),
    searchPaths: z.array(z.string()).describe('Paths to search in')
  }).strict() as any,
  handler: async (args) => {
    const manager = getContextManager();
    const definition = await manager.findDefinition(args.symbol, args.searchPaths);
    
    if (!definition) {
      return {
        found: false,
        symbol: args.symbol,
        message: `Definition for '${args.symbol}' not found in the specified paths`
      };
    }
    
    return {
      found: true,
      symbol: args.symbol,
      definition: {
        filePath: definition.filePath,
        type: definition.type,
        name: definition.metadata.name,
        startLine: definition.startLine,
        endLine: definition.endLine,
        signature: definition.metadata.signature,
        docstring: definition.metadata.docstring,
        content: definition.content
      }
    };
  }
};

export const findSymbolReferences: ToolDefinition = {
  name: 'find_symbol_references',
  description: 'Find all references to a function, class, or variable',
  inputSchema: z.object({
    symbol: z.string().describe('Symbol name to find references for'),
    searchPaths: z.array(z.string()).describe('Paths to search in'),
    includeDefinition: z.boolean().optional().default(true)
      .describe('Include the definition in results')
  }).strict() as any,
  handler: async (args) => {
    const manager = getContextManager();
    
    // Find references
    const references = await manager.findReferences(args.symbol, args.searchPaths);
    
    // Optionally include definition
    let definition = null;
    if (args.includeDefinition) {
      definition = await manager.findDefinition(args.symbol, args.searchPaths);
    }
    
    return {
      symbol: args.symbol,
      definition: definition ? {
        filePath: definition.filePath,
        line: definition.startLine,
        type: definition.type
      } : null,
      references: references.map(ref => ({
        filePath: ref.filePath,
        line: ref.metadata.targetLine || ref.startLine,
        context: ref.content,
        type: 'reference'
      })),
      summary: {
        totalReferences: references.length,
        filesWithReferences: new Set(references.map(r => r.filePath)).size
      }
    };
  }
};

export const buildSmartContext: ToolDefinition = {
  name: 'build_smart_context',
  description: 'Build an intelligent context window for a specific task or query',
  inputSchema: z.object({
    // Support both parameter formats
    task: z.string().optional().describe('Task description or query'),
    query: z.string().optional().describe('Task description or query (alternative to task)'),
    basePath: z.string().optional().describe('Base path to search from'),
    paths: z.union([
      z.array(z.string()),
      z.string()
    ]).optional().describe('Paths to search from (alternative to basePath)'),
    maxTokens: z.number().optional().describe('Maximum tokens (alternative to options.maxTokens)'),
    options: z.object({
      maxTokens: z.number().optional().default(12000),
      strategy: z.enum(['comprehensive', 'focused', 'minimal'])
        .optional().default('focused'),
      fileTypes: z.array(z.string()).optional()
        .describe('File extensions to include (e.g., [".ts", ".js"])')
    }).optional()
  }).refine(
    (data) => (data.task || data.query) && (data.basePath || data.paths),
    {
      message: "Either 'task' or 'query' and either 'basePath' or 'paths' must be provided"
    }
  ) as any,
  handler: async (args) => {
    const manager = getContextManager();
    
    // Normalize parameters to support both formats
    const task = args.task || args.query;
    let basePath = args.basePath;
    
    // Handle paths array
    if (!basePath && args.paths) {
      if (Array.isArray(args.paths)) {
        basePath = args.paths[0]; // Use first path as base
      } else if (typeof args.paths === 'string') {
        // Handle string that might be JSON
        try {
          const parsed = JSON.parse(args.paths);
          basePath = Array.isArray(parsed) ? parsed[0] : args.paths;
        } catch {
          basePath = args.paths;
        }
      }
    }
    
    // Merge maxTokens from both possible locations
    const options = {
      ...args.options,
      maxTokens: args.maxTokens || args.options?.maxTokens || 12000
    };
    
    // Determine extraction options based on strategy
    const extractionOptions = {
      maxTokens: options.maxTokens,
      includeImports: options.strategy === 'comprehensive',
      includeExports: options.strategy === 'comprehensive',
      includeDocstrings: true,
      includeComments: options.strategy === 'comprehensive',
      minRelevance: options.strategy === 'minimal' ? 0.6 : 0.3
    };
    
    // Build query-focused window
    const window = await manager.buildQueryFocusedWindow(
      task,
      [basePath],
      extractionOptions
    );
    
    // Group contexts by type and file
    const contextsByFile = new Map<string, any[]>();
    for (const ctx of window.contexts) {
      const fileName = path.basename(ctx.filePath);
      if (!contextsByFile.has(fileName)) {
        contextsByFile.set(fileName, []);
      }
      contextsByFile.get(fileName)!.push({
        type: ctx.type,
        name: ctx.metadata.name || 'unnamed',
        lines: `${ctx.startLine}-${ctx.endLine}`,
        relevance: ctx.relevanceScore
      });
    }
    
    return {
      task,
      strategy: options.strategy,
      context: {
        totalTokens: window.totalTokens,
        maxTokens: window.maxTokens,
        filesIncluded: Array.from(window.files),
        contextCount: window.contexts.length
      },
      fileBreakdown: Array.from(contextsByFile.entries()).map(([file, contexts]) => ({
        file,
        contexts,
        totalContexts: contexts.length
      })),
      topContexts: window.contexts.slice(0, 5).map(ctx => ({
        file: path.basename(ctx.filePath),
        type: ctx.type,
        name: ctx.metadata.name || 'unnamed',
        relevance: ctx.relevanceScore,
        preview: ctx.content.split('\n').slice(0, 3).join('\n') + '...'
      })),
      recommendation: window.contexts.length === 0 
        ? 'No relevant context found. Try broadening the search or adjusting the query.'
        : window.totalTokens > window.maxTokens * 0.9
        ? 'Context window is nearly full. Consider using a more focused strategy.'
        : 'Context window built successfully with room for additional context if needed.'
    };
  }
};

export const clearContextCache: ToolDefinition = {
  name: 'clear_context_cache',
  description: 'Clear the code context cache',
  inputSchema: z.object({}).strict() as any,
  handler: async () => {
    const manager = getContextManager();
    manager.clearCache();
    
    return {
      message: 'Code context cache cleared successfully',
      stats: manager.getCacheStats()
    };
  }
};

// Export all code context tools
export const codeContextTools: ToolDefinition[] = [
  extractCodeContext,
  analyzeFileStructure,
  searchCodeContext,
  findSymbolDefinition,
  findSymbolReferences,
  buildSmartContext,
  clearContextCache
];