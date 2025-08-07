# Ultimate MCP Server v2.0

The definitive all-in-one Model Context Protocol (MCP) server for AI-assisted coding across 30+ platforms.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![Platforms](https://img.shields.io/badge/platforms-30%2B-brightgreen.svg)

## 🚀 Features

### Core Capabilities

- **🤖 50+ AI Models**: Latest models including GPT-4o, Claude 3 Opus, Gemini 2.5, DeepSeek V3, Grok-4, and more
- **🔌 Multi-Transport Support**: STDIO, SSE, HTTP/REST, WebSocket - works everywhere
- **📚 RAG System**: Document-based AI with vector search and embeddings
- **🧠 Cognitive Memory**: Knowledge graphs with persistent context
- **💻 Code Intelligence**: AST parsing, symbol extraction, dependency analysis
- **🔍 Universal Search**: Cross-platform file and code search
- **📊 Advanced Analytics**: Performance monitoring and cost optimization
- **🌐 Browser Automation**: Playwright and Puppeteer integration
- **🎨 UI Understanding**: Visual analysis and design system extraction

### Platform Compatibility

✅ **Fully Tested**: Claude Desktop, Claude Code, Cursor, VS Code (Continue), Cline, Windsurf, Google AI Studio

🧪 **In Testing**: Smithery, Trae, Visual Studio 2022, Zed, BoltAI, Augment Code, Roo Code, and 20+ more

## 📦 Installation

### Quick Start (Recommended)

```bash
npx ultimate-mcp-server
```

### Global Installation

```bash
npm install -g ultimate-mcp-server
ultimate-mcp-server
```

### Local Installation

```bash
npm install ultimate-mcp-server
```

## 🔧 Configuration

### Claude Desktop

Add to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "ultimate-mcp": {
      "command": "npx",
      "args": ["ultimate-mcp-server"]
    }
  }
}
```

### Cursor/Windsurf

Add to `.cursorrules` or `.windsurfrules`:

```json
{
  "mcpServers": {
    "ultimate-mcp": {
      "command": "npx",
      "args": ["ultimate-mcp-server"]
    }
  }
}
```

### Environment Variables

Create a `.env` file with your API keys:

```bash
# Required (at least one)
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
GOOGLE_API_KEY=your-key

# Optional (for specific features)
PERPLEXITY_API_KEY=your-key  # For research features
XAI_API_KEY=your-key         # For Grok models
MISTRAL_API_KEY=your-key     # For Mistral models
```

## 🛠️ Available Tools

### Debugging & Analysis
- `analyze_error` - Analyze errors with AI-powered suggestions
- `explain_code` - Get detailed code explanations
- `suggest_optimizations` - Performance and code quality improvements
- `debugging_session` - Interactive debugging with context

### AI Orchestration
- `ask` - Query any AI model directly
- `orchestrate` - Coordinate multiple models for complex tasks
- `compare_models` - Compare responses across different models

### Code Generation
- `generate_code` - Create code with best practices
- `analyze_codebase` - Large-scale codebase analysis
- `find_in_codebase` - Pattern search across files

### Advanced Features
- `rag_search` - Semantic search in documents
- `build_knowledge_graph` - Create knowledge representations
- `analyze_ui_screenshot` - Understand UI/UX from images
- `capture_webpage_screenshot` - Browser automation
- `extract_webpage_data` - Web scraping

## 🎯 Use Cases

### 1. Code Review & Debugging
```typescript
// Analyze an error
await mcp.use_tool('analyze_error', {
  error: 'TypeError: Cannot read property of undefined',
  code: problemCode,
  language: 'javascript'
});
```

### 2. UI/UX Analysis
```typescript
// Analyze a design screenshot
await mcp.use_tool('analyze_ui_screenshot', {
  url: 'https://example.com',
  analysis_type: 'comprehensive',
  extract_design_system: true
});
```

### 3. Large Codebase Analysis
```typescript
// Analyze entire project
await mcp.use_tool('analyze_large_codebase', {
  rootDir: '/path/to/project',
  pattern: '.*\\.ts$',
  query: 'How is authentication implemented?'
});
```

### 4. Multi-Model Orchestration
```typescript
// Get consensus from multiple models
await mcp.use_tool('orchestrate', {
  prompt: 'Design a scalable microservices architecture',
  strategy: 'consensus',
  models: ['gpt-4o', 'claude-3-opus', 'gemini-2.5-pro']
});
```

## 🏗️ Architecture

### Smart Lazy Loading
- Tools are registered immediately but loaded on-demand
- Reduces startup time from 5s to <500ms
- Maintains full functionality without "tools not available" issues

### Performance Optimization
- Intelligent model routing based on task complexity
- Automatic cost optimization with quality thresholds
- Built-in caching and rate limiting
- Token usage tracking and optimization

### Extensibility
- Plugin architecture for custom tools
- Support for custom embedding providers
- Configurable vector stores (Pinecone, Weaviate, ChromaDB)
- Custom model integrations

## 📊 Performance Metrics

- **Startup Time**: <500ms (with lazy loading)
- **Response Time**: <1s for most operations
- **Memory Usage**: <512MB under normal load
- **Bundle Size**: ~45MB (optimized)
- **Context Window**: Up to 2M tokens (model dependent)

## 🔐 Security

- No data persistence by default
- API keys stored locally only
- Sandboxed code execution
- Rate limiting and abuse prevention
- Audit logging for compliance

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Ultimate MCP incorporates the best features from:
- [agentset-ai](https://github.com/agentset-ai/mcp-server) - RAG capabilities
- [contentful-mcp](https://github.com/contentful/mcp-server) - Content management
- [cognee-mcp](https://github.com/cognee/mcp) - Cognitive memory
- [code-context-provider](https://github.com/code-context-provider/mcp) - Code analysis
- [code-assistant](https://github.com/code-assistant/mcp) - Autonomous exploration
- [mcp-enhance-prompt](https://github.com/enhance-prompt/mcp) - Prompt engineering
- [mcp-everything-search](https://github.com/everything-search/mcp) - Universal search
- [consult7](https://github.com/szeider/consult7) - Large context analysis

## 🚀 What's New in v2.0

- **50+ Latest AI Models**: Including Grok-4, DeepSeek V3, Gemini 2.5 Flash
- **Browser Automation**: Playwright and Puppeteer integration
- **UI/UX Understanding**: Analyze designs from screenshots or URLs
- **Smart Lazy Loading**: 10x faster startup with full functionality
- **Cost Optimization**: Automatic model selection based on budget
- **Performance Monitoring**: Real-time metrics and insights
- **Large Context Analysis**: Handle massive codebases (Consult7-style)
- **Multi-Transport**: Works with every MCP-compatible platform

---

Built with ❤️ by the Ultimate MCP Team