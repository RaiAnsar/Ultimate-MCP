import { UltimateMCPServer } from "../core/server.js";
import { ResourceDefinition } from "../types/index.js";

export async function registerBuiltInResources(server: UltimateMCPServer): Promise<void> {
  // System status resource
  const systemStatus: ResourceDefinition = {
    uri: "ultimate://status",
    name: "System Status",
    description: "Current server status and health information",
    mimeType: "application/json",
    handler: async () => {
      const metrics = server.getMetrics();
      const systemMetrics = metrics.getSystemMetrics();
      
      return {
        status: "healthy",
        uptime: systemMetrics.uptime,
        memory: {
          current: systemMetrics.currentMemoryUsage,
          peak: systemMetrics.peakMemoryUsage,
        },
        requests: {
          total: systemMetrics.totalRequests,
          active: systemMetrics.activeRequests,
        },
        timestamp: new Date().toISOString(),
      };
    },
    tags: ["system", "monitoring"],
  };

  // Documentation resource
  const documentation: ResourceDefinition = {
    uri: "ultimate://docs",
    name: "Documentation",
    description: "Server documentation and API reference",
    mimeType: "text/markdown",
    handler: async () => {
      return `# Ultimate MCP Server Documentation

## Overview
The Ultimate MCP Server is a comprehensive, production-ready Model Context Protocol server with advanced AI orchestration, debugging, and problem-solving capabilities.

## Features
- Multi-AI orchestration with 7 different strategies
- Advanced debugging and code analysis tools
- Context persistence with PostgreSQL/Redis
- Comprehensive metrics and monitoring
- Built-in rate limiting and security

## Available Tools
- \`ask\`: Ask a question to a specific AI model
- \`orchestrate\`: Orchestrate tasks across multiple AI models
- \`analyze_error\`: Analyze errors and provide debugging suggestions
- \`explain_code\`: Explain code with detailed breakdown
- \`suggest_optimizations\`: Suggest code optimizations
- \`debugging_session\`: Interactive debugging guidance
- \`generate_code\`: Generate code with best practices
- \`get_metrics\`: Get server performance metrics

## Orchestration Strategies
1. **Sequential**: Chain of thought refinement
2. **Parallel**: Multiple models answer independently
3. **Debate**: Models discuss and refine answers
4. **Consensus**: Models reach agreement
5. **Specialist**: Route to best model for task
6. **Hierarchical**: Tree-based problem decomposition
7. **Mixture**: Mixture of experts approach

## Configuration
Set these environment variables:
- \`OPENROUTER_API_KEY\`: For OpenRouter AI models
- \`ANTHROPIC_API_KEY\`: For Claude models
- \`OPENAI_API_KEY\`: For GPT models
- \`GOOGLE_API_KEY\`: For Gemini models
- \`DATABASE_URL\`: PostgreSQL connection string
- \`REDIS_URL\`: Redis connection string
`;
    },
    tags: ["documentation"],
  };

  // Configuration resource
  const configuration: ResourceDefinition = {
    uri: "ultimate://config",
    name: "Configuration",
    description: "Current server configuration",
    mimeType: "application/json",
    handler: async () => {
      return {
        version: "1.0.0",
        capabilities: {
          tools: true,
          resources: true,
          prompts: true,
          logging: true,
        },
        providers: {
          openrouter: !!process.env.OPENROUTER_API_KEY,
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          openai: !!process.env.OPENAI_API_KEY,
          google: !!process.env.GOOGLE_API_KEY,
        },
        persistence: {
          postgresql: !!process.env.DATABASE_URL,
          redis: !!process.env.REDIS_URL,
        },
      };
    },
    tags: ["system", "configuration"],
  };

  server.registerResource(systemStatus);
  server.registerResource(documentation);
  server.registerResource(configuration);
}