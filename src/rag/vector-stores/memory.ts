import { VectorStore, Document, DocumentChunk, SearchOptions, SearchResult } from '../types.js';
import { EmbeddingProvider } from '../embeddings.js';

interface VectorEntry {
  id: string;
  vector: number[];
  content: string;
  metadata: Record<string, any>;
}

export class MemoryVectorStore implements VectorStore {
  name = 'memory';
  dimension: number;
  private vectors: Map<string, VectorEntry> = new Map();
  private embeddingProvider: EmbeddingProvider;
  
  constructor(embeddingProvider: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider;
    this.dimension = embeddingProvider.dimension;
  }
  
  async addDocuments(documents: Document[]): Promise<void> {
    for (const doc of documents) {
      const embedding = doc.embedding || await this.embeddingProvider.embed(doc.content);
      
      this.vectors.set(doc.id, {
        id: doc.id,
        vector: embedding,
        content: doc.content,
        metadata: {
          ...doc.metadata,
          type: 'document'
        }
      });
    }
  }
  
  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    const embeddings = await this.embeddingProvider.embedBatch(
      chunks.map(chunk => chunk.content)
    );
    
    chunks.forEach((chunk, index) => {
      this.vectors.set(chunk.id, {
        id: chunk.id,
        vector: embeddings[index],
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          documentId: chunk.documentId,
          type: 'chunk'
        }
      });
    });
  }
  
  async search(query: string | number[], options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      topK = 10,
      threshold = 0.0,
      filter,
      includeMetadata = true,
      includeEmbeddings = false
    } = options;
    
    // Get query embedding
    const queryVector = typeof query === 'string' 
      ? await this.embeddingProvider.embed(query)
      : query;
    
    // Calculate similarities
    const results: Array<{ entry: VectorEntry; score: number }> = [];
    
    for (const entry of this.vectors.values()) {
      // Apply filters if provided
      if (filter && !this.matchesFilter(entry.metadata, filter)) {
        continue;
      }
      
      const score = this.cosineSimilarity(queryVector, entry.vector);
      
      if (score >= threshold) {
        results.push({ entry, score });
      }
    }
    
    // Sort by score (descending) and take top K
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);
    
    // Format results
    return topResults.map(({ entry, score }) => ({
      id: entry.id,
      score,
      content: entry.content,
      metadata: includeMetadata ? entry.metadata : undefined,
      embedding: includeEmbeddings ? entry.vector : undefined
    }));
  }
  
  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.vectors.delete(id);
    }
  }
  
  async clear(): Promise<void> {
    this.vectors.clear();
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return similarity;
  }
  
  private matchesFilter(metadata: Record<string, any>, filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (Array.isArray(value)) {
        if (!value.includes(metadata[key])) {
          return false;
        }
      } else if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }
  
  // Additional utility methods
  
  size(): number {
    return this.vectors.size;
  }
  
  getStats(): { count: number; dimensions: number; memoryUsage: number } {
    const count = this.vectors.size;
    const dimensions = this.dimension;
    // Rough estimate of memory usage
    const memoryUsage = count * dimensions * 4; // 4 bytes per float
    
    return { count, dimensions, memoryUsage };
  }
}