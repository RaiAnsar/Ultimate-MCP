# Ultimate MCP Server - Multi-Platform Installation Guide

## 🚀 Quick Install with NPX (Recommended!)

The easiest way to install Ultimate MCP on any platform:

```bash
# Interactive installation
npx ultimate-mcp-server install

# Platform-specific installation
npx ultimate-mcp-server install claude-desktop
npx ultimate-mcp-server install claude-code
npx ultimate-mcp-server install cursor
npx ultimate-mcp-server install gemini
npx ultimate-mcp-server install vscode
```

## 🎯 1-Click Install Links

### Cursor
[![Install in Cursor](https://img.shields.io/badge/Install%20in-Cursor-blue?style=for-the-badge)](https://cursor.com/install-mcp?name=ultimate-mcp&config=eyJjb21tYW5kIjogIm5weCIsICJhcmdzIjogWyJ1bHRpbWF0ZS1tY3Atc2VydmVyIl0sICJlbnYiOiB7Ik9QRU5ST1VURVJfQVBJX0tFWSI6ICJZT1VSX0FQSV9LRVkifX0%3D)

**Note:** After clicking, you'll need to replace `YOUR_API_KEY` with your actual OpenRouter API key in Cursor settings.

### VS Code (with Continue extension)
[![Install in VS Code](https://img.shields.io/badge/Install%20in-VS%20Code-blue?style=for-the-badge)](vscode:extension/continue.continue)

## 📋 Platform-Specific Instructions

### 1. Cursor IDE

#### NPX Installation (Easiest)
```bash
npx ultimate-mcp-server install cursor
```

#### Automatic Installation
1. Open Cursor
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "MCP: Install Server" and select it
4. Paste: `https://github.com/RaiAnsar/Ultimate-MCP`
5. Cursor will automatically configure everything

#### Manual Installation
1. Open Cursor Settings (`Cmd+,` or `Ctrl+,`)
2. Search for "MCP Servers"
3. Click "Add MCP Server"
4. Configure as follows:
```json
{
  "name": "ultimate-mcp",
  "command": "node",
  "args": ["/path/to/Ultimate-MCP/dist/index.js"],
  "env": {
    "OPENROUTER_API_KEY": "your-api-key-here"
  }
}
```

### 2. Google AI Studio (Gemini)

#### Step 1: Prepare the Server
```bash
# Clone and build
git clone https://github.com/RaiAnsar/Ultimate-MCP.git
cd Ultimate-MCP
npm install
npm run build
```

#### Step 2: Configure for Gemini
Create `gemini-config.json`:
```json
{
  "mcpServers": {
    "ultimate": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/Ultimate-MCP/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key",
        "MCP_MODE": "gemini"
      }
    }
  }
}
```

#### Step 3: Add to Gemini
1. Open Google AI Studio
2. Go to Settings → Extensions
3. Click "Add MCP Server"
4. Upload `gemini-config.json`
5. Enable the Ultimate MCP extension

### 3. Claude Desktop

#### Automatic Installation
```bash
# macOS/Linux
./setup.sh

# Windows
setup.bat
```

#### Manual Installation
Edit Claude config file:
- **macOS**: `~/Library/Application Support/Claude/claude.json`
- **Windows**: `%APPDATA%\Claude\claude.json`
- **Linux**: `~/.config/claude/claude.json`

```json
{
  "mcpServers": {
    "ultimate": {
      "command": "node",
      "args": ["/absolute/path/to/Ultimate-MCP/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 4. Claude Code

#### Using CLI
```bash
claude mcp add ultimate node /path/to/Ultimate-MCP/dist/index.js \
  -e OPENROUTER_API_KEY=your-api-key --scope user
```

#### Using Config File
Edit `~/.claude.json`:
```json
{
  "mcpServers": {
    "ultimate": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/Ultimate-MCP/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 5. VS Code (via Continue Extension)

#### Step 1: Install Continue
1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Search for "Continue"
4. Install the Continue extension

#### Step 2: Configure MCP
1. Open Continue settings
2. Click "Add MCP Server"
3. Add configuration:
```json
{
  "models": [{
    "provider": "mcp",
    "server": "ultimate",
    "apiKey": "your-openrouter-key"
  }],
  "mcpServers": {
    "ultimate": {
      "command": "node",
      "args": ["/path/to/Ultimate-MCP/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 6. Cline (VS Code Extension)

#### Installation
1. Install Cline from VS Code marketplace
2. Open Cline settings (gear icon in Cline panel)
3. Go to "MCP Servers" tab
4. Click "Add Server"
5. Enter:
   - Name: `ultimate`
   - Command: `node /path/to/Ultimate-MCP/dist/index.js`
   - Environment: `OPENROUTER_API_KEY=your-api-key`

### 7. Windsurf IDE

#### Installation
1. Open Windsurf preferences
2. Navigate to AI → MCP Servers
3. Click "Add Server"
4. Configure:
```yaml
name: ultimate
command: node
args:
  - /path/to/Ultimate-MCP/dist/index.js
env:
  OPENROUTER_API_KEY: your-api-key
```

## 🔧 Environment Variables

All platforms support these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter API key |
| `ANTHROPIC_API_KEY` | No | Direct Anthropic access |
| `OPENAI_API_KEY` | No | Direct OpenAI access |
| `GOOGLE_API_KEY` | No | Direct Google AI access |
| `LOG_LEVEL` | No | Logging level (debug/info/warn/error) |
| `MCP_MODE` | No | Platform-specific optimizations |

## 🎯 Platform-Specific Features

### Cursor
- Inline code suggestions using Ultimate MCP
- Model switching via command palette
- Automatic context management

### Gemini
- Native integration with Google's models
- Fallback to OpenRouter for other models
- Optimized for long-context operations

### Claude Desktop/Code
- Full orchestration support
- Persistent conversations
- Tool approval workflows

### VS Code Extensions
- Integrated with editor features
- Code lens support
- Inline completions

## 🚨 Troubleshooting

### Common Issues

1. **"MCP server not found"**
   - Use absolute paths in configuration
   - Ensure the server is built: `npm run build`
   - Check file permissions

2. **"API key invalid"**
   - Verify your OpenRouter API key
   - Check environment variable spelling
   - Ensure no extra spaces in the key

3. **"Connection timeout"**
   - Check if Node.js 18+ is installed
   - Verify network connectivity
   - Try running the test: `node test-server.js`

### Platform-Specific Issues

#### Cursor
- Clear Cursor's cache: `Cmd+Shift+P` → "Clear Cache"
- Restart Cursor after configuration changes

#### Gemini
- Ensure you're using AI Studio, not standard Gemini
- Check that MCP extensions are enabled in settings

#### Claude Apps
- Always restart after configuration changes
- Check logs: `~/Library/Logs/Claude/` (macOS)

## 📚 Getting Started

After installation, try these commands:

```typescript
// Simple query
ask "Explain async/await in JavaScript"

// Multi-model orchestration
orchestrate "Design a scalable microservices architecture" --strategy debate

// Code analysis
analyze_error "TypeError: Cannot read property 'x' of undefined"

// Generate code
generate_code "React component for user authentication" --language typescript
```

## 🔗 Resources

- [GitHub Repository](https://github.com/RaiAnsar/Ultimate-MCP)
- [API Documentation](https://github.com/RaiAnsar/Ultimate-MCP/blob/main/FEATURES.md)
- [Model Guide](https://github.com/RaiAnsar/Ultimate-MCP/blob/main/MODELS_GUIDE.md)
- [OpenRouter](https://openrouter.ai/) - Get your API key

## 💡 Pro Tips

1. **For Cursor**: Use the command palette (`Cmd+K`) to quickly access Ultimate MCP features
2. **For Gemini**: Enable "Advanced Mode" for access to all orchestration strategies
3. **For Claude**: Use `/ask` prefix for better context handling
4. **For VS Code**: Configure keyboard shortcuts for frequent operations

---

Need help? [Open an issue](https://github.com/RaiAnsar/Ultimate-MCP/issues) or check our [FAQ](https://github.com/RaiAnsar/Ultimate-MCP/wiki/FAQ).