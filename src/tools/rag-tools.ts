import { z } from 'zod';
import { ToolDefinition } from '../types/index.js';
import { RAGManager } from '../rag/rag-manager.js';
import { RAGConfig, ChunkingStrategy } from '../rag/types.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('RAGTools');

// Global RAG manager instance
let ragManager: RAGManager | null = null;

// Initialize RAG with configuration
export async function initializeRAG(config?: Partial<RAGConfig>): Promise<void> {
  const defaultConfig: RAGConfig = {
    vectorStore: {
      type: 'memory'
    },
    embedding: {
      provider: 'local',
      model: 'simple-hash'
    },
    chunking: {
      type: 'semantic',
      chunkSize: 1000,
      chunkOverlap: 200
    },
    retrieval: {
      topK: 10,
      threshold: 0.7,
      reranking: true
    }
  };
  
  // Merge with environment-based config
  if (process.env.OPENAI_API_KEY) {
    defaultConfig.embedding = {
      provider: 'openai',
      model: 'text-embedding-3-small',
      apiKey: process.env.OPENAI_API_KEY
    };
  }
  
  if (process.env.POSTGRES_CONNECTION) {
    defaultConfig.vectorStore = {
      type: 'postgres',
      connectionString: process.env.POSTGRES_CONNECTION,
      index: 'rag_embeddings'
    };
  }
  
  const finalConfig = { ...defaultConfig, ...config };
  ragManager = new RAGManager(finalConfig as RAGConfig);
  await ragManager.initialize();
  
  logger.info('RAG system initialized');
}

// RAG Tool Definitions

export const ragIngestDocument: ToolDefinition = {
  name: 'rag_ingest_document',
  description: 'Ingest a document into the RAG system for semantic search',
  inputSchema: z.object({
    content: z.string().describe('The document content to ingest'),
    metadata: z.record(z.any()).optional().describe('Optional metadata for the document'),
    title: z.string().optional().describe('Document title'),
    source: z.string().optional().describe('Document source'),
    tags: z.array(z.string()).optional().describe('Tags for filtering')
  }).strict(),
  handler: async (args) => {
    if (!ragManager) {
      await initializeRAG();
    }
    
    const metadata = {
      ...args.metadata,
      title: args.title,
      source: args.source,
      tags: args.tags
    };
    
    const document = await ragManager!.ingestDocument(args.content, metadata);
    
    return {
      documentId: document.id,
      chunksCreated: document.chunks?.length || 0,
      message: `Document ingested successfully with ${document.chunks?.length || 0} chunks`
    };
  }
};

export const ragIngestFile: ToolDefinition = {
  name: 'rag_ingest_file',
  description: 'Ingest a file into the RAG system',
  inputSchema: z.object({
    filePath: z.string().describe('Path to the file to ingest'),
    metadata: z.record(z.any()).optional().describe('Additional metadata')
  }).strict(),
  handler: async (args) => {
    if (!ragManager) {
      await initializeRAG();
    }
    
    const document = await ragManager!.ingestFile(args.filePath);
    
    return {
      documentId: document.id,
      fileName: document.metadata.fileName,
      chunksCreated: document.chunks?.length || 0,
      message: `File ingested successfully`
    };
  }
};

export const ragIngestDirectory: ToolDefinition = {
  name: 'rag_ingest_directory',
  description: 'Ingest all files in a directory into the RAG system',
  inputSchema: z.object({
    directoryPath: z.string().describe('Path to the directory'),
    extensions: z.array(z.string()).optional()
      .describe('File extensions to include (default: .txt, .md, .json)'),
    recursive: z.boolean().optional().default(true)
      .describe('Process subdirectories recursively')
  }).strict(),
  handler: async (args) => {
    if (!ragManager) {
      await initializeRAG();
    }
    
    const documents = await ragManager!.ingestDirectory(
      args.directoryPath,
      args.extensions
    );
    
    const totalChunks = documents.reduce(
      (sum, doc) => sum + (doc.chunks?.length || 0), 
      0
    );
    
    return {
      documentsIngested: documents.length,
      totalChunks,
      files: documents.map(doc => ({
        id: doc.id,
        fileName: doc.metadata.fileName,
        chunks: doc.chunks?.length || 0
      })),
      message: `Ingested ${documents.length} documents with ${totalChunks} total chunks`
    };
  }
};

export const ragSearch: ToolDefinition = {
  name: 'rag_search',
  description: 'Search for relevant documents using semantic search',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    topK: z.number().optional().default(10).describe('Number of results to return'),
    threshold: z.number().optional().default(0.7).describe('Minimum similarity score'),
    filter: z.record(z.any()).optional().describe('Metadata filters'),
    includeContent: z.boolean().optional().default(true)
      .describe('Include full content in results')
  }).strict(),
  handler: async (args) => {
    if (!ragManager) {
      await initializeRAG();
    }
    
    const results = await ragManager!.search(args.query, {
      topK: args.topK,
      threshold: args.threshold,
      filter: args.filter
    });
    
    return {
      query: args.query,
      results: results.map(result => ({
        id: result.id,
        score: result.score,
        content: args.includeContent ? result.content : result.content.substring(0, 200) + '...',
        metadata: result.metadata
      })),
      totalResults: results.length
    };
  }
};

export const ragQuery: ToolDefinition = {
  name: 'rag_query',
  description: 'Query the RAG system and get an AI-generated answer with sources',
  inputSchema: z.object({
    query: z.string().describe('Question to answer'),
    topK: z.number().optional().default(5).describe('Number of sources to consider'),
    contextWindow: z.number().optional().default(3)
      .describe('Number of top results to use for context'),
    systemPrompt: z.string().optional()
      .describe('Custom system prompt for answer generation')
  }).strict(),
  handler: async (args) => {
    if (!ragManager) {
      await initializeRAG();
    }
    
    const { answer, sources } = await ragManager!.generateAnswer(args.query, {
      topK: args.topK,
      contextWindow: args.contextWindow,
      systemPrompt: args.systemPrompt
    });
    
    return {
      query: args.query,
      answer,
      sources: sources.map(source => ({
        id: source.id,
        score: source.score,
        content: source.content.substring(0, 200) + '...',
        metadata: source.metadata
      })),
      sourcesUsed: sources.length
    };
  }
};

export const ragStats: ToolDefinition = {
  name: 'rag_stats',
  description: 'Get statistics about the RAG system',
  inputSchema: z.object({}).strict(),
  handler: async () => {
    if (!ragManager) {
      await initializeRAG();
    }
    
    const stats = await ragManager!.getStats();
    
    return {
      stats,
      message: 'RAG system statistics retrieved'
    };
  }
};

export const ragClear: ToolDefinition = {
  name: 'rag_clear',
  description: 'Clear all documents from the RAG system',
  inputSchema: z.object({
    confirm: z.boolean().describe('Confirm clearing all documents')
  }).strict(),
  handler: async (args) => {
    if (!args.confirm) {
      return {
        error: 'Please confirm clearing all documents by setting confirm to true'
      };
    }
    
    if (!ragManager) {
      await initializeRAG();
    }
    
    await ragManager!.clear();
    
    return {
      message: 'All documents cleared from RAG system'
    };
  }
};

export const ragConfigure: ToolDefinition = {
  name: 'rag_configure',
  description: 'Configure or reconfigure the RAG system',
  inputSchema: z.object({
    vectorStore: z.object({
      type: z.enum(['memory', 'postgres']).optional(),
      connectionString: z.string().optional(),
      index: z.string().optional()
    }).optional(),
    embedding: z.object({
      provider: z.enum(['openai', 'cohere', 'local']).optional(),
      model: z.string().optional(),
      apiKey: z.string().optional()
    }).optional(),
    chunking: z.object({
      type: z.enum(['fixed', 'sentence', 'paragraph', 'semantic']).optional(),
      chunkSize: z.number().optional(),
      chunkOverlap: z.number().optional()
    }).optional(),
    retrieval: z.object({
      topK: z.number().optional(),
      threshold: z.number().optional(),
      reranking: z.boolean().optional()
    }).optional()
  }).strict(),
  handler: async (args) => {
    // Close existing manager if any
    if (ragManager) {
      await ragManager.close();
    }
    
    // Initialize with new config
    await initializeRAG(args as Partial<RAGConfig>);
    
    return {
      message: 'RAG system reconfigured successfully',
      config: args
    };
  }
};

// Export all RAG tools
export const ragTools: ToolDefinition[] = [
  ragIngestDocument,
  ragIngestFile,
  ragIngestDirectory,
  ragSearch,
  ragQuery,
  ragStats,
  ragClear,
  ragConfigure
];