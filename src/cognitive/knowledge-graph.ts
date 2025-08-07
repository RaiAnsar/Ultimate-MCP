/**
 * Knowledge Graph Implementation
 * Core graph structure and operations for cognitive memory
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CognitiveNode,
  CognitiveEdge,
  KnowledgeGraph,
  MemorySearchOptions,
  MemoryContext,
  CognitiveMemoryConfig
} from './types.js';
import { Logger } from '../utils/logger.js';
import { EmbeddingProvider } from '../rag/embeddings.js';

const logger = new Logger('KnowledgeGraph');

export class KnowledgeGraphManager {
  private graph: KnowledgeGraph;
  private config: CognitiveMemoryConfig;
  private embeddingProvider?: EmbeddingProvider;
  
  constructor(config: CognitiveMemoryConfig = {}) {
    this.config = {
      maxNodes: 10000,
      maxEdges: 50000,
      pruneThreshold: 0.1,
      embeddingDimensions: 384,
      autoSave: true,
      autoSaveInterval: 60000, // 1 minute
      ...config
    };
    
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      nodeIndex: new Map(),
      edgeIndex: new Map()
    };
  }
  
  async initialize(embeddingProvider?: EmbeddingProvider): Promise<void> {
    this.embeddingProvider = embeddingProvider;
    
    // Load persisted graph if available
    if (this.config.persistencePath) {
      await this.loadFromDisk();
    }
    
    // Start auto-save if enabled
    if (this.config.autoSave) {
      setInterval(() => this.saveToDisk(), this.config.autoSaveInterval!);
    }
    
    logger.info('Knowledge graph initialized');
  }
  
  /**
   * Add a node to the knowledge graph
   */
  async addNode(node: Omit<CognitiveNode, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessed'>): Promise<CognitiveNode> {
    const id = uuidv4();
    const now = new Date();
    
    const cognitiveNode: CognitiveNode = {
      ...node,
      id,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessed: now,
      importance: node.importance || 0.5
    };
    
    // Generate embedding if provider is available
    if (this.embeddingProvider && !cognitiveNode.embedding) {
      cognitiveNode.embedding = await this.embeddingProvider.generateEmbedding(
        `${node.name} ${node.content}`
      );
    }
    
    // Add to graph
    this.graph.nodes.set(id, cognitiveNode);
    
    // Update type index
    if (!this.graph.nodeIndex.has(node.type)) {
      this.graph.nodeIndex.set(node.type, new Set());
    }
    this.graph.nodeIndex.get(node.type)!.add(id);
    
    // Check if we need to prune
    if (this.graph.nodes.size > this.config.maxNodes!) {
      await this.pruneNodes();
    }
    
    return cognitiveNode;
  }
  
  /**
   * Add an edge between nodes
   */
  async addEdge(edge: Omit<CognitiveEdge, 'id' | 'createdAt'>): Promise<CognitiveEdge> {
    const id = uuidv4();
    
    const cognitiveEdge: CognitiveEdge = {
      ...edge,
      id,
      createdAt: new Date()
    };
    
    // Validate nodes exist
    if (!this.graph.nodes.has(edge.source) || !this.graph.nodes.has(edge.target)) {
      throw new Error('Source or target node does not exist');
    }
    
    // Add to graph
    this.graph.edges.set(id, cognitiveEdge);
    
    // Update edge index
    if (!this.graph.edgeIndex.has(edge.source)) {
      this.graph.edgeIndex.set(edge.source, new Set());
    }
    this.graph.edgeIndex.get(edge.source)!.add(id);
    
    // Update node importance based on connections
    await this.updateNodeImportance(edge.source);
    await this.updateNodeImportance(edge.target);
    
    // Check if we need to prune
    if (this.graph.edges.size > this.config.maxEdges!) {
      await this.pruneEdges();
    }
    
    return cognitiveEdge;
  }
  
  /**
   * Search for nodes using semantic similarity
   */
  async search(options: MemorySearchOptions): Promise<MemoryContext> {
    const {
      query,
      type,
      limit = 10,
      threshold = 0.7,
      includeRelated = true,
      depth = 2
    } = options;
    
    const results: CognitiveNode[] = [];
    const relevanceScores = new Map<string, number>();
    
    // Generate query embedding
    let queryEmbedding: number[] | undefined;
    if (this.embeddingProvider) {
      queryEmbedding = await this.embeddingProvider.generateEmbedding(query);
    }
    
    // Search nodes
    for (const [nodeId, node] of this.graph.nodes) {
      // Filter by type if specified
      if (type && node.type !== type) continue;
      
      // Calculate relevance score
      let score = 0;
      
      // Embedding similarity
      if (queryEmbedding && node.embedding) {
        score = this.cosineSimilarity(queryEmbedding, node.embedding);
      } else {
        // Fallback to text similarity
        score = this.textSimilarity(query, `${node.name} ${node.content}`);
      }
      
      // Boost score based on importance and recency
      score *= node.importance;
      score *= this.recencyBoost(node.lastAccessed);
      
      if (score >= threshold) {
        results.push(node);
        relevanceScores.set(nodeId, score);
        
        // Update access stats
        node.accessCount++;
        node.lastAccessed = new Date();
      }
    }
    
    // Sort by relevance
    results.sort((a, b) => 
      (relevanceScores.get(b.id) || 0) - (relevanceScores.get(a.id) || 0)
    );
    
    // Limit results
    const topResults = results.slice(0, limit);
    
    // Build context with related nodes
    let contextNodes = [...topResults];
    const contextEdges: CognitiveEdge[] = [];
    
    if (includeRelated) {
      const visited = new Set(topResults.map(n => n.id));
      
      for (const node of topResults) {
        const related = await this.getRelatedNodes(node.id, depth, visited);
        contextNodes.push(...related.nodes);
        contextEdges.push(...related.edges);
      }
    }
    
    // Build subgraph
    const subgraph: KnowledgeGraph = {
      nodes: new Map(contextNodes.map(n => [n.id, n])),
      edges: new Map(contextEdges.map(e => [e.id, e])),
      nodeIndex: new Map(),
      edgeIndex: new Map()
    };
    
    // Rebuild indices for subgraph
    for (const node of contextNodes) {
      if (!subgraph.nodeIndex.has(node.type)) {
        subgraph.nodeIndex.set(node.type, new Set());
      }
      subgraph.nodeIndex.get(node.type)!.add(node.id);
    }
    
    for (const edge of contextEdges) {
      if (!subgraph.edgeIndex.has(edge.source)) {
        subgraph.edgeIndex.set(edge.source, new Set());
      }
      subgraph.edgeIndex.get(edge.source)!.add(edge.id);
    }
    
    return {
      nodes: topResults,
      edges: contextEdges,
      subgraph,
      relevanceScores
    };
  }
  
  /**
   * Get related nodes through graph traversal
   */
  private async getRelatedNodes(
    nodeId: string,
    depth: number,
    visited: Set<string>
  ): Promise<{ nodes: CognitiveNode[]; edges: CognitiveEdge[] }> {
    if (depth === 0 || visited.has(nodeId)) {
      return { nodes: [], edges: [] };
    }
    
    visited.add(nodeId);
    
    const nodes: CognitiveNode[] = [];
    const edges: CognitiveEdge[] = [];
    
    // Get edges from this node
    const nodeEdges = this.graph.edgeIndex.get(nodeId) || new Set();
    
    for (const edgeId of nodeEdges) {
      const edge = this.graph.edges.get(edgeId);
      if (!edge) continue;
      
      edges.push(edge);
      
      const targetNode = this.graph.nodes.get(edge.target);
      if (targetNode && !visited.has(edge.target)) {
        nodes.push(targetNode);
        
        // Recursively get related nodes
        const subRelated = await this.getRelatedNodes(edge.target, depth - 1, visited);
        nodes.push(...subRelated.nodes);
        edges.push(...subRelated.edges);
      }
    }
    
    return { nodes, edges };
  }
  
  /**
   * Update node importance based on connections and usage
   */
  private async updateNodeImportance(nodeId: string): Promise<void> {
    const node = this.graph.nodes.get(nodeId);
    if (!node) return;
    
    // Factors for importance calculation
    let importance = 0.5; // base importance
    
    // Connection factor (more connections = more important)
    const outgoingEdges = this.graph.edgeIndex.get(nodeId)?.size || 0;
    const incomingEdges = Array.from(this.graph.edges.values())
      .filter(e => e.target === nodeId).length;
    
    const connectionFactor = Math.min((outgoingEdges + incomingEdges) / 20, 1);
    importance += connectionFactor * 0.3;
    
    // Access factor (more access = more important)
    const accessFactor = Math.min(node.accessCount / 100, 1);
    importance += accessFactor * 0.2;
    
    // Recency factor
    const daysSinceAccess = (Date.now() - node.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(1 - daysSinceAccess / 30, 0);
    importance += recencyFactor * 0.1;
    
    node.importance = Math.min(importance, 1);
    node.updatedAt = new Date();
  }
  
  /**
   * Prune least important nodes
   */
  private async pruneNodes(): Promise<void> {
    const nodesToPrune = Math.floor(this.graph.nodes.size * 0.1); // Prune 10%
    
    // Sort nodes by importance
    const nodesByImportance = Array.from(this.graph.nodes.values())
      .sort((a, b) => a.importance - b.importance);
    
    // Remove least important nodes
    for (let i = 0; i < nodesToPrune; i++) {
      const node = nodesByImportance[i];
      if (node.importance < this.config.pruneThreshold!) {
        await this.removeNode(node.id);
      }
    }
    
    logger.info(`Pruned ${nodesToPrune} nodes from knowledge graph`);
  }
  
  /**
   * Prune least important edges
   */
  private async pruneEdges(): Promise<void> {
    const edgesToPrune = Math.floor(this.graph.edges.size * 0.1); // Prune 10%
    
    // Sort edges by weight
    const edgesByWeight = Array.from(this.graph.edges.values())
      .sort((a, b) => a.weight - b.weight);
    
    // Remove weakest edges
    for (let i = 0; i < edgesToPrune; i++) {
      const edge = edgesByWeight[i];
      await this.removeEdge(edge.id);
    }
    
    logger.info(`Pruned ${edgesToPrune} edges from knowledge graph`);
  }
  
  /**
   * Remove a node and its edges
   */
  async removeNode(nodeId: string): Promise<void> {
    const node = this.graph.nodes.get(nodeId);
    if (!node) return;
    
    // Remove from type index
    this.graph.nodeIndex.get(node.type)?.delete(nodeId);
    
    // Remove all edges connected to this node
    const edgesToRemove: string[] = [];
    
    // Outgoing edges
    const outgoing = this.graph.edgeIndex.get(nodeId) || new Set();
    edgesToRemove.push(...outgoing);
    
    // Incoming edges
    for (const [edgeId, edge] of this.graph.edges) {
      if (edge.target === nodeId) {
        edgesToRemove.push(edgeId);
      }
    }
    
    // Remove edges
    for (const edgeId of edgesToRemove) {
      await this.removeEdge(edgeId);
    }
    
    // Remove node
    this.graph.nodes.delete(nodeId);
  }
  
  /**
   * Remove an edge
   */
  async removeEdge(edgeId: string): Promise<void> {
    const edge = this.graph.edges.get(edgeId);
    if (!edge) return;
    
    // Remove from edge index
    this.graph.edgeIndex.get(edge.source)?.delete(edgeId);
    
    // Remove edge
    this.graph.edges.delete(edgeId);
  }
  
  /**
   * Calculate cosine similarity between embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Simple text similarity fallback
   */
  private textSimilarity(a: string, b: string): number {
    const wordsA = a.toLowerCase().split(/\s+/);
    const wordsB = b.toLowerCase().split(/\s+/);
    
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Calculate recency boost
   */
  private recencyBoost(lastAccessed: Date): number {
    const daysSince = (Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-daysSince / 30); // Exponential decay over 30 days
  }
  
  /**
   * Save graph to disk
   */
  private async saveToDisk(): Promise<void> {
    if (!this.config.persistencePath) return;
    
    try {
      const fs = await import('fs/promises');
      const data = {
        nodes: Array.from(this.graph.nodes.entries()),
        edges: Array.from(this.graph.edges.entries()),
        nodeIndex: Array.from(this.graph.nodeIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
        edgeIndex: Array.from(this.graph.edgeIndex.entries()).map(([k, v]) => [k, Array.from(v)])
      };
      
      await fs.writeFile(
        this.config.persistencePath,
        JSON.stringify(data, null, 2)
      );
      
      logger.debug('Knowledge graph saved to disk');
    } catch (error) {
      logger.error('Failed to save knowledge graph:', error);
    }
  }
  
  /**
   * Load graph from disk
   */
  private async loadFromDisk(): Promise<void> {
    if (!this.config.persistencePath) return;
    
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(this.config.persistencePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Restore nodes
      this.graph.nodes = new Map(parsed.nodes.map(([k, v]: [string, any]) => [
        k,
        {
          ...v,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt),
          lastAccessed: new Date(v.lastAccessed)
        }
      ]));
      
      // Restore edges
      this.graph.edges = new Map(parsed.edges.map(([k, v]: [string, any]) => [
        k,
        {
          ...v,
          createdAt: new Date(v.createdAt)
        }
      ]));
      
      // Restore indices
      this.graph.nodeIndex = new Map(parsed.nodeIndex.map(([k, v]: [string, string[]]) => [k, new Set(v)]));
      this.graph.edgeIndex = new Map(parsed.edgeIndex.map(([k, v]: [string, string[]]) => [k, new Set(v)]));
      
      logger.info('Knowledge graph loaded from disk');
    } catch (error) {
      logger.warn('Failed to load knowledge graph from disk:', error);
    }
  }
  
  /**
   * Get graph statistics
   */
  getStats(): Record<string, any> {
    const nodesByType = new Map<string, number>();
    for (const [type, nodes] of this.graph.nodeIndex) {
      nodesByType.set(type, nodes.size);
    }
    
    const edgesByType = new Map<string, number>();
    for (const edge of this.graph.edges.values()) {
      edgesByType.set(edge.type, (edgesByType.get(edge.type) || 0) + 1);
    }
    
    return {
      totalNodes: this.graph.nodes.size,
      totalEdges: this.graph.edges.size,
      nodesByType: Object.fromEntries(nodesByType),
      edgesByType: Object.fromEntries(edgesByType),
      averageImportance: Array.from(this.graph.nodes.values())
        .reduce((sum, node) => sum + node.importance, 0) / this.graph.nodes.size || 0
    };
  }
  
  /**
   * Export graph for visualization
   */
  exportForVisualization(): { nodes: any[]; edges: any[] } {
    const nodes = Array.from(this.graph.nodes.values()).map(node => ({
      id: node.id,
      label: node.name,
      type: node.type,
      importance: node.importance,
      group: node.type
    }));
    
    const edges = Array.from(this.graph.edges.values()).map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.type,
      weight: edge.weight
    }));
    
    return { nodes, edges };
  }
}