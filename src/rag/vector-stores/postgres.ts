import { VectorStore, Document, DocumentChunk, SearchOptions, SearchResult } from '../types.js';
import { EmbeddingProvider } from '../embeddings.js';
import postgres from 'postgres';

export class PostgresVectorStore implements VectorStore {
  name = 'postgres';
  dimension: number;
  private sql: postgres.Sql;
  private embeddingProvider: EmbeddingProvider;
  private tableName: string;
  
  constructor(
    connectionString: string,
    embeddingProvider: EmbeddingProvider,
    tableName = 'embeddings'
  ) {
    this.sql = postgres(connectionString);
    this.embeddingProvider = embeddingProvider;
    this.dimension = embeddingProvider.dimension;
    this.tableName = tableName;
  }
  
  async initialize(): Promise<void> {
    // Create pgvector extension if not exists
    await this.sql`CREATE EXTENSION IF NOT EXISTS vector`;
    
    // Create embeddings table
    await this.sql`
      CREATE TABLE IF NOT EXISTS ${this.sql(this.tableName)} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(${this.dimension}),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Create index for vector similarity search
    await this.sql`
      CREATE INDEX IF NOT EXISTS ${this.sql(`${this.tableName}_embedding_idx`)}
      ON ${this.sql(this.tableName)}
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `;
  }
  
  async addDocuments(documents: Document[]): Promise<void> {
    const embeddings = await this.embeddingProvider.embedBatch(
      documents.map(doc => doc.content)
    );
    
    const values = documents.map((doc, index) => ({
      id: doc.id,
      content: doc.content,
      embedding: JSON.stringify(embeddings[index]),
      metadata: { ...doc.metadata, type: 'document' }
    }));
    
    await this.sql`
      INSERT INTO ${this.sql(this.tableName)} ${this.sql(values, 'id', 'content', 'embedding', 'metadata')}
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata
    `;
  }
  
  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    const embeddings = await this.embeddingProvider.embedBatch(
      chunks.map(chunk => chunk.content)
    );
    
    const values = chunks.map((chunk, index) => ({
      id: chunk.id,
      content: chunk.content,
      embedding: JSON.stringify(embeddings[index]),
      metadata: {
        ...chunk.metadata,
        documentId: chunk.documentId,
        type: 'chunk'
      }
    }));
    
    await this.sql`
      INSERT INTO ${this.sql(this.tableName)} ${this.sql(values, 'id', 'content', 'embedding', 'metadata')}
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata
    `;
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
    
    // Build filter conditions
    let filterConditions = this.sql`TRUE`;
    if (filter) {
      const conditions = Object.entries(filter).map(([key, value]) => {
        if (Array.isArray(value)) {
          return this.sql`metadata->>${key} = ANY(${value})`;
        } else {
          return this.sql`metadata->>${key} = ${value}`;
        }
      });
      
      if (conditions.length > 0) {
        filterConditions = this.sql`${conditions.reduce((acc, cond) => 
          this.sql`${acc} AND ${cond}`
        )}`;
      }
    }
    
    // Perform similarity search
    const results = await this.sql`
      SELECT
        id,
        content,
        1 - (embedding <=> ${JSON.stringify(queryVector)}::vector) as score,
        ${includeMetadata ? this.sql`metadata` : this.sql`NULL as metadata`},
        ${includeEmbeddings ? this.sql`embedding` : this.sql`NULL as embedding`}
      FROM ${this.sql(this.tableName)}
      WHERE ${filterConditions}
        AND 1 - (embedding <=> ${JSON.stringify(queryVector)}::vector) >= ${threshold}
      ORDER BY embedding <=> ${JSON.stringify(queryVector)}::vector
      LIMIT ${topK}
    `;
    
    return results.map(row => ({
      id: row.id,
      score: row.score,
      content: row.content,
      metadata: row.metadata,
      embedding: row.embedding ? Array.from(row.embedding) : undefined
    }));
  }
  
  async delete(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    
    await this.sql`
      DELETE FROM ${this.sql(this.tableName)}
      WHERE id = ANY(${ids})
    `;
  }
  
  async clear(): Promise<void> {
    await this.sql`TRUNCATE TABLE ${this.sql(this.tableName)}`;
  }
  
  async close(): Promise<void> {
    await this.sql.end();
  }
  
  // Utility methods
  
  async getStats(): Promise<{ count: number; dimensions: number; tableSize: string }> {
    const [{ count }] = await this.sql`
      SELECT COUNT(*) as count FROM ${this.sql(this.tableName)}
    `;
    
    const [{ size }] = await this.sql`
      SELECT pg_size_pretty(pg_total_relation_size(${this.tableName})) as size
    `;
    
    return {
      count: parseInt(count),
      dimensions: this.dimension,
      tableSize: size
    };
  }
  
  async vacuum(): Promise<void> {
    // Maintenance: re-index for better performance
    await this.sql`REINDEX INDEX ${this.sql(`${this.tableName}_embedding_idx`)}`;
  }
}