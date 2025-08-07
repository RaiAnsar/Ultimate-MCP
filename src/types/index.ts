// Core types for Ultimate MCP Server
export interface ServerCapabilities {
  tools: boolean;
  resources: boolean;
  prompts: boolean;
  logging: boolean;
}

export interface AIProvider {
  name: string;
  models: ModelConfig[];
  apiKey?: string;
  baseURL?: string;
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
  completeWithContext(messages: Message[], options?: CompletionOptions): Promise<string>;
  stream?(messages: Message[], options?: CompletionOptions): AsyncGenerator<string>;
}

export interface ModelConfig {
  id: string;
  name: string;
  contextLength: number;
  pricing: {
    input: number;
    output: number;
  };
  capabilities: string[];
  provider: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
  systemPrompt?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export enum OrchestrationStrategy {
  Sequential = "sequential",    // Chain of thought refinement
  Parallel = "parallel",        // Multiple models answer independently
  Debate = "debate",           // Models discuss and refine
  Consensus = "consensus",     // Models reach agreement
  Specialist = "specialist",   // Route to best model for task
  Hierarchical = "hierarchical", // Tree-based reasoning
  Mixture = "mixture"          // Mixture of experts
}

export interface OrchestrationRequest {
  prompt: string;
  strategy: OrchestrationStrategy;
  models?: string[];
  options?: OrchestrationOptions;
  context?: Message[];
  tools?: string[];
}

export interface OrchestrationOptions {
  maxRounds?: number;
  temperature?: number;
  includeReasoning?: boolean;
  requireConsensus?: boolean;
  evaluationCriteria?: string[];
  parallelism?: number;
  useThinking?: boolean;
  thinkingModel?: string;
  thinkingTokens?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: any) => Promise<any>;
  tags?: string[];
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: () => Promise<any>;
  tags?: string[];
}

export interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
  handler: (args: Record<string, any>) => Promise<PromptResult>;
  tags?: string[];
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
  type?: string;
  default?: any;
}

export interface PromptResult {
  messages: Message[];
  metadata?: Record<string, unknown>;
}

export interface DebugOptions {
  level: 'info' | 'warn' | 'error' | 'debug';
  includeStackTrace?: boolean;
  includeContext?: boolean;
  format?: 'json' | 'text';
}

export interface EvaluationCriteria {
  name: string;
  description: string;
  scorer: (response: string, context?: any) => Promise<number>;
  weight?: number;
}

export interface WorkflowStep {
  id: string;
  type: 'tool' | 'prompt' | 'condition' | 'loop' | 'parallel';
  config: any;
  next?: string | string[];
  errorHandler?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  timeout?: number;
}

// Advanced debugging types
export interface DebugSession {
  id: string;
  startTime: Date;
  context: Record<string, unknown>;
  logs: DebugLog[];
  metrics: DebugMetrics;
}

export interface DebugLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  stackTrace?: string;
}

export interface DebugMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

// JSON-RPC types for transport layers
export interface JSONRPCRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id: string | number;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}