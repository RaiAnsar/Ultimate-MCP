/**
 * Cognitive Memory System Types
 * Inspired by cognee-mcp for knowledge graph and cognitive search
 */

export interface CognitiveNode {
  id: string;
  type: 'concept' | 'entity' | 'relation' | 'code' | 'document' | 'memory';
  name: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessed: Date;
  importance: number; // 0-1 score for memory pruning
}

export interface CognitiveEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  type: 'relates_to' | 'contains' | 'depends_on' | 'similar_to' | 'derived_from' | 'references';
  weight: number; // strength of relationship 0-1
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface KnowledgeGraph {
  nodes: Map<string, CognitiveNode>;
  edges: Map<string, CognitiveEdge>;
  nodeIndex: Map<string, Set<string>>; // type -> node ids
  edgeIndex: Map<string, Set<string>>; // source -> edge ids
}

export interface MemorySearchOptions {
  query: string;
  type?: CognitiveNode['type'];
  limit?: number;
  threshold?: number;
  includeRelated?: boolean;
  depth?: number; // for graph traversal
}

export interface MemoryContext {
  nodes: CognitiveNode[];
  edges: CognitiveEdge[];
  subgraph: KnowledgeGraph;
  relevanceScores: Map<string, number>;
}

export interface CognitiveMemoryConfig {
  maxNodes?: number;
  maxEdges?: number;
  pruneThreshold?: number; // importance threshold for pruning
  embeddingDimensions?: number;
  persistencePath?: string;
  autoSave?: boolean;
  autoSaveInterval?: number; // ms
}

export interface CodeAnalysisResult {
  symbols: CodeSymbol[];
  dependencies: CodeDependency[];
  complexity: number;
  patterns: CodePattern[];
}

export interface CodeSymbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'import' | 'export';
  location: {
    file: string;
    line: number;
    column: number;
  };
  signature?: string;
  docstring?: string;
}

export interface CodeDependency {
  source: string;
  target: string;
  type: 'import' | 'extends' | 'implements' | 'uses' | 'calls';
}

export interface CodePattern {
  type: string;
  description: string;
  occurrences: number;
  locations: Array<{ file: string; line: number }>;
}

export interface CognitivePersistence {
  save(graph: KnowledgeGraph): Promise<void>;
  load(): Promise<KnowledgeGraph | null>;
  backup(): Promise<void>;
  restore(backupId: string): Promise<void>;
}

export interface MemoryPruner {
  prune(graph: KnowledgeGraph, config: CognitiveMemoryConfig): Promise<KnowledgeGraph>;
  calculateImportance(node: CognitiveNode, graph: KnowledgeGraph): number;
  shouldPrune(node: CognitiveNode, config: CognitiveMemoryConfig): boolean;
}