/**
 * Large Context Analyzer (Inspired by Consult7)
 * 
 * Analyzes massive codebases and file collections using
 * large context window models like Google Gemini 2.5 Flash/Pro
 */

import { FileCollector } from './file-collector.js';
import {
  LargeContextOptions,
  FileCollection,
  LargeContextAnalysisRequest,
  LargeContextAnalysisResult,
  LARGE_CONTEXT_MODELS,
  LargeContextModel,
  ContextChunk
} from './types.js';
import { callModel } from '../utils/model-caller.js';

export class LargeContextAnalyzer {
  private fileCollector: FileCollector;
  private readonly cache = new Map<string, LargeContextAnalysisResult>();
  
  constructor() {
    this.fileCollector = new FileCollector();
  }
  
  /**
   * Analyze large file collections with AI
   */
  async analyze(request: LargeContextAnalysisRequest): Promise<LargeContextAnalysisResult> {
    const startTime = Date.now();
    
    // Select best model for the task
    const model = this.selectModel(request);
    
    // Choose strategy based on collection size
    const strategy = request.strategy || this.selectStrategy(request.collection, model);
    
    let result: any;
    let reasoning: string | undefined;
    let chunks: number | undefined;
    
    switch (strategy) {
      case 'single-shot':
        ({ result, reasoning } = await this.singleShotAnalysis(request, model));
        break;
        
      case 'chunked':
        ({ result, reasoning, chunks } = await this.chunkedAnalysis(request, model));
        break;
        
      case 'hierarchical':
        ({ result, reasoning, chunks } = await this.hierarchicalAnalysis(request, model));
        break;
        
      case 'map-reduce':
        ({ result, reasoning, chunks } = await this.mapReduceAnalysis(request, model));
        break;
        
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
    
    const duration = Date.now() - startTime;
    
    return {
      query: request.query,
      model: model.name,
      strategy,
      filesAnalyzed: request.collection.totalFiles,
      tokensProcessed: request.collection.totalTokens || 0,
      chunks,
      result,
      reasoning: request.includeReasoning ? reasoning : undefined,
      metadata: {
        duration,
        cost: this.estimateCost(request.collection, model),
        modelCalls: chunks || 1
      }
    };
  }
  
  /**
   * Collect and analyze files in one operation
   */
  async collectAndAnalyze(
    options: LargeContextOptions,
    query: string,
    analysisOptions?: Partial<LargeContextAnalysisRequest>
  ): Promise<LargeContextAnalysisResult> {
    // Collect files
    const collection = await this.fileCollector.collect(options);
    
    // Create analysis request
    const request: LargeContextAnalysisRequest = {
      collection,
      query,
      ...analysisOptions
    };
    
    return this.analyze(request);
  }
  
  /**
   * Single-shot analysis - send all content in one request
   */
  private async singleShotAnalysis(
    request: LargeContextAnalysisRequest,
    model: LargeContextModel
  ): Promise<{ result: any; reasoning?: string }> {
    // Format collection as context
    const context = this.fileCollector.formatAsContext(
      request.collection,
      request.outputFormat === 'json' ? 'json' : 'structured'
    );
    
    // Build prompt
    const prompt = this.buildPrompt(request, context);
    
    // Call model
    const response = await callModel(model.name, {
      messages: [
        {
          role: 'system',
          content: request.systemPrompt || 'You are a code analysis expert. Analyze the provided codebase and answer questions accurately.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: request.temperature || 0.1,
      max_tokens: Math.min(100000, model.contextWindow / 4) // Leave room for output
    });
    
    // Parse response
    return this.parseResponse(response, request.outputFormat);
  }
  
  /**
   * Chunked analysis - split into chunks and analyze separately
   */
  private async chunkedAnalysis(
    request: LargeContextAnalysisRequest,
    model: LargeContextModel
  ): Promise<{ result: any; reasoning?: string; chunks: number }> {
    // Split collection into chunks
    const chunks = this.createChunks(request.collection, model.contextWindow);
    
    // Analyze each chunk
    const chunkResults = await Promise.all(
      chunks.map(chunk => this.analyzeChunk(chunk, request, model))
    );
    
    // Combine results
    const combinedResult = await this.combineChunkResults(
      chunkResults,
      request,
      model
    );
    
    return {
      ...combinedResult,
      chunks: chunks.length
    };
  }
  
  /**
   * Hierarchical analysis - analyze in levels
   */
  private async hierarchicalAnalysis(
    request: LargeContextAnalysisRequest,
    model: LargeContextModel
  ): Promise<{ result: any; reasoning?: string; chunks: number }> {
    // Level 1: Analyze file summaries
    const summaries = await this.generateFileSummaries(
      request.collection,
      model
    );
    
    // Level 2: Analyze directory-level patterns
    const directoryAnalysis = await this.analyzeDirectories(
      summaries,
      request,
      model
    );
    
    // Level 3: Final synthesis
    const finalResult = await this.synthesizeHierarchical(
      directoryAnalysis,
      request,
      model
    );
    
    return {
      ...finalResult,
      chunks: summaries.length + directoryAnalysis.length + 1
    };
  }
  
  /**
   * Map-reduce analysis - map over files, reduce results
   */
  private async mapReduceAnalysis(
    request: LargeContextAnalysisRequest,
    model: LargeContextModel
  ): Promise<{ result: any; reasoning?: string; chunks: number }> {
    // Map phase: analyze each file
    const mappedResults = await Promise.all(
      request.collection.files.map(file => 
        this.mapFile(file, request, model)
      )
    );
    
    // Reduce phase: combine results
    const reducedResult = await this.reduceResults(
      mappedResults,
      request,
      model
    );
    
    return {
      ...reducedResult,
      chunks: request.collection.files.length + 1
    };
  }
  
  /**
   * Select best model for the task
   */
  private selectModel(request: LargeContextAnalysisRequest): LargeContextModel {
    if (request.model) {
      const model = LARGE_CONTEXT_MODELS.find(m => m.name === request.model);
      if (model) return model;
    }
    
    // Calculate required context size
    const requiredContext = request.collection.totalTokens || 0;
    
    // Find models that can handle the context
    const capableModels = LARGE_CONTEXT_MODELS.filter(
      (m: any) => m.contextWindow >= requiredContext * 1.2 // 20% buffer
    );
    
    if (capableModels.length === 0) {
      // Return model with largest context window
      return LARGE_CONTEXT_MODELS.reduce((a: any, b: any) => 
        a.contextWindow > b.contextWindow ? a : b
      );
    }
    
    // Sort by cost efficiency (context per dollar)
    return capableModels.sort((a: any, b: any) => {
      const costA = a.costPer1kTokens.input + a.costPer1kTokens.output;
      const costB = b.costPer1kTokens.input + b.costPer1kTokens.output;
      return costA - costB;
    })[0];
  }
  
  /**
   * Select analysis strategy based on collection size
   */
  private selectStrategy(
    collection: FileCollection,
    model: LargeContextModel
  ): LargeContextAnalysisRequest['strategy'] {
    const totalTokens = collection.totalTokens || 0;
    const contextWindow = model.contextWindow;
    
    // Single-shot if it fits comfortably
    if (totalTokens < contextWindow * 0.7) {
      return 'single-shot';
    }
    
    // Chunked for medium collections
    if (totalTokens < contextWindow * 5) {
      return 'chunked';
    }
    
    // Hierarchical for large collections with structure
    if (collection.metadata?.directories && collection.metadata.directories.length > 10) {
      return 'hierarchical';
    }
    
    // Map-reduce for very large collections
    return 'map-reduce';
  }
  
  /**
   * Build analysis prompt
   */
  private buildPrompt(
    request: LargeContextAnalysisRequest,
    context: string
  ): string {
    let prompt = `Analyze the following codebase and answer this query: ${request.query}\n\n`;
    
    if (request.outputFormat === 'json') {
      prompt += 'Provide your response in valid JSON format.\n\n';
    } else if (request.outputFormat === 'markdown') {
      prompt += 'Format your response using Markdown.\n\n';
    }
    
    prompt += 'Codebase Context:\n\n';
    prompt += context;
    
    return prompt;
  }
  
  /**
   * Parse model response
   */
  private parseResponse(
    response: string,
    format?: string
  ): { result: any; reasoning?: string } {
    if (format === 'json') {
      try {
        return { result: JSON.parse(response) };
      } catch {
        return { result: response };
      }
    }
    
    // Extract reasoning if present
    const reasoningMatch = response.match(/<reasoning>(.*?)<\/reasoning>/s);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : undefined;
    
    // Extract result
    const resultMatch = response.match(/<result>(.*?)<\/result>/s);
    const result = resultMatch ? resultMatch[1].trim() : response;
    
    return { result, reasoning };
  }
  
  /**
   * Create chunks from file collection
   */
  private createChunks(
    collection: FileCollection,
    contextWindow: number
  ): ContextChunk[] {
    const chunks: ContextChunk[] = [];
    const targetChunkSize = Math.floor(contextWindow * 0.7); // 70% of context window
    
    let currentChunk: ContextChunk = {
      id: 'chunk-0',
      index: 0,
      files: [],
      tokenCount: 0,
      fileCount: 0
    };
    
    for (const file of collection.files) {
      const fileTokens = file.metadata?.tokens || 0;
      
      // Start new chunk if adding this file would exceed limit
      if (currentChunk.tokenCount + fileTokens > targetChunkSize && currentChunk.files.length > 0) {
        chunks.push(currentChunk);
        currentChunk = {
          id: `chunk-${chunks.length}`,
          index: chunks.length,
          files: [],
          tokenCount: 0,
          fileCount: 0
        };
      }
      
      currentChunk.files.push(file);
      currentChunk.tokenCount += fileTokens;
      currentChunk.fileCount++;
    }
    
    // Add final chunk
    if (currentChunk.files.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
  
  /**
   * Analyze a single chunk
   */
  private async analyzeChunk(
    chunk: ContextChunk,
    request: LargeContextAnalysisRequest,
    model: LargeContextModel
  ): Promise<any> {
    const chunkCollection: FileCollection = {
      ...request.collection,
      files: chunk.files,
      totalFiles: chunk.fileCount,
      totalTokens: chunk.tokenCount
    };
    
    const context = this.fileCollector.formatAsContext(chunkCollection, 'structured');
    const prompt = `Analyze this portion of the codebase (chunk ${chunk.index + 1}) for: ${request.query}\n\n${context}`;
    
    const response = await callModel(model.name, {
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: request.temperature || 0.1
    });
    
    return response;
  }
  
  /**
   * Combine results from multiple chunks
   */
  private async combineChunkResults(
    chunkResults: any[],
    request: LargeContextAnalysisRequest,
    model: LargeContextModel
  ): Promise<{ result: any; reasoning?: string }> {
    const combinationPrompt = `
Combine the following analysis results from different parts of the codebase to answer: ${request.query}

${chunkResults.map((r, i) => `Chunk ${i + 1} Analysis:\n${r}`).join('\n\n')}

Provide a comprehensive answer that synthesizes insights from all chunks.`;

    const response = await callModel(model.name, {
      messages: [
        {
          role: 'user',
          content: combinationPrompt
        }
      ],
      temperature: request.temperature || 0.1
    });
    
    return this.parseResponse(response, request.outputFormat);
  }
  
  /**
   * Generate file summaries for hierarchical analysis
   */
  private async generateFileSummaries(
    collection: FileCollection,
    model: LargeContextModel
  ): Promise<any[]> {
    const summaries = await Promise.all(
      collection.files.map(async file => {
        const response = await callModel(model.name, {
          messages: [
            {
              role: 'user',
              content: `Summarize this file: ${file.relativePath}\n\n${file.content.slice(0, 5000)}`
            }
          ],
          temperature: 0.1,
          max_tokens: 500
        });
        
        return {
          file: file.relativePath,
          summary: response
        };
      })
    );
    
    return summaries;
  }
  
  /**
   * Analyze directories for hierarchical analysis
   */
  private async analyzeDirectories(
    summaries: any[],
    request: LargeContextAnalysisRequest,
    model: LargeContextModel
  ): Promise<any[]> {
    // Group summaries by directory
    const byDirectory = new Map<string, any[]>();
    
    for (const summary of summaries) {
      const dir = summary.file.split('/').slice(0, -1).join('/') || 'root';
      if (!byDirectory.has(dir)) {
        byDirectory.set(dir, []);
      }
      byDirectory.get(dir)!.push(summary);
    }
    
    // Analyze each directory
    const directoryAnalyses = await Promise.all(
      Array.from(byDirectory.entries()).map(async ([dir, files]) => {
        const prompt = `
Analyze this directory in context of: ${request.query}

Directory: ${dir}
Files: ${files.map(f => f.file).join(', ')}

File Summaries:
${files.map(f => `${f.file}:\n${f.summary}`).join('\n\n')}`;

        const response = await callModel(model.name, {
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1
        });
        
        return {
          directory: dir,
          analysis: response
        };
      })
    );
    
    return directoryAnalyses;
  }
  
  /**
   * Final synthesis for hierarchical analysis
   */
  private async synthesizeHierarchical(
    directoryAnalyses: any[],
    request: LargeContextAnalysisRequest,
    model: LargeContextModel
  ): Promise<{ result: any; reasoning?: string }> {
    const synthesisPrompt = `
Synthesize the following directory-level analyses to answer: ${request.query}

${directoryAnalyses.map(d => `${d.directory}:\n${d.analysis}`).join('\n\n')}

Provide a comprehensive answer that captures the overall architecture and patterns.`;

    const response = await callModel(model.name, {
      messages: [
        {
          role: 'user',
          content: synthesisPrompt
        }
      ],
      temperature: request.temperature || 0.1
    });
    
    return this.parseResponse(response, request.outputFormat);
  }
  
  /**
   * Map function for map-reduce analysis
   */
  private async mapFile(
    file: any,
    request: LargeContextAnalysisRequest,
    model: LargeContextModel
  ): Promise<any> {
    const prompt = `
Analyze this file in context of: ${request.query}

File: ${file.relativePath}
Content:
${file.content}

Provide key insights relevant to the query.`;

    const response = await callModel(model.name, {
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });
    
    return {
      file: file.relativePath,
      insights: response
    };
  }
  
  /**
   * Reduce function for map-reduce analysis
   */
  private async reduceResults(
    mappedResults: any[],
    request: LargeContextAnalysisRequest,
    model: LargeContextModel
  ): Promise<{ result: any; reasoning?: string }> {
    const reducePrompt = `
Combine these file-level insights to answer: ${request.query}

${mappedResults.map(r => `${r.file}:\n${r.insights}`).join('\n\n')}

Synthesize a comprehensive answer from all file insights.`;

    const response = await callModel(model.name, {
      messages: [
        {
          role: 'user',
          content: reducePrompt
        }
      ],
      temperature: request.temperature || 0.1
    });
    
    return this.parseResponse(response, request.outputFormat);
  }
  
  /**
   * Estimate analysis cost
   */
  private estimateCost(
    collection: FileCollection,
    model: LargeContextModel
  ): number {
    const totalTokens = collection.totalTokens || 0;
    const inputCost = (totalTokens / 1000) * model.costPer1kTokens.input;
    const estimatedOutputTokens = Math.min(totalTokens * 0.2, 10000); // Estimate 20% output
    const outputCost = (estimatedOutputTokens / 1000) * model.costPer1kTokens.output;
    
    return inputCost + outputCost;
  }
}