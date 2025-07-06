import { z } from "zod";
import { ToolDefinition } from "../types/index.js";
import { FileCollector } from "../utils/file-collector.js";
import { AIOrchestrator } from "../providers/orchestrator.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("CodebaseTools");
import path from "path";

const analyzeCodebaseSchema = z.object({
  path: z.string().describe("Starting directory path for analysis"),
  pattern: z.string().describe("Regex pattern for file matching (e.g., '.*\\.ts$' for TypeScript files)"),
  exclude: z.string().optional().describe("Regex pattern for files to exclude"),
  query: z.string().describe("Analysis question or task"),
  model: z.string().optional().describe("Model to use for analysis (default: auto-select)"),
  useThinking: z.boolean().optional().describe("Enable deep thinking mode for complex analysis"),
  strategy: z.enum([
    "direct",
    "chunked",
    "summarize-first",
  ]).optional().default("direct").describe("Analysis strategy"),
});

export function createCodebaseTools(orchestrator: AIOrchestrator): ToolDefinition[] {
  return [
    {
      name: "analyze_codebase",
      description: "Analyze entire codebases or document collections beyond typical context limits",
      inputSchema: analyzeCodebaseSchema as any,
      handler: async (args) => {
        const input = analyzeCodebaseSchema.parse(args);
        
        try {
          // Create file collector
          const collector = new FileCollector();
          
          // Convert string patterns to RegExp
          const pattern = new RegExp(input.pattern);
          const exclude = input.exclude ? new RegExp(input.exclude) : undefined;
          
          // Resolve path
          const resolvedPath = path.resolve(input.path);
          logger.info(`Analyzing codebase at: ${resolvedPath}`);
          
          // Collect files
          const files = await collector.collectFiles(resolvedPath, {
            pattern,
            exclude,
            maxFileSize: 10 * 1024 * 1024, // 10MB per file
            maxTotalSize: 100 * 1024 * 1024, // 100MB total
          });
          
          const stats = collector.getStats();
          
          if (files.length === 0) {
            return {
              error: "No files found matching the specified pattern",
              stats,
            };
          }
          
          // Prepare context based on strategy
          let analysisPrompt = "";
          
          switch (input.strategy) {
            case "direct":
              // Include all files directly
              analysisPrompt = prepareDirectAnalysis(files, input.query);
              break;
              
            case "chunked":
              // Analyze in chunks and combine results
              return await performChunkedAnalysis(files, input.query, input.model, orchestrator, input.useThinking);
              
            case "summarize-first":
              // First summarize each file, then analyze summaries
              return await performSummarizeFirstAnalysis(files, input.query, input.model, orchestrator, input.useThinking);
              
            default:
              analysisPrompt = prepareDirectAnalysis(files, input.query);
          }
          
          // Select model
          const model = input.model || selectModelForCodebase(stats.totalSize);
          
          // Perform analysis
          const result = await orchestrator.callModel(
            model,
            analysisPrompt,
            {
              temperature: 0.3,
              useThinking: input.useThinking,
            }
          );
          
          return {
            result: result.response,
            stats,
            model: result.model,
            filesAnalyzed: files.length,
          };
          
        } catch (error) {
          logger.error("Codebase analysis error:", error);
          return {
            error: error instanceof Error ? error.message : "Analysis failed",
          };
        }
      },
      tags: ["analysis", "codebase"],
    },
    
    {
      name: "find_in_codebase",
      description: "Search for specific patterns, functions, or implementations in a codebase",
      inputSchema: z.object({
        path: z.string().describe("Starting directory path"),
        searchPattern: z.string().describe("What to search for (regex supported)"),
        filePattern: z.string().optional().describe("File pattern to search in (e.g., '.*\\.py$')"),
        contextLines: z.number().optional().default(3).describe("Number of context lines around matches"),
      }) as any,
      handler: async (args) => {
        const input = args as any;
        
        try {
          const collector = new FileCollector();
          const pattern = new RegExp(input.filePattern || ".*");
          const searchRegex = new RegExp(input.searchPattern, "gim");
          
          const files = await collector.collectFiles(path.resolve(input.path), {
            pattern,
            maxFileSize: 5 * 1024 * 1024, // 5MB per file for search
          });
          
          const matches: any[] = [];
          
          for (const file of files) {
            const lines = file.content.split("\n");
            const fileMatches: any[] = [];
            
            lines.forEach((line, index) => {
              if (searchRegex.test(line)) {
                const start = Math.max(0, index - input.contextLines);
                const end = Math.min(lines.length - 1, index + input.contextLines);
                
                fileMatches.push({
                  line: index + 1,
                  match: line.trim(),
                  context: lines.slice(start, end + 1).join("\n"),
                });
              }
            });
            
            if (fileMatches.length > 0) {
              matches.push({
                file: file.path,
                matches: fileMatches,
              });
            }
          }
          
          return {
            totalMatches: matches.reduce((sum, f) => sum + f.matches.length, 0),
            files: matches,
            searchPattern: input.searchPattern,
          };
          
        } catch (error) {
          logger.error("Codebase search error:", error);
          return {
            error: error instanceof Error ? error.message : "Search failed",
          };
        }
      },
      tags: ["search", "codebase"],
    },
  ];
}

function prepareDirectAnalysis(files: any[], query: string): string {
  let prompt = `Analyze the following codebase to answer this question: ${query}\n\n`;
  prompt += "=== CODEBASE FILES ===\n\n";
  
  for (const file of files) {
    prompt += `--- File: ${file.path} ---\n`;
    prompt += file.content;
    prompt += "\n\n";
  }
  
  prompt += "=== END OF CODEBASE ===\n\n";
  prompt += "Please provide a comprehensive analysis based on the above code.";
  
  return prompt;
}

async function performChunkedAnalysis(
  files: any[],
  query: string,
  model: string | undefined,
  orchestrator: AIOrchestrator,
  useThinking?: boolean
): Promise<any> {
  const chunkSize = 10; // Files per chunk
  const chunks = [];
  
  for (let i = 0; i < files.length; i += chunkSize) {
    chunks.push(files.slice(i, i + chunkSize));
  }
  
  logger.info(`Analyzing ${files.length} files in ${chunks.length} chunks`);
  
  // Analyze each chunk
  const chunkResults = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkPrompt = prepareDirectAnalysis(chunk, query);
    
    const result = await orchestrator.callModel(
      model || "openai/gpt-4o",
      chunkPrompt,
      { temperature: 0.3, useThinking }
    );
    
    chunkResults.push({
      chunkIndex: i,
      files: chunk.map(f => f.path),
      analysis: result.response,
    });
  }
  
  // Synthesize results
  let synthesisPrompt = `Based on the following chunk analyses of a codebase, provide a comprehensive answer to: ${query}\n\n`;
  for (const chunk of chunkResults) {
    synthesisPrompt += `=== Chunk ${chunk.chunkIndex + 1} (Files: ${chunk.files.join(", ")}) ===\n`;
    synthesisPrompt += chunk.analysis + "\n\n";
  }
  
  const finalResult = await orchestrator.callModel(
    model || "google/gemini-2.5-pro",
    synthesisPrompt,
    { temperature: 0.3, useThinking }
  );
  
  return {
    result: finalResult.response,
    strategy: "chunked",
    chunks: chunks.length,
    filesAnalyzed: files.length,
  };
}

async function performSummarizeFirstAnalysis(
  files: any[],
  query: string,
  model: string | undefined,
  orchestrator: AIOrchestrator,
  useThinking?: boolean
): Promise<any> {
  logger.info(`Summarizing ${files.length} files before analysis`);
  
  // First, summarize each file
  const summaries = [];
  for (const file of files) {
    const summaryPrompt = `Summarize the key functionality and important aspects of this code file:\n\n${file.content}`;
    
    const result = await orchestrator.callModel(
      "openai/gpt-4o-mini",
      summaryPrompt,
      { temperature: 0.3 }
    );
    
    summaries.push({
      file: file.path,
      summary: result.response,
    });
  }
  
  // Then analyze based on summaries
  let analysisPrompt = `Based on the following file summaries, answer: ${query}\n\n`;
  for (const summary of summaries) {
    analysisPrompt += `=== ${summary.file} ===\n${summary.summary}\n\n`;
  }
  
  const finalResult = await orchestrator.callModel(
    model || "google/gemini-2.5-pro",
    analysisPrompt,
    { temperature: 0.3, useThinking }
  );
  
  return {
    result: finalResult.response,
    strategy: "summarize-first",
    filesAnalyzed: files.length,
    summaries: summaries.length,
  };
}

function selectModelForCodebase(totalSize: number): string {
  // Select model based on context size
  if (totalSize > 50 * 1024 * 1024) { // > 50MB
    return "google/gemini-2.5-pro"; // Large context window
  } else if (totalSize > 10 * 1024 * 1024) { // > 10MB
    return "openai/gpt-4o";
  } else {
    return "openai/gpt-4o-mini";
  }
}