# 📦 Ultimate MCP Server - Complete Installation Guide

## Table of Contents
- [Quick Start](#quick-start)
- [Claude Desktop](#claude-desktop)
- [Claude Code](#claude-code)
- [Cursor](#cursor)
- [VS Code (Continue)](#vs-code-continue)
- [Windsurf](#windsurf)
- [Cline](#cline)
- [Google AI Studio](#google-ai-studio)
- [Other Platforms](#other-platforms)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

The fastest way to get started with any MCP-compatible client:

```bash
npx ultimate-mcp-server
```

This will start the server in stdio mode, ready for MCP client connections.

---

## Claude Desktop

### Method 1: Automatic Setup (Recommended)
```bash
npx @claude/create-mcp-server
```
Select "ultimate-mcp-server" when prompted.

### Method 2: GUI Installation
1. Open Claude Desktop
2. Click the settings icon (⚙️) in the bottom-left
3. Navigate to "Developer" → "Model Context Protocol"
4. Click "Add Server"
5. Fill in:
   - **Name**: `ultimate`
   - **Command**: `npx`
   - **Arguments**: `ultimate-mcp-server`
6. Add environment variables (optional):
   - Click "Add Environment Variable"
   - Add `OPENROUTER_API_KEY` and your key

### Method 3: Manual Configuration
Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-...",
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### Verification
After setup, restart Claude Desktop. You should see "MCP" indicator in the chat interface.

---

## Claude Code

### Installation Commands

#### Basic Installation
```bash
claude mcp add ultimate npx ultimate-mcp-server
```

#### With API Keys
```bash
claude mcp add ultimate npx ultimate-mcp-server \
  -e OPENROUTER_API_KEY=your-key \
  -e ANTHROPIC_API_KEY=your-key \
  -e GOOGLE_API_KEY=your-key
```

#### Local Development Setup
```bash
# Clone and build
git clone https://github.com/RaiAnsar/ultimate-mcp-server.git
cd ultimate-mcp-server
npm install && npm run build

# Add local version
claude mcp add ultimate node ./dist/index.js
```

#### Project-Specific Setup
```bash
# Add to current project only
claude mcp add ultimate npx ultimate-mcp-server -s local

# Add globally (all projects)
claude mcp add ultimate npx ultimate-mcp-server -s user
```

### Management Commands
```bash
# List all MCP servers
claude mcp list

# Check connection status
claude mcp status ultimate

# Remove server
claude mcp remove ultimate

# Update server
claude mcp update ultimate
```

### Using in Claude Code
Once installed, use the `/mcp` command in Claude Code to reconnect if needed.

---

## Cursor

### Method 1: Settings UI
1. Open Cursor
2. Press `Cmd/Ctrl + ,` to open Settings
3. Search for "MCP" or navigate to Features → MCP
4. Click "Add MCP Server"
5. Enter configuration:
   ```json
   {
     "name": "ultimate",
     "command": "npx",
     "args": ["ultimate-mcp-server"],
     "env": {
       "OPENROUTER_API_KEY": "your-key"
     }
   }
   ```
6. Click "Save" and restart Cursor

### Method 2: Configuration File
Edit `~/.cursor/config/settings.json`:

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "ultimate": {
        "command": "npx",
        "args": ["ultimate-mcp-server"],
        "env": {
          "OPENROUTER_API_KEY": "sk-or-...",
          "ANTHROPIC_API_KEY": "sk-ant-..."
        }
      }
    }
  }
}
```

### Method 3: Cursor Config Directory
Create `~/.cursor/mcp/ultimate.json`:

```json
{
  "command": "npx",
  "args": ["ultimate-mcp-server"],
  "env": {
    "OPENROUTER_API_KEY": "your-key"
  }
}
```

---

## VS Code (Continue)

### Prerequisites
1. Install Continue extension from VS Code Marketplace
2. Restart VS Code after installation

### Configuration

#### Method 1: Continue UI
1. Click Continue icon in sidebar
2. Click settings (⚙️) icon
3. Select "Configure MCP Servers"
4. Add configuration

#### Method 2: settings.json
Edit Continue's `config.json`:
- **macOS/Linux**: `~/.continue/config.json`
- **Windows**: `%USERPROFILE%\.continue\config.json`

```json
{
  "models": [
    // Your existing models
  ],
  "mcpServers": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"],
      "env": {
        "OPENROUTER_API_KEY": "your-key"
      }
    }
  }
}
```

#### Method 3: VS Code Settings
Add to VS Code's `settings.json`:
```json
{
  "continue.mcpServers": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"],
      "env": {
        "OPENROUTER_API_KEY": "your-key"
      }
    }
  }
}
```

---

## Windsurf

### Installation Steps
1. Open Windsurf IDE
2. Navigate to Settings (`Cmd/Ctrl + ,`)
3. Go to "AI" → "MCP Servers"
4. Click "Add Server"
5. Configure:

```yaml
name: ultimate
command: npx
args:
  - ultimate-mcp-server
env:
  OPENROUTER_API_KEY: your-key
  ANTHROPIC_API_KEY: your-key
transport: stdio
```

6. Save and restart Windsurf

### Alternative: Config File
Edit `~/.windsurf/mcp.yaml`:

```yaml
servers:
  ultimate:
    command: npx
    args:
      - ultimate-mcp-server
    env:
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
    transport: stdio
```

---

## Cline

### Installation
Edit `~/.cline/config.json`:

```json
{
  "mcpServers": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"],
      "env": {
        "OPENROUTER_API_KEY": "your-key"
      }
    }
  }
}
```

Or use Cline's CLI:
```bash
cline mcp add ultimate "npx ultimate-mcp-server"
```

---

## Google AI Studio

### Setup Process
1. Open [Google AI Studio](https://aistudio.google.com)
2. Click Settings (⚙️)
3. Navigate to "Extensions" → "MCP"
4. Enable "Model Context Protocol"
5. Add server configuration:

```json
{
  "servers": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"],
      "transport": "stdio",
      "env": {
        "GOOGLE_API_KEY": "${GOOGLE_API_KEY}"
      }
    }
  }
}
```

---

## Other Platforms

### Zed
Edit `~/.config/zed/settings.json`:
```json
{
  "assistant": {
    "mcp_servers": {
      "ultimate": {
        "command": "npx",
        "args": ["ultimate-mcp-server"]
      }
    }
  }
}
```

### Smithery
Add to `.smithery/config.json`:
```json
{
  "mcp": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"]
    }
  }
}
```

### Visual Studio 2022
1. Install MCP extension from Visual Studio Marketplace
2. Go to Tools → Options → MCP
3. Add server configuration

### BoltAI
1. Open BoltAI preferences
2. Navigate to "Assistants" → "MCP"
3. Add ultimate-mcp-server

---

## Troubleshooting

### Common Issues

#### Server not connecting
```bash
# Check if npx works
npx --version

# Test server directly
npx ultimate-mcp-server

# Check for errors
npm list -g ultimate-mcp-server
```

#### Permission errors
```bash
# macOS/Linux
chmod +x $(which npx)

# Install globally instead
npm install -g ultimate-mcp-server
# Then use "ultimate-mcp-server" as command instead of "npx ultimate-mcp-server"
```

#### API key issues
```bash
# Test with environment variable
export OPENROUTER_API_KEY="your-key"
npx ultimate-mcp-server

# Or create .env file
echo "OPENROUTER_API_KEY=your-key" > .env
```

#### Version conflicts
```bash
# Clear npm cache
npm cache clean --force

# Update to latest
npm update -g ultimate-mcp-server

# Or reinstall
npm uninstall -g ultimate-mcp-server
npm install -g ultimate-mcp-server@latest
```

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npx ultimate-mcp-server
```

Or in configuration:
```json
{
  "env": {
    "DEBUG": "*",
    "LOG_LEVEL": "debug"
  }
}
```

### Support

- **GitHub Issues**: [Report bugs](https://github.com/RaiAnsar/ultimate-mcp-server/issues)
- **Discussions**: [Ask questions](https://github.com/RaiAnsar/ultimate-mcp-server/discussions)
- **Wiki**: [Documentation](https://github.com/RaiAnsar/ultimate-mcp-server/wiki)