# Ultimate MCP v2.0 - Quick Start Guide

Get up and running with Ultimate MCP in under 5 minutes!

## 🚀 Installation (1 minute)

### Option 1: NPX (Recommended)
```bash
# No installation needed - just run!
npx ultimate-mcp-server
```

### Option 2: Global Install
```bash
npm install -g ultimate-mcp-server
ultimate-mcp-server
```

## 🔧 Platform Setup (2 minutes)

### For Claude Desktop

1. Open Claude Desktop settings
2. Go to Developer → MCP Settings
3. Add this configuration:

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

4. Restart Claude Desktop

### For Cursor

Add to `.cursorrules` in your project:

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

### For VS Code (via Continue)

1. Install Continue extension
2. Add to Continue settings:

```json
{
  "models": [{
    "provider": "mcp",
    "server": "ultimate-mcp",
    "command": "npx ultimate-mcp-server"
  }]
}
```

## 🔑 API Keys (1 minute)

Create a `.env` file in your project root:

```bash
# Choose at least one:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Optional for more features:
PERPLEXITY_API_KEY=...  # For research
XAI_API_KEY=...         # For Grok models
```

## 🎯 Your First Commands (1 minute)

### 1. Debug an Error
```
/ask analyze_error "TypeError: Cannot read property 'x' of undefined"
```

### 2. Generate Code
```
/ask generate_code "Create a React component for a search bar with debouncing"
```

### 3. Analyze a Website's UI
```
/ask analyze_ui_screenshot https://example.com
```

### 4. Compare AI Models
```
/ask orchestrate "What's the best way to implement authentication?" --strategy consensus
```

## 💡 Common Use Cases

### Fix a Bug
```typescript
// Getting an error? Let Ultimate MCP help:
/ask analyze_error {
  error: "ReferenceError: user is not defined",
  code: "console.error(user.name)",
  language: "javascript"
}
```

### Optimize Performance
```typescript
// Slow code? Get optimization suggestions:
/ask suggest_optimizations {
  code: "your slow code here",
  focus: "performance"
}
```

### Understand Complex Code
```typescript
// Confused by some code?
/ask explain_code {
  code: "complex code snippet",
  level: "beginner"
}
```

### Analyze UI/UX
```typescript
// Need design feedback?
/ask analyze_ui_screenshot {
  url: "https://your-site.com",
  analysis_type: "comprehensive"
}
```

## 🔥 Pro Tips

### 1. Use Tool Shortcuts
Instead of typing full tool names, use shortcuts:
- `ae` → `analyze_error`
- `gc` → `generate_code`
- `ec` → `explain_code`

### 2. Enable Deep Thinking
For complex problems, add thinking mode:
```
/ask orchestrate "Design a scalable microservices architecture" --options.useThinking true
```

### 3. Specify Models
Want a specific AI model? Just ask:
```
/ask "Explain quantum computing" --model claude-3-opus
```

### 4. Batch Operations
Analyze multiple files at once:
```
/ask analyze_codebase --path ./src --pattern "*.ts" --query "Find security vulnerabilities"
```

## 🛠️ Available Tools Overview

| Tool | What it does | Example |
|------|--------------|---------|
| `analyze_error` | Debug errors | `/ask ae "TypeError..."` |
| `generate_code` | Create code | `/ask gc "React hook"` |
| `explain_code` | Explain code | `/ask ec "code here"` |
| `orchestrate` | Use multiple AIs | `/ask orchestrate "question"` |
| `analyze_ui_screenshot` | Analyze UI | `/ask analyze_ui_screenshot url` |
| `capture_webpage_screenshot` | Take screenshots | `/ask capture_webpage_screenshot url` |
| `analyze_codebase` | Analyze projects | `/ask analyze_codebase --path .` |

## 🚨 Troubleshooting

### "Tools not available"
- Ultimate MCP uses lazy loading - tools load on first use
- Just retry the command

### "No API key found"
- Add at least one API key to your `.env` file
- Restart your application

### "Rate limit exceeded"
- Wait a moment and try again
- Ultimate MCP has automatic retry logic

## 📚 Next Steps

1. **Explore all tools**: Run `/ask list_tools` to see everything available
2. **Read the full docs**: Check out [API.md](./API.md) for detailed documentation
3. **Join the community**: Report issues and contribute on [GitHub](https://github.com/RaiAnsar/Ultimate-MCP)

## 🎉 You're Ready!

You now have the power of 50+ AI models and dozens of intelligent tools at your fingertips. Start coding smarter, not harder!

---

Need help? Just ask Ultimate MCP: `/ask "How do I..."`