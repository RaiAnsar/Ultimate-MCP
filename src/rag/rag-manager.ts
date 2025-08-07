import { 
  Document, 
  DocumentChunk, 
  RAGConfig, 
  SearchResult,
  VectorStore,
  EmbeddingProvider
} from './types.js';
import { EmbeddingProviderFactory } from './embeddings.js';
import { DocumentChunker } from './chunking.js';
import { MemoryVectorStore } from './vector-stores/memory.js';
import { PostgresVectorStore } from './vector-stores/postgres.js';
import { Logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';

export class RAGManager {
  private config: RAGConfig;
  private vectorStore: VectorStore;
  private embeddingProvider: EmbeddingProvider;
  private chunker: DocumentChunker;
  private logger: Logger;
  private isInitialized = false;
  
  constructor(config: RAGConfig) {
    this.config = config;
    this.logger = new Logger('RAGManager');
    
    // Initialize embedding provider
    this.embeddingProvider = EmbeddingProviderFactory.create(config.embedding);
    
    // Initialize chunker
    this.chunker = new DocumentChunker(config.chunking);
    
    // Initialize vector store
    this.vectorStore = this.createVectorStore();
  }
  
  private createVectorStore(): VectorStore {
    switch (this.config.vectorStore.type) {
      case 'memory':
        return new MemoryVectorStore(this.embeddingProvider);
        
      case 'postgres':
        if (!this.config.vectorStore.connectionString) {
          throw new Error('PostgreSQL connection string is required');
        }
        return new PostgresVectorStore(
          this.config.vectorStore.connectionString,
          this.embeddingProvider,
          this.config.vectorStore.index
        );
        
      default:
        throw new Error(`Vector store type ${this.config.vectorStore.type} not yet implemented`);
    }
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    this.logger.info('Initializing RAG Manager...');
    
    // Initialize vector store if needed
    if ('initialize' in this.vectorStore) {
      await (this.vectorStore as any).initialize();
    }
    
    this.isInitialized = true;
    this.logger.info('RAG Manager initialized successfully');
  }
  
  // Document ingestion methods
  
  async ingestDocument(
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<Document> {
    await this.ensureInitialized();
    
    const document: Document = {
      id: uuidv4(),
      content,
      metadata: {
        ...metadata,
        timestamp: new Date(),
        source: metadata.source || 'manual'
      }
    };
    
    // Chunk the document
    const chunks = this.chunker.chunk(document);
    document.chunks = chunks;
    
    // Add to vector store
    await this.vectorStore.addDocuments([document]);
    if (chunks.length > 0) {
      await this.vectorStore.addChunks(chunks);
    }
    
    this.logger.info(`Ingested document ${document.id} with ${chunks.length} chunks`);
    return document;
  }
  
  async ingestFile(filePath: string): Promise<Document> {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    const metadata = {
      source: 'file',
      filePath,
      fileName: path.basename(filePath),
      fileType: path.extname(filePath),
      fileSize: stats.size,
      lastModified: stats.mtime
    };
    
    return this.ingestDocument(content, metadata);
  }
  
  async ingestDirectory(
    dirPath: string,
    extensions: string[] = ['.txt', '.md', '.json']
  ): Promise<Document[]> {
    const documents: Document[] = [];
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        // Recursively process subdirectories
        const subDocs = await this.ingestDirectory(fullPath, extensions);
        documents.push(...subDocs);
      } else if (file.isFile()) {
        const ext = path.extname(file.name);
        if (extensions.includes(ext)) {
          try {
            const doc = await this.ingestFile(fullPath);
            documents.push(doc);
          } catch (error) {
            this.logger.error(`Failed to ingest file ${fullPath}:`, error);
          }
        }
      }
    }
    
    this.logger.info(`Ingested ${documents.length} documents from ${dirPath}`);
    return documents;
  }
  
  async ingestUrl(url: string): Promise<Document> {
    // TODO: Implement web scraping
    throw new Error('URL ingestion not yet implemented');
  }
  
  // Search methods
  
  async search(
    query: string,
    options: {
      topK?: number;
      threshold?: number;
      filter?: Record<string, any>;
      rerank?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();
    
    const searchOptions = {
      topK: options.topK || this.config.retrieval.topK,
      threshold: options.threshold || this.config.retrieval.threshold,
      filter: options.filter,
      includeMetadata: true
    };
    
    let results = await this.vectorStore.search(query, searchOptions);
    
    // Rerank if requested
    if (options.rerank || this.config.retrieval.reranking) {
      results = await this.rerankResults(query, results);
    }
    
    return results;
  }
  
  async searchWithContext(
    query: string,
    options: {
      topK?: number;
      threshold?: number;
      filter?: Record<string, any>;
      contextWindow?: number;
    } = {}
  ): Promise<{ results: SearchResult[]; context: string }> {
    const results = await this.search(query, options);
    const contextWindow = options.contextWindow || 3;
    
    // Build context from top results
    const contextParts: string[] = [];
    const seenDocs = new Set<string>();
    
    for (const result of results.slice(0, contextWindow)) {
      if (result.metadata?.documentId && !seenDocs.has(result.metadata.documentId)) {
        seenDocs.add(result.metadata.documentId);
        contextParts.push(`[Source: ${result.metadata.source || 'Unknown'}]\n${result.content}`);
      } else if (!result.metadata?.documentId) {
        contextParts.push(result.content);
      }
    }
    
    const context = contextParts.join('\n\n---\n\n');
    
    return { results, context };
  }
  
  async generateAnswer(
    query: string,
    options: {
      topK?: number;
      contextWindow?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<{ answer: string; sources: SearchResult[] }> {
    if (!this.config.generation) {
      throw new Error('Generation config not provided');
    }
    
    // Get relevant context
    const { results, context } = await this.searchWithContext(query, options);
    
    // Generate answer using configured AI provider
    const systemPrompt = options.systemPrompt || this.config.generation.systemPrompt || 
      'You are a helpful assistant. Answer the question based on the provided context.';
    
    const prompt = `${systemPrompt}
    
Context:
${context}

Question: ${query}

Answer:`;
    
    // TODO: Integrate with AI providers
    const answer = `Based on the provided context, here's what I found about "${query}":
    
${results.length > 0 ? results[0].content.substring(0, 200) + '...' : 'No relevant information found.'}`;
    
    return { answer, sources: results };
  }
  
  // Utility methods
  
  private async rerankResults(query: string, results: SearchResult[]): Promise<SearchResult[]> {
    // Simple reranking based on metadata and content length
    // In production, use a reranking model
    return results.sort((a, b) => {
      let scoreA = a.score;
      let scoreB = b.score;
      
      // Boost documents with titles
      if (a.metadata?.title) scoreA += 0.1;
      if (b.metadata?.title) scoreB += 0.1;
      
      // Boost more recent documents
      if (a.metadata?.timestamp && b.metadata?.timestamp) {
        const timeA = new Date(a.metadata.timestamp).getTime();
        const timeB = new Date(b.metadata.timestamp).getTime();
        if (timeA > timeB) scoreA += 0.05;
        else scoreB += 0.05;
      }
      
      return scoreB - scoreA;
    });
  }
  
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
  
  async getStats(): Promise<any> {
    if ('getStats' in this.vectorStore) {
      return (this.vectorStore as any).getStats();
    }
    return { message: 'Stats not available for this vector store' };
  }
  
  async clear(): Promise<void> {
    await this.vectorStore.clear();
    this.logger.info('Vector store cleared');
  }
  
  async close(): Promise<void> {
    if ('close' in this.vectorStore) {
      await (this.vectorStore as any).close();
    }
    this.isInitialized = false;
  }
}