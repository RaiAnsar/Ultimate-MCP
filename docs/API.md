# Ultimate MCP v2.0 - API Documentation

## Table of Contents
- [Overview](#overview)
- [Transport Protocols](#transport-protocols)
- [Tools API](#tools-api)
- [Model Management](#model-management)
- [Performance API](#performance-api)
- [Error Handling](#error-handling)

## Overview

Ultimate MCP provides a comprehensive API for AI-assisted coding across multiple transport protocols. All tools are lazy-loaded for optimal performance while maintaining immediate availability.

## Transport Protocols

### STDIO (Default)
Standard input/output communication for desktop applications.

```typescript
// Configuration for Claude Desktop
{
  "mcpServers": {
    "ultimate-mcp": {
      "command": "npx",
      "args": ["ultimate-mcp-server"]
    }
  }
}
```

### Server-Sent Events (SSE)
Real-time streaming for web applications.

```bash
# Start SSE server
ultimate-mcp-server --transport sse --port 3000
```

```javascript
// Client connection
const eventSource = new EventSource('http://localhost:3000/events');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.error('Received:', data);
};
```

### HTTP/REST API
RESTful endpoints for traditional web integration.

```bash
# Start HTTP server
ultimate-mcp-server --transport http --port 3000
```

#### Endpoints

**POST /api/tools/list**
```javascript
// Response
{
  "tools": [
    {
      "name": "analyze_error",
      "description": "Analyze error messages...",
      "inputSchema": { ... }
    }
  ]
}
```

**POST /api/tools/execute**
```javascript
// Request
{
  "tool": "analyze_error",
  "arguments": {
    "error": "TypeError: Cannot read property...",
    "language": "javascript"
  }
}

// Response
{
  "content": [{
    "type": "text",
    "text": "Error analysis results..."
  }]
}
```

### WebSocket
Bidirectional real-time communication.

```bash
# Start WebSocket server
ultimate-mcp-server --transport websocket --port 3000
```

```javascript
// Client connection
const ws = new WebSocket('ws://localhost:3000');
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'tool_execute',
    tool: 'analyze_error',
    arguments: { ... }
  }));
});
```

## Tools API

### Debugging Tools

#### analyze_error
Analyzes error messages and provides debugging suggestions.

```typescript
interface AnalyzeErrorInput {
  error: string;           // Error message or stack trace
  code?: string;          // Related code snippet
  language?: 'javascript' | 'typescript' | 'python' | 'java' | 'go' | 'rust';
}

// Example
const result = await mcp.use_tool('analyze_error', {
  error: 'TypeError: Cannot read property "x" of undefined',
  code: 'const value = obj.x.y;',
  language: 'javascript'
});
```

#### explain_code
Provides detailed code explanations.

```typescript
interface ExplainCodeInput {
  code: string;
  language: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
}
```

#### suggest_optimizations
Analyzes code for performance improvements.

```typescript
interface OptimizationInput {
  code: string;
  language: string;
  focus?: 'performance' | 'memory' | 'readability' | 'all';
}
```

### AI Orchestration Tools

#### ask
Direct queries to specific AI models.

```typescript
interface AskInput {
  prompt: string;
  model?: string;         // Model ID from MODELS config
  temperature?: number;   // 0-2
}
```

#### orchestrate
Coordinate multiple models with various strategies.

```typescript
interface OrchestrateInput {
  prompt: string;
  strategy: 'sequential' | 'parallel' | 'debate' | 'consensus' | 
            'specialist' | 'hierarchical' | 'mixture';
  models?: string[];      // Specific models to use
  options?: {
    includeReasoning?: boolean;
    maxRounds?: number;    // For debate strategy
    temperature?: number;
    useThinking?: boolean; // Deep thinking mode
  };
}
```

### Code Intelligence Tools

#### analyze_codebase
Analyze large codebases beyond context limits.

```typescript
interface AnalyzeCodebaseInput {
  path: string;           // Root directory
  pattern: string;        // File pattern regex
  query: string;          // Analysis question
  model?: string;         // Model for analysis
  strategy?: 'direct' | 'chunked' | 'summarize-first';
  useThinking?: boolean;
}
```

#### find_in_codebase
Search for patterns across files.

```typescript
interface FindInCodebaseInput {
  path: string;
  searchPattern: string;  // Regex pattern
  filePattern?: string;   // File filter regex
  contextLines?: number;  // Lines around matches
}
```

### Advanced Features

#### analyze_ui_screenshot
Analyze UI/UX from screenshots or URLs.

```typescript
interface UIAnalysisInput {
  url?: string;           // Web page URL
  filePath?: string;      // Local image path
  analysis_type: 'quick' | 'comprehensive' | 'accessibility' | 
                 'design_system' | 'user_flow';
  extract_design_system?: boolean;
  compare_with?: string;  // URL/path for comparison
}
```

#### capture_webpage_screenshot
Capture screenshots with browser automation.

```typescript
interface ScreenshotInput {
  url: string;
  fullPage?: boolean;
  tileSize?: number;      // Split large screenshots
  viewport?: {
    width: number;
    height: number;
  };
  engine?: 'playwright' | 'puppeteer';
  browserType?: 'chromium' | 'firefox' | 'webkit';
}
```

## Model Management

### Available Models

```typescript
// Access model list
import { MODELS } from 'ultimate-mcp-server/config';

// Categories
const codingModels = [
  MODELS.GPT_4O,
  MODELS.DEEPSEEK_CODER,
  MODELS.QWEN_CODER_32B
];

const visionModels = [
  MODELS.GEMINI_2_FLASH,
  MODELS.GPT_4O_WITH_VISION
];

const reasoningModels = [
  MODELS.CLAUDE_3_OPUS,
  MODELS.GROK_4
];
```

### Model Routing

The system automatically routes tasks to optimal models based on:

```typescript
interface TaskCharacteristics {
  type: 'coding' | 'debugging' | 'analysis' | 'generation' | 
        'vision' | 'reasoning' | 'general';
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTokens: number;
  requiresSpeed: boolean;
  requiresAccuracy: boolean;
  contextLength?: number;
}
```

## Performance API

### Metrics Collection

```typescript
// Get performance metrics
const metrics = await mcp.use_tool('get_metrics', {
  type: 'all' // 'system' | 'tools' | 'all'
});

// Response structure
{
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
    activeConnections: number;
  },
  tools: {
    [toolName]: {
      calls: number;
      errors: number;
      avgDuration: number;
      lastUsed: string;
    }
  },
  models: {
    [modelId]: {
      requests: number;
      tokens: number;
      errors: number;
      avgLatency: number;
    }
  }
}
```

### Cost Tracking

```typescript
// Get cost analysis
const costs = await mcp.use_tool('get_cost_analysis', {
  period: 'day' | 'week' | 'month',
  breakdown: true
});
```

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    suggestion?: string;
  };
  timestamp: string;
  requestId: string;
}
```

### Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| `TOOL_NOT_FOUND` | Tool doesn't exist | Check tool name |
| `INVALID_PARAMS` | Invalid parameters | Validate input schema |
| `MODEL_ERROR` | AI model error | Retry with fallback |
| `RATE_LIMIT` | Rate limit exceeded | Wait and retry |
| `CONTEXT_OVERFLOW` | Context too large | Use chunking strategy |
| `TIMEOUT` | Operation timeout | Increase timeout |

### Retry Strategies

```typescript
// Automatic retry with exponential backoff
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
};

// Custom retry handler
mcp.on('error', async (error, context) => {
  if (error.code === 'RATE_LIMIT') {
    await delay(error.retryAfter);
    return context.retry();
  }
});
```

## Advanced Usage

### Custom Tool Registration

```typescript
// Register a custom tool
mcp.registerTool({
  name: 'custom_analysis',
  description: 'Custom analysis tool',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string' }
    },
    required: ['data']
  },
  execute: async (args) => {
    // Tool implementation
    return {
      content: [{
        type: 'text',
        text: 'Analysis results'
      }]
    };
  }
});
```

### Event Handling

```typescript
// Listen to events
mcp.on('tool:start', (event) => {
  console.error(`Tool ${event.tool} started`);
});

mcp.on('tool:complete', (event) => {
  console.error(`Tool ${event.tool} completed in ${event.duration}ms`);
});

mcp.on('model:response', (event) => {
  console.error(`Model ${event.model} responded with ${event.tokens} tokens`);
});
```

### Session Management

```typescript
// Create a session with context
const session = mcp.createSession({
  contextWindow: 100000,
  persistContext: true,
  modelPreferences: {
    coding: 'deepseek-coder',
    reasoning: 'claude-3-opus'
  }
});

// Use session for multiple operations
await session.use_tool('analyze_error', { ... });
await session.use_tool('suggest_fix', { ... });
```

## Rate Limits

| Feature | Free Tier | Pro Tier | Enterprise |
|---------|-----------|----------|------------|
| Requests/min | 10 | 100 | Unlimited |
| Context size | 100K | 1M | 2M |
| Concurrent | 1 | 5 | Unlimited |
| Models | Basic | All | Custom |

## Best Practices

1. **Use appropriate transport**: STDIO for desktop, SSE for streaming, HTTP for simple requests
2. **Enable lazy loading**: Reduces startup time significantly
3. **Batch operations**: Use parallel orchestration for multiple tasks
4. **Monitor costs**: Use cost optimization features for budget control
5. **Handle errors gracefully**: Implement retry logic for transient failures
6. **Cache responses**: Use built-in caching for repeated queries
7. **Choose right models**: Let the router select optimal models
8. **Manage context**: Use chunking for large inputs

---

For more examples and guides, see the [Ultimate MCP GitHub repository](https://github.com/RaiAnsar/Ultimate-MCP).