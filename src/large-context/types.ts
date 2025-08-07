/**
 * Large Context Analysis Types (Inspired by Consult7)
 * 
 * Enables analysis of massive codebases and file collections
 * beyond typical context window limitations
 */

export interface LargeContextOptions {
  /**
   * Root directory to start file collection
   */
  rootDir: string;
  
  /**
   * Regex pattern to match files
   * Examples: 
   * - ".*\\.ts$" for TypeScript files
   * - ".*\\.(js|jsx|ts|tsx)$" for all JS/TS files
   * - ".*\\.py$" for Python files
   */
  pattern: string;
  
  /**
   * Maximum depth to traverse directories
   * -1 for unlimited
   */
  maxDepth?: number;
  
  /**
   * Exclude patterns (globs or regex)
   */
  exclude?: string[];
  
  /**
   * Include hidden files/directories
   */
  includeHidden?: boolean;
  
  /**
   * Maximum file size in MB to include
   */
  maxFileSize?: number;
  
  /**
   * Output format for the collected context
   */
  format?: 'plain' | 'structured' | 'xml' | 'json';
  
  /**
   * Include metadata about files
   */
  includeMetadata?: boolean;
  
  /**
   * Sort files by
   */
  sortBy?: 'path' | 'size' | 'modified' | 'name';
  
  /**
   * Context window size limit (in tokens)
   * Used for chunking if content exceeds limit
   */
  contextLimit?: number;
}

export interface CollectedFile {
  path: string;
  relativePath: string;
  content: string;
  size: number;
  modified: Date;
  language?: string;
  encoding?: string;
  metadata?: {
    lines: number;
    tokens?: number;
    hash?: string;
  };
}

export interface FileCollection {
  rootDir: string;
  pattern: string;
  files: CollectedFile[];
  totalSize: number;
  totalFiles: number;
  totalTokens?: number;
  collectedAt: Date;
  metadata?: {
    languages: Record<string, number>;
    directories: string[];
    largestFile?: string;
    oldestFile?: string;
    newestFile?: string;
  };
}

export interface ContextChunk {
  id: string;
  index: number;
  files: CollectedFile[];
  tokenCount: number;
  fileCount: number;
  summary?: string;
}

export interface LargeContextAnalysisRequest {
  /**
   * The file collection to analyze
   */
  collection: FileCollection;
  
  /**
   * The analysis query/prompt
   */
  query: string;
  
  /**
   * Model to use for analysis
   * Defaults to model with largest context window
   */
  model?: string;
  
  /**
   * Analysis strategy
   */
  strategy?: 'single-shot' | 'chunked' | 'hierarchical' | 'map-reduce';
  
  /**
   * Additional context or instructions
   */
  systemPrompt?: string;
  
  /**
   * Temperature for model
   */
  temperature?: number;
  
  /**
   * Whether to include thinking/reasoning
   */
  includeReasoning?: boolean;
  
  /**
   * Output format
   */
  outputFormat?: 'text' | 'json' | 'markdown';
}

export interface LargeContextAnalysisResult {
  query: string;
  model: string;
  strategy: string;
  filesAnalyzed: number;
  tokensProcessed: number;
  chunks?: number;
  result: any;
  reasoning?: string;
  metadata?: {
    duration: number;
    cost?: number;
    modelCalls: number;
  };
}

export interface DirectoryTree {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryTree[];
  size?: number;
  extension?: string;
  language?: string;
}

export interface ProjectSummary {
  structure: DirectoryTree;
  statistics: {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
    fileTypes: Record<string, number>;
    languages: Record<string, number>;
  };
  analysis?: {
    architecture?: string;
    mainComponents?: string[];
    dependencies?: string[];
    entryPoints?: string[];
    testCoverage?: number;
  };
}

export interface LargeContextModel {
  name: string;
  provider: 'openrouter' | 'openai' | 'google' | 'anthropic';
  contextWindow: number;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  features: {
    reasoning?: boolean;
    vision?: boolean;
    functionCalling?: boolean;
    streaming?: boolean;
  };
}

export const LARGE_CONTEXT_MODELS: LargeContextModel[] = [
  {
    name: 'google/gemini-2.5-flash',
    provider: 'google',
    contextWindow: 1048576, // 1M tokens
    costPer1kTokens: {
      input: 0.00015,
      output: 0.0006
    },
    features: {
      reasoning: true,
      vision: true,
      functionCalling: true,
      streaming: true
    }
  },
  {
    name: 'google/gemini-2.5-pro',
    provider: 'google',
    contextWindow: 2097152, // 2M tokens
    costPer1kTokens: {
      input: 0.0015,
      output: 0.006
    },
    features: {
      reasoning: true,
      vision: true,
      functionCalling: true,
      streaming: true
    }
  },
  {
    name: 'anthropic/claude-3-opus',
    provider: 'anthropic',
    contextWindow: 200000,
    costPer1kTokens: {
      input: 0.015,
      output: 0.075
    },
    features: {
      reasoning: true,
      vision: true,
      functionCalling: true,
      streaming: true
    }
  },
  {
    name: 'openai/gpt-4-128k',
    provider: 'openai',
    contextWindow: 128000,
    costPer1kTokens: {
      input: 0.01,
      output: 0.03
    },
    features: {
      reasoning: true,
      vision: true,
      functionCalling: true,
      streaming: true
    }
  },
  {
    name: 'qwen/qwen-2.5-72b-turbo',
    provider: 'openrouter',
    contextWindow: 128000,
    costPer1kTokens: {
      input: 0.0005,
      output: 0.0015
    },
    features: {
      reasoning: true,
      functionCalling: true,
      streaming: true
    }
  }
];

export interface AnalysisStrategy {
  name: string;
  description: string;
  maxContextSize: number;
  process: (
    collection: FileCollection,
    query: string,
    model: string
  ) => Promise<LargeContextAnalysisResult>;
}