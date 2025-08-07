/**
 * Cognitive Memory Manager
 * Main entry point for cognitive search and memory functionality
 */

import { KnowledgeGraphManager } from './knowledge-graph.js';
import { CodeAnalyzer } from './code-analyzer.js';
import {
  CognitiveMemoryConfig,
  CognitiveNode,
  CognitiveEdge,
  MemorySearchOptions,
  MemoryContext,
  CodeAnalysisResult
} from './types.js';
import { Logger } from '../utils/logger.js';
import { EmbeddingProvider, createEmbeddingProvider } from '../rag/embeddings.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = new Logger('CognitiveMemory');

export class CognitiveMemoryManager {
  private knowledgeGraph: KnowledgeGraphManager;
  private codeAnalyzer: CodeAnalyzer;
  private embeddingProvider?: EmbeddingProvider;
  private config: CognitiveMemoryConfig;
  
  constructor(config: CognitiveMemoryConfig = {}) {
    this.config = config;
    this.knowledgeGraph = new KnowledgeGraphManager(config);
    this.codeAnalyzer = new CodeAnalyzer();
  }
  
  async initialize(): Promise<void> {
    // Initialize embedding provider if API key is available
    if (process.env.OPENAI_API_KEY || process.env.COHERE_API_KEY) {
      if (process.env.OPENAI_API_KEY) {
        this.embeddingProvider = createEmbeddingProvider({
          provider: 'openai',
          model: 'text-embedding-3-small',
          apiKey: process.env.OPENAI_API_KEY
        });
      } else if (process.env.COHERE_API_KEY) {
        this.embeddingProvider = createEmbeddingProvider({
          provider: 'cohere',
          model: 'embed-english-v3.0',
          apiKey: process.env.COHERE_API_KEY
        });
      }
    } else {
      // Use local embedding provider
      this.embeddingProvider = createEmbeddingProvider({
        provider: 'local',
        model: 'simple-hash'
      });
    }
    
    await this.knowledgeGraph.initialize(this.embeddingProvider);
    logger.info('Cognitive memory system initialized');
  }
  
  /**
   * Add a concept to the knowledge graph
   */
  async addConcept(
    name: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<CognitiveNode> {
    return this.knowledgeGraph.addNode({
      type: 'concept',
      name,
      content,
      metadata,
      importance: metadata.importance || 0.5
    });
  }
  
  /**
   * Add an entity to the knowledge graph
   */
  async addEntity(
    name: string,
    content: string,
    entityType: string,
    metadata: Record<string, any> = {}
  ): Promise<CognitiveNode> {
    return this.knowledgeGraph.addNode({
      type: 'entity',
      name,
      content,
      metadata: { ...metadata, entityType },
      importance: metadata.importance || 0.5
    });
  }
  
  /**
   * Add a memory to the knowledge graph
   */
  async addMemory(
    content: string,
    context: string,
    metadata: Record<string, any> = {}
  ): Promise<CognitiveNode> {
    return this.knowledgeGraph.addNode({
      type: 'memory',
      name: `Memory: ${content.substring(0, 50)}...`,
      content,
      metadata: { ...metadata, context },
      importance: metadata.importance || 0.6
    });
  }
  
  /**
   * Add a relationship between nodes
   */
  async addRelationship(
    sourceId: string,
    targetId: string,
    type: CognitiveEdge['type'],
    weight: number = 0.5,
    metadata: Record<string, any> = {}
  ): Promise<CognitiveEdge> {
    return this.knowledgeGraph.addEdge({
      source: sourceId,
      target: targetId,
      type,
      weight,
      metadata
    });
  }
  
  /**
   * Analyze and add code to the knowledge graph
   */
  async analyzeAndAddCode(
    filePath: string,
    content?: string
  ): Promise<{ node: CognitiveNode; analysis: CodeAnalysisResult }> {
    // Read file content if not provided
    if (!content) {
      content = await fs.readFile(filePath, 'utf-8');
    }
    
    // Analyze code
    const analysis = await this.codeAnalyzer.analyzeCode(content, filePath);
    
    // Add code node
    const codeNode = await this.knowledgeGraph.addNode({
      type: 'code',
      name: path.basename(filePath),
      content: content,
      metadata: {
        filePath,
        language: path.extname(filePath).substring(1),
        complexity: analysis.complexity,
        symbolCount: analysis.symbols.length,
        patterns: analysis.patterns.map(p => p.type)
      },
      importance: Math.min(0.5 + (analysis.symbols.length / 100), 1)
    });
    
    // Add symbol nodes and relationships
    for (const symbol of analysis.symbols) {
      const symbolNode = await this.knowledgeGraph.addNode({
        type: 'entity',
        name: symbol.name,
        content: symbol.signature || symbol.name,
        metadata: {
          entityType: 'code-symbol',
          symbolType: symbol.type,
          location: symbol.location,
          docstring: symbol.docstring
        },
        importance: symbol.type === 'class' ? 0.7 : 0.6
      });
      
      // Link symbol to code
      await this.knowledgeGraph.addEdge({
        source: codeNode.id,
        target: symbolNode.id,
        type: 'contains',
        weight: 0.8,
        metadata: { symbolType: symbol.type }
      });
    }
    
    // Add dependency relationships
    for (const dep of analysis.dependencies) {
      // Create or find dependency node
      const depNode = await this.knowledgeGraph.addNode({
        type: 'entity',
        name: dep.target,
        content: `Dependency: ${dep.target}`,
        metadata: {
          entityType: 'dependency',
          dependencyType: dep.type
        },
        importance: 0.4
      });
      
      // Link dependency
      await this.knowledgeGraph.addEdge({
        source: codeNode.id,
        target: depNode.id,
        type: 'depends_on',
        weight: 0.6,
        metadata: { dependencyType: dep.type }
      });
    }
    
    return { node: codeNode, analysis };
  }
  
  /**
   * Analyze and add an entire codebase
   */
  async analyzeCodebase(
    rootPath: string,
    extensions: string[] = ['.js', '.ts', '.jsx', '.tsx', '.py']
  ): Promise<{ filesAnalyzed: number; nodesCreated: number }> {
    let filesAnalyzed = 0;
    let nodesCreated = 0;
    
    async function* walkDirectory(dir: string): AsyncGenerator<string> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip common directories
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            yield* walkDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            yield fullPath;
          }
        }
      }
    }
    
    // Analyze all files
    for await (const filePath of walkDirectory(rootPath)) {
      try {
        const { node } = await this.analyzeAndAddCode(filePath);
        filesAnalyzed++;
        nodesCreated++;
        
        logger.debug(`Analyzed ${filePath}`);
      } catch (error) {
        logger.error(`Failed to analyze ${filePath}:`, error);
      }
    }
    
    // Build relationships between files based on imports
    // This would require a second pass to match imports with actual files
    
    return { filesAnalyzed, nodesCreated };
  }
  
  /**
   * Search the cognitive memory
   */
  async search(options: MemorySearchOptions): Promise<MemoryContext> {
    return this.knowledgeGraph.search(options);
  }
  
  /**
   * Get related memories and concepts
   */
  async getRelated(
    nodeId: string,
    depth: number = 2
  ): Promise<MemoryContext> {
    const searchResult = await this.knowledgeGraph.search({
      query: nodeId,
      includeRelated: true,
      depth,
      limit: 20
    });
    
    return searchResult;
  }
  
  /**
   * Build a context from multiple searches
   */
  async buildContext(queries: string[]): Promise<MemoryContext> {
    const allNodes = new Map<string, CognitiveNode>();
    const allEdges = new Map<string, CognitiveEdge>();
    const relevanceScores = new Map<string, number>();
    
    // Perform searches
    for (const query of queries) {
      const result = await this.search({
        query,
        includeRelated: true,
        limit: 10
      });
      
      // Merge results
      for (const node of result.nodes) {
        if (!allNodes.has(node.id)) {
          allNodes.set(node.id, node);
        }
      }
      
      for (const edge of result.edges) {
        if (!allEdges.has(edge.id)) {
          allEdges.set(edge.id, edge);
        }
      }
      
      for (const [nodeId, score] of result.relevanceScores) {
        const existing = relevanceScores.get(nodeId) || 0;
        relevanceScores.set(nodeId, Math.max(existing, score));
      }
    }
    
    // Build subgraph
    const subgraph = {
      nodes: allNodes,
      edges: allEdges,
      nodeIndex: new Map(),
      edgeIndex: new Map()
    };
    
    // Rebuild indices
    for (const node of allNodes.values()) {
      if (!subgraph.nodeIndex.has(node.type)) {
        subgraph.nodeIndex.set(node.type, new Set());
      }
      subgraph.nodeIndex.get(node.type)!.add(node.id);
    }
    
    for (const edge of allEdges.values()) {
      if (!subgraph.edgeIndex.has(edge.source)) {
        subgraph.edgeIndex.set(edge.source, new Set());
      }
      subgraph.edgeIndex.get(edge.source)!.add(edge.id);
    }
    
    return {
      nodes: Array.from(allNodes.values()),
      edges: Array.from(allEdges.values()),
      subgraph,
      relevanceScores
    };
  }
  
  /**
   * Get memory statistics
   */
  getStats(): Record<string, any> {
    return this.knowledgeGraph.getStats();
  }
  
  /**
   * Export knowledge graph for visualization
   */
  exportForVisualization(): { nodes: any[]; edges: any[] } {
    return this.knowledgeGraph.exportForVisualization();
  }
  
  /**
   * Clear all memory
   */
  async clear(): Promise<void> {
    this.knowledgeGraph = new KnowledgeGraphManager(this.config);
    await this.knowledgeGraph.initialize(this.embeddingProvider);
    logger.info('Cognitive memory cleared');
  }
}