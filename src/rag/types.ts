// RAG (Retrieval-Augmented Generation) types

export interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;
    title?: string;
    type?: string;
    timestamp?: Date;
    tags?: string[];
    [key: string]: any;
  };
  embedding?: number[];
  chunks?: DocumentChunk[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  startIndex: number;
  endIndex: number;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface VectorStore {
  name: string;
  dimension: number;
  addDocuments(documents: Document[]): Promise<void>;
  addChunks(chunks: DocumentChunk[]): Promise<void>;
  search(query: string | number[], options?: SearchOptions): Promise<SearchResult[]>;
  delete(ids: string[]): Promise<void>;
  clear(): Promise<void>;
}

export interface SearchOptions {
  topK?: number;
  threshold?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeEmbeddings?: boolean;
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface EmbeddingProvider {
  name: string;
  model: string;
  dimension: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface ChunkingStrategy {
  type: 'fixed' | 'sentence' | 'paragraph' | 'semantic';
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export interface RAGConfig {
  vectorStore: VectorStoreConfig;
  embedding: EmbeddingConfig;
  chunking: ChunkingStrategy;
  retrieval: RetrievalConfig;
  generation?: GenerationConfig;
}

export interface VectorStoreConfig {
  type: 'memory' | 'postgres' | 'pinecone' | 'weaviate' | 'chroma';
  connectionString?: string;
  apiKey?: string;
  index?: string;
  namespace?: string;
}

export interface EmbeddingConfig {
  provider: 'openai' | 'cohere' | 'local' | 'custom';
  model: string;
  apiKey?: string;
  dimension?: number;
}

export interface RetrievalConfig {
  topK: number;
  threshold: number;
  reranking?: boolean;
  hybridSearch?: boolean;
}

export interface GenerationConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}