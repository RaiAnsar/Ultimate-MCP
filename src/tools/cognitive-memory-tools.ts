/**
 * Cognitive Memory Tools for MCP
 * Provides tools for knowledge graph, code analysis, and cognitive search
 */

import { z } from 'zod';
import { ToolDefinition } from '../types/index.js';
import { CognitiveMemoryManager } from '../cognitive/cognitive-memory.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('CognitiveMemoryTools');

// Global cognitive memory instance
let cognitiveMemory: CognitiveMemoryManager | null = null;

// Initialize cognitive memory
async function initializeCognitiveMemory(): Promise<void> {
  if (!cognitiveMemory) {
    cognitiveMemory = new CognitiveMemoryManager({
      maxNodes: 10000,
      maxEdges: 50000,
      pruneThreshold: 0.1,
      persistencePath: process.env.COGNITIVE_MEMORY_PATH || '.cognitive-memory.json',
      autoSave: true,
      autoSaveInterval: 60000
    });
    
    await cognitiveMemory.initialize();
    logger.info('Cognitive memory system initialized');
  }
}

// Tool definitions

export const buildKnowledgeGraph: ToolDefinition = {
  name: 'build_knowledge_graph',
  description: 'Build or update the knowledge graph with concepts, entities, and relationships',
  inputSchema: z.object({
    operation: z.enum(['add_concept', 'add_entity', 'add_memory', 'add_relationship'])
      .describe('Operation to perform'),
    data: z.union([
      // Add concept
      z.object({
        name: z.string(),
        content: z.string(),
        metadata: z.record(z.any()).optional()
      }),
      // Add entity
      z.object({
        name: z.string(),
        content: z.string(),
        entityType: z.string(),
        metadata: z.record(z.any()).optional()
      }),
      // Add memory
      z.object({
        content: z.string(),
        context: z.string(),
        metadata: z.record(z.any()).optional()
      }),
      // Add relationship
      z.object({
        sourceId: z.string(),
        targetId: z.string(),
        type: z.enum(['relates_to', 'contains', 'depends_on', 'similar_to', 'derived_from', 'references']),
        weight: z.number().min(0).max(1).optional(),
        metadata: z.record(z.any()).optional()
      })
    ]).describe('Data for the operation')
  }).strict(),
  handler: async (args) => {
    await initializeCognitiveMemory();
    
    const { operation, data } = args;
    
    switch (operation) {
      case 'add_concept': {
        const conceptData = data as any;
        const node = await cognitiveMemory!.addConcept(
          conceptData.name,
          conceptData.content,
          conceptData.metadata
        );
        return {
          operation,
          nodeId: node.id,
          message: `Concept "${node.name}" added to knowledge graph`
        };
      }
      
      case 'add_entity': {
        const entityData = data as any;
        const node = await cognitiveMemory!.addEntity(
          entityData.name,
          entityData.content,
          entityData.entityType,
          entityData.metadata
        );
        return {
          operation,
          nodeId: node.id,
          message: `Entity "${node.name}" (${entityData.entityType}) added to knowledge graph`
        };
      }
      
      case 'add_memory': {
        const memoryData = data as any;
        const node = await cognitiveMemory!.addMemory(
          memoryData.content,
          memoryData.context,
          memoryData.metadata
        );
        return {
          operation,
          nodeId: node.id,
          message: `Memory added to knowledge graph`
        };
      }
      
      case 'add_relationship': {
        const relData = data as any;
        const edge = await cognitiveMemory!.addRelationship(
          relData.sourceId,
          relData.targetId,
          relData.type,
          relData.weight,
          relData.metadata
        );
        return {
          operation,
          edgeId: edge.id,
          message: `Relationship created: ${relData.sourceId} -[${relData.type}]-> ${relData.targetId}`
        };
      }
    }
  }
};

export const cognitiveSearch: ToolDefinition = {
  name: 'cognitive_search',
  description: 'Search the cognitive memory using semantic similarity and graph traversal',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    type: z.enum(['concept', 'entity', 'relation', 'code', 'document', 'memory'])
      .optional()
      .describe('Filter by node type'),
    limit: z.number().optional().default(10).describe('Maximum results'),
    includeRelated: z.boolean().optional().default(true)
      .describe('Include related nodes through graph traversal'),
    depth: z.number().optional().default(2)
      .describe('Depth of graph traversal for related nodes')
  }).strict(),
  handler: async (args) => {
    await initializeCognitiveMemory();
    
    const context = await cognitiveMemory!.search({
      query: args.query,
      type: args.type,
      limit: args.limit,
      includeRelated: args.includeRelated,
      depth: args.depth
    });
    
    return {
      query: args.query,
      topResults: context.nodes.map(node => ({
        id: node.id,
        type: node.type,
        name: node.name,
        content: node.content.substring(0, 200) + '...',
        importance: node.importance,
        relevanceScore: context.relevanceScores.get(node.id) || 0
      })),
      relatedNodes: context.subgraph.nodes.size - context.nodes.length,
      totalEdges: context.edges.length,
      graphSize: {
        nodes: context.subgraph.nodes.size,
        edges: context.subgraph.edges.size
      }
    };
  }
};

export const analyzeCodeGraph: ToolDefinition = {
  name: 'analyze_code_graph',
  description: 'Analyze code files and build a code knowledge graph with symbols and dependencies',
  inputSchema: z.object({
    filePath: z.string().optional().describe('Single file to analyze'),
    directory: z.string().optional().describe('Directory to analyze recursively'),
    extensions: z.array(z.string()).optional()
      .default(['.js', '.ts', '.jsx', '.tsx', '.py'])
      .describe('File extensions to include')
  }).strict(),
  handler: async (args) => {
    await initializeCognitiveMemory();
    
    if (args.filePath) {
      // Analyze single file
      const { node, analysis } = await cognitiveMemory!.analyzeAndAddCode(args.filePath);
      
      return {
        mode: 'single-file',
        file: args.filePath,
        nodeId: node.id,
        analysis: {
          symbols: analysis.symbols.length,
          dependencies: analysis.dependencies.length,
          complexity: analysis.complexity,
          patterns: analysis.patterns.map(p => ({
            type: p.type,
            occurrences: p.occurrences
          }))
        },
        message: `Analyzed ${args.filePath} and added to knowledge graph`
      };
    } else if (args.directory) {
      // Analyze directory
      const result = await cognitiveMemory!.analyzeCodebase(
        args.directory,
        args.extensions
      );
      
      return {
        mode: 'directory',
        directory: args.directory,
        filesAnalyzed: result.filesAnalyzed,
        nodesCreated: result.nodesCreated,
        message: `Analyzed ${result.filesAnalyzed} files and created ${result.nodesCreated} nodes`
      };
    } else {
      throw new Error('Either filePath or directory must be provided');
    }
  }
};

export const buildMemoryContext: ToolDefinition = {
  name: 'build_memory_context',
  description: 'Build a comprehensive context from multiple queries combining all relevant memories',
  inputSchema: z.object({
    queries: z.array(z.string()).describe('List of queries to search for'),
    includeStats: z.boolean().optional().default(false)
      .describe('Include graph statistics in response')
  }).strict(),
  handler: async (args) => {
    await initializeCognitiveMemory();
    
    const context = await cognitiveMemory!.buildContext(args.queries);
    
    const response: any = {
      queries: args.queries,
      context: {
        totalNodes: context.nodes.length,
        totalEdges: context.edges.length,
        nodeTypes: {} as Record<string, number>,
        topNodes: context.nodes
          .sort((a, b) => 
            (context.relevanceScores.get(b.id) || 0) - 
            (context.relevanceScores.get(a.id) || 0)
          )
          .slice(0, 5)
          .map(node => ({
            id: node.id,
            type: node.type,
            name: node.name,
            relevance: context.relevanceScores.get(node.id) || 0
          }))
      }
    };
    
    // Count node types
    for (const node of context.nodes) {
      response.context.nodeTypes[node.type] = 
        (response.context.nodeTypes[node.type] || 0) + 1;
    }
    
    // Add stats if requested
    if (args.includeStats) {
      response.stats = cognitiveMemory!.getStats();
    }
    
    return response;
  }
};

export const getRelatedMemories: ToolDefinition = {
  name: 'get_related_memories',
  description: 'Get memories and concepts related to a specific node in the knowledge graph',
  inputSchema: z.object({
    nodeId: z.string().describe('Node ID to find related memories for'),
    depth: z.number().optional().default(2).min(1).max(5)
      .describe('How many hops to traverse in the graph')
  }).strict(),
  handler: async (args) => {
    await initializeCognitiveMemory();
    
    const context = await cognitiveMemory!.getRelated(args.nodeId, args.depth);
    
    return {
      sourceNodeId: args.nodeId,
      depth: args.depth,
      relatedNodes: context.nodes.map(node => ({
        id: node.id,
        type: node.type,
        name: node.name,
        relationPath: 'Direct or indirect connection',
        importance: node.importance
      })),
      totalRelated: context.nodes.length,
      edgeTypes: Array.from(new Set(context.edges.map(e => e.type)))
    };
  }
};

export const exportKnowledgeGraph: ToolDefinition = {
  name: 'export_knowledge_graph',
  description: 'Export the knowledge graph for visualization or analysis',
  inputSchema: z.object({
    format: z.enum(['visualization', 'stats'])
      .default('visualization')
      .describe('Export format')
  }).strict(),
  handler: async (args) => {
    await initializeCognitiveMemory();
    
    if (args.format === 'visualization') {
      const data = cognitiveMemory!.exportForVisualization();
      
      return {
        format: 'visualization',
        graph: data,
        metadata: {
          nodeCount: data.nodes.length,
          edgeCount: data.edges.length,
          nodeTypes: Array.from(new Set(data.nodes.map(n => n.group))),
          edgeTypes: Array.from(new Set(data.edges.map(e => e.label)))
        },
        message: 'Knowledge graph exported for visualization'
      };
    } else {
      const stats = cognitiveMemory!.getStats();
      
      return {
        format: 'stats',
        statistics: stats,
        message: 'Knowledge graph statistics exported'
      };
    }
  }
};

export const clearCognitiveMemory: ToolDefinition = {
  name: 'clear_cognitive_memory',
  description: 'Clear all cognitive memory (use with caution)',
  inputSchema: z.object({
    confirm: z.boolean().describe('Confirm clearing all memory')
  }).strict(),
  handler: async (args) => {
    if (!args.confirm) {
      return {
        error: 'Please confirm clearing all cognitive memory by setting confirm to true'
      };
    }
    
    await initializeCognitiveMemory();
    await cognitiveMemory!.clear();
    
    return {
      message: 'All cognitive memory has been cleared'
    };
  }
};

// Export all cognitive memory tools
export const cognitiveMemoryTools: ToolDefinition[] = [
  buildKnowledgeGraph,
  cognitiveSearch,
  analyzeCodeGraph,
  buildMemoryContext,
  getRelatedMemories,
  exportKnowledgeGraph,
  clearCognitiveMemory
];