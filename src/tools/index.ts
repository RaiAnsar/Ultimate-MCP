import { UltimateMCPServer } from "../core/server.js";
import { AIOrchestrator } from "../providers/orchestrator.js";
import { ToolDefinition } from "../types/index.js";
import * as debugTools from "./debug-tools.js";
import { createCodebaseTools } from "./codebase-tools.js";
import { ragTools } from "./rag-tools.js";
import { promptEnhancementTools } from "./prompt-enhancement-tools.js";
import { universalSearchTools } from "./universal-search-tools.js";
import { cognitiveMemoryTools } from "./cognitive-memory-tools.js";
import { codeContextTools } from "./code-context-tools.js";
import { contentManagementTools } from "./content-management-tools.js";
import { autonomousExplorationTools } from "./autonomous-exploration-tools.js";
import { uiUnderstandingTools } from "./ui-understanding-tools.js";
import { largeContextTools } from "./large-context-tools.js";
// import * as aiTools from "./ai-tools.js";
// import * as codeTools from "./code-tools.js";
// import * as systemTools from "./system-tools.js";

export async function registerBuiltInTools(
  server: UltimateMCPServer,
  orchestrator: AIOrchestrator
): Promise<void> {
  // Register debugging tools
  server.registerTool(debugTools.analyzeError);
  server.registerTool(debugTools.explainCode);
  server.registerTool(debugTools.suggestOptimizations);
  server.registerTool(debugTools.debuggingSession);

  // Register AI orchestration tools
  const askTool: ToolDefinition = {
    name: "ask",
    description: "Ask a question to a specific AI model",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The question or prompt" },
        model: { type: "string", description: "Model to use (e.g., openai/gpt-4o)" },
        temperature: { type: "number", description: "Temperature (0-2)", minimum: 0, maximum: 2 },
      },
      required: ["prompt"],
    },
    handler: async ({ prompt, model, temperature }) => {
      const result = await orchestrator.orchestrate({
        prompt,
        strategy: "specialist" as any,
        models: model ? [model] : undefined,
        options: { temperature },
      });
      return result.responses[0]?.response || "No response";
    },
    tags: ["ai", "chat"],
  };

  const orchestrateTool: ToolDefinition = {
    name: "orchestrate",
    description: "Orchestrate a task across multiple AI models using various strategies",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The task or question" },
        strategy: {
          type: "string",
          enum: ["sequential", "parallel", "debate", "consensus", "specialist", "hierarchical", "mixture"],
          description: "Orchestration strategy",
        },
        models: {
          type: "array",
          items: { type: "string" },
          description: "Models to use (optional)",
        },
        options: {
          type: "object",
          description: "Additional options",
          properties: {
            maxRounds: { type: "number" },
            temperature: { type: "number" },
            includeReasoning: { type: "boolean" },
            useThinking: { type: "boolean", description: "Enable deep thinking mode" },
            thinkingTokens: { 
              type: "array", 
              items: { type: "string" },
              description: "Custom thinking tokens"
            },
          },
        },
      },
      required: ["prompt", "strategy"],
    },
    handler: async (args) => {
      const result = await orchestrator.orchestrate(args as any);
      return formatOrchestrationResult(result);
    },
    tags: ["ai", "orchestration"],
  };

  server.registerTool(askTool);
  server.registerTool(orchestrateTool);

  // Register code tools
  await registerCodeTools(server, orchestrator);

  // Register system tools
  await registerSystemTools(server);
  
  // Register RAG tools
  for (const tool of ragTools) {
    server.registerTool(tool);
  }
  
  // Register prompt enhancement tools
  for (const tool of promptEnhancementTools) {
    // Pass orchestrator to tools that need it
    const toolWithOrchestrator = {
      ...tool,
      handler: async (args: any) => (tool.handler as any)(args, orchestrator)
    };
    server.registerTool(toolWithOrchestrator);
  }
  
  // Register universal search tools
  for (const tool of universalSearchTools) {
    server.registerTool(tool);
  }
  
  // Register cognitive memory tools
  for (const tool of cognitiveMemoryTools) {
    server.registerTool(tool);
  }
  
  // Register code context tools
  for (const tool of codeContextTools) {
    server.registerTool(tool);
  }
  
  // Register content management tools
  for (const tool of contentManagementTools) {
    server.registerTool(tool);
  }
  
  // Register autonomous exploration tools
  for (const tool of autonomousExplorationTools) {
    server.registerTool(tool);
  }
  
  // Register UI understanding tools
  for (const tool of uiUnderstandingTools) {
    server.registerTool(tool);
  }
  
  // Register large context analysis tools
  for (const tool of largeContextTools) {
    server.registerTool(tool);
  }
}

function formatOrchestrationResult(result: any): string {
  let output = `# Orchestration Result\n\n`;
  output += `**Strategy:** ${result.strategy}\n`;
  output += `**Models Used:** ${result.metadata.modelsUsed.join(", ")}\n\n`;

  if (result.strategy === "sequential") {
    output += `## Sequential Refinement\n\n`;
    result.responses.forEach((r: any, i: number) => {
      output += `### Step ${i + 1}: ${r.model}\n${r.response}\n\n`;
    });
  } else if (result.strategy === "parallel") {
    output += `## Parallel Responses\n\n`;
    result.responses.forEach((r: any) => {
      output += `### ${r.model}\n${r.response}\n\n`;
    });
    if (result.synthesis) {
      output += `\n## Synthesis\n${result.synthesis}\n`;
    }
  } else if (result.strategy === "debate") {
    output += `## Debate Rounds\n\n`;
    result.rounds?.forEach((round: any, i: number) => {
      output += `### Round ${i + 1}\n`;
      round.responses.forEach((r: any) => {
        output += `**${r.model}:** ${r.response}\n\n`;
      });
    });
    if (result.conclusion) {
      output += `\n## Conclusion\n${result.conclusion}\n`;
    }
  } else if (result.strategy === "consensus") {
    output += `## Individual Perspectives\n\n`;
    result.responses.forEach((r: any) => {
      output += `### ${r.model}\n${r.response}\n\n`;
    });
    if (result.consensus) {
      output += `\n## Consensus\n${result.consensus}\n`;
    }
  }

  output += `\n---\n*Total Duration: ${result.metadata.totalDuration}ms*`;
  return output;
}

async function registerCodeTools(server: UltimateMCPServer, orchestrator: AIOrchestrator): Promise<void> {
  // Code generation tool
  const generateCode: ToolDefinition = {
    name: "generate_code",
    description: "Generate code based on requirements with best practices",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "What the code should do" },
        language: { 
          type: "string", 
          enum: ["javascript", "typescript", "python", "java", "go", "rust"],
          description: "Programming language" 
        },
        style: {
          type: "string",
          enum: ["functional", "object-oriented", "procedural"],
          description: "Code style preference",
        },
        includeTests: { type: "boolean", description: "Include unit tests" },
      },
      required: ["description", "language"],
    },
    handler: async ({ description, language, includeTests }) => {
      // Use orchestrator to generate code
      const codePrompt = `Generate ${language} code for: ${description}\n\nRequirements:\n- Clean, well-commented code\n- Follow best practices\n- Handle edge cases\n- Include error handling\n\nReturn ONLY the code, no explanations.`;
      
      const codeResult = await orchestrator.orchestrate({
        prompt: codePrompt,
        strategy: "specialist" as any,
        models: ["openai/gpt-4o"],
        options: { temperature: 0.3 }
      });
      
      let tests = null;
      if (includeTests) {
        const testPrompt = `Generate unit tests for this ${language} code:\n\n${codeResult.responses[0]?.response}\n\nReturn ONLY the test code.`;
        const testResult = await orchestrator.orchestrate({
          prompt: testPrompt,
          strategy: "specialist" as any,
          models: ["openai/gpt-4o"],
          options: { temperature: 0.3 }
        });
        tests = testResult.responses[0]?.response;
      }
      
      const docPrompt = `Generate concise documentation for this ${language} code:\n\n${codeResult.responses[0]?.response}\n\nInclude: purpose, parameters, return value, example usage.`;
      const docResult = await orchestrator.orchestrate({
        prompt: docPrompt,
        strategy: "specialist" as any,
        models: ["openai/gpt-4o-mini"],
        options: { temperature: 0.3 }
      });
      
      return {
        code: codeResult.responses[0]?.response || "Failed to generate code",
        tests: tests,
        documentation: docResult.responses[0]?.response || "No documentation generated",
      };
    },
    tags: ["code-generation", "development"],
  };

  server.registerTool(generateCode);

  // Register codebase analysis tools
  const codebaseTools = createCodebaseTools(orchestrator);
  for (const tool of codebaseTools) {
    server.registerTool(tool);
  }
}

async function registerSystemTools(server: UltimateMCPServer): Promise<void> {
  // Metrics tool
  const getMetrics: ToolDefinition = {
    name: "get_metrics",
    description: "Get server metrics and performance statistics",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["system", "tools", "all"],
          description: "Type of metrics to retrieve",
        },
      },
    },
    handler: async ({ type = "all" }) => {
      const metrics = server.getMetrics();
      
      if (type === "system" || type === "all") {
        return {
          system: metrics.getSystemMetrics(),
          ...(type === "all" ? { tools: metrics.getToolMetrics() } : {}),
        };
      }
      
      return { tools: metrics.getToolMetrics() };
    },
    tags: ["system", "monitoring"],
  };

  server.registerTool(getMetrics);
}