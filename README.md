# Ultimate MCP Server 🚀

**The Most Advanced Model Context Protocol Server** - Access 100+ AI models with sophisticated orchestration strategies, debugging tools, and enterprise features.

[![MCP Version](https://img.shields.io/badge/MCP-2025--06--18-blue)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-20+-green)](https://nodejs.org)

## 🌟 Why Ultimate MCP?

- **100+ AI Models**: Access OpenAI, Anthropic, Google, Meta, Mistral, and more through a single interface
- **7 Orchestration Strategies**: From simple sequential processing to complex hierarchical coordination
- **Advanced Debugging**: Analyze errors, explain code, suggest optimizations, and generate solutions
- **Production Ready**: Rate limiting, health monitoring, structured logging, and comprehensive error handling
- **Easy Setup**: One-click installation with Claude Desktop or Claude Code

## 🚀 Quick Setup (1 Minute)

### Prerequisites
- Node.js 20+ installed
- [OpenRouter API key](https://openrouter.ai/keys) (get $5 free credit on signup)

### Installation

```bash
# Clone the repository
git clone https://github.com/RaiAnsar/Ultimate-MCP.git
cd Ultimate-MCP

# Install dependencies
npm install

# Build the server
npm run build
```

### Configuration

1. **Create `.env` file** in the project root:
```env
OPENROUTER_API_KEY=your-openrouter-api-key-here
NODE_ENV=production
LOG_LEVEL=info
```

2. **Add to Claude Desktop**:
```bash
# For macOS/Linux
claude mcp add ultimate node /path/to/Ultimate-MCP/dist/index.js \
  -e OPENROUTER_API_KEY=your-openrouter-api-key --scope user

# For Windows
claude mcp add ultimate node C:\path\to\Ultimate-MCP\dist\index.js ^
  -e OPENROUTER_API_KEY=your-openrouter-api-key --scope user
```

3. **Restart Claude Desktop** and start using the Ultimate MCP Server!

## 💡 Key Features

### 🤖 Multi-AI Orchestration
Access and coordinate multiple AI models with sophisticated strategies:

- **Sequential**: Chain models for step-by-step processing
- **Parallel**: Run multiple models simultaneously
- **Debate**: Models discuss and refine answers
- **Consensus**: Democratic voting on solutions
- **Specialist**: Route to the most appropriate model
- **Hierarchical**: Lead model coordinates others
- **Mixture**: Intelligent output combination

### 🛠️ Developer Tools
- **Error Analysis**: Get detailed debugging help with root cause analysis
- **Code Explanation**: Understand complex code with detailed breakdowns
- **Optimization**: Improve performance, memory usage, and readability
- **Code Generation**: Generate production-ready code with tests
- **Interactive Debugging**: Step-by-step problem solving sessions

### 📊 Available Models
Through OpenRouter, access models from:
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5
- **Anthropic**: Claude 3 Opus, Sonnet, Haiku
- **Google**: Gemini Pro, Gemini Pro Vision
- **Meta**: Llama 3, Llama 2
- **Mistral**: Mistral Large, Mixtral
- And 90+ more models!

## 📖 Usage Examples

### Analyze an Error
```typescript
// In Claude Desktop, use the /ask command:
/ask analyze_error "TypeError: Cannot read property 'x' of undefined"
```

### Generate Code
```typescript
/ask generate_code "Create a React hook for debounced search"
```

### Orchestrate Multiple Models
```typescript
/ask orchestrate "Compare React vs Vue for a large enterprise application" 
  --strategy debate --models gpt-4,claude-3-opus,gemini-pro
```

## 🔧 Advanced Configuration

See [INSTALLATION.md](INSTALLATION.md) for detailed configuration options including:
- Custom model selection
- Rate limiting configuration
- Logging levels
- Provider-specific settings

## 📚 Documentation

- [Installation Guide](INSTALLATION.md) - Detailed setup instructions
- [Features Overview](FEATURES.md) - Complete feature documentation
- [Models Guide](MODELS_GUIDE.md) - Available models and capabilities
- [Quick Start](QUICK_START.md) - Get started in minutes

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with the Model Context Protocol by Anthropic. Special thanks to the MCP community and all the AI providers accessible through OpenRouter.

---

**Built to be praised by kings and loved by ministers** 👑