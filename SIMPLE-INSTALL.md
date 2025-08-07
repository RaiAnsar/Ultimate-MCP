# Ultimate MCP v2.0 - Simple Installation (NPX)

## 🚀 One Command, Zero Setup

**No installation needed!** Just use `npx`:

```bash
npx ultimate-mcp-server
```

That's it. Seriously. 

## Configure Your IDE

### For Claude Desktop

**Windows:**
```json
// %APPDATA%\Claude\claude_desktop_config.json
{
  "mcpServers": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

**Mac:**
```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### For Cursor

```json
// .cursorrules or .mcp.json in your project
{
  "mcpServers": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### For Windsurf

```json
// .windsurf/mcp.json
{
  "mcpServers": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### For VS Code (with Continue)

```json
// .vscode/settings.json
{
  "continue.mcpServers": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"]
    }
  }
}
```

## How It Works

When you use `npx ultimate-mcp-server`:

1. **NPX automatically downloads** the latest version
2. **Runs it directly** - no global install
3. **Uses in-memory storage** - no databases needed
4. **All features work** - 100+ tools available instantly

## What About Databases?

**YOU DON'T NEED THEM!** 

The MCP automatically uses in-memory storage when Redis/PostgreSQL aren't available:

```javascript
// This happens automatically:
No Redis? → In-memory cache (works perfectly!)
No PostgreSQL? → In-memory storage (works perfectly!)
```

## Features Without Any Setup

| Feature | Status | Notes |
|---------|--------|-------|
| AI Chat | ✅ | Full GPT-4, Claude, etc. |
| Prompt Caching | ✅ | Saves 75% on tokens |
| Code Analysis | ✅ | All languages supported |
| Browser Automation | ✅ | Playwright/Puppeteer |
| Web Search | ✅ | Real-time results |
| File Operations | ✅ | Read/write/edit |
| Cost Tracking | ✅ | Per-session tracking |

## Common Questions

**Q: Do I need to install anything?**
A: Just Node.js. NPX handles the rest.

**Q: What about Windows?**
A: Works perfectly! No WSL or Docker needed.

**Q: Will my data persist?**
A: During your session, yes. Resets on restart (which is usually fine).

**Q: Can I add Redis later?**
A: Yes! Just add `REDIS_URL` to env if you want persistence.

**Q: Is it slower without databases?**
A: Actually faster! In-memory is the fastest storage.

## Environment Variables (All Optional)

```json
{
  "env": {
    // Pick any AI provider (need at least one)
    "OPENAI_API_KEY": "sk-...",
    "ANTHROPIC_API_KEY": "sk-ant-...",
    "GOOGLE_API_KEY": "...",
    
    // Completely optional - works without these!
    "REDIS_URL": "redis://...",        // Only if you want persistence
    "DATABASE_URL": "postgresql://..." // Only if you want long-term storage
  }
}
```

## Quick Test

```bash
# Test if NPX works
npx ultimate-mcp-server --version

# List available tools
npx ultimate-mcp-server --tools

# Run in test mode
npx ultimate-mcp-server --test
```

## The NPX Advantage

✅ **No installation** - Always runs latest version
✅ **No permissions issues** - Runs in user space
✅ **No PATH problems** - NPX finds it automatically
✅ **Cross-platform** - Same command everywhere
✅ **No cleanup** - Nothing to uninstall

## One Command for All Platforms

```bash
# Windows Command Prompt
npx ultimate-mcp-server

# Windows PowerShell  
npx ultimate-mcp-server

# Mac Terminal
npx ultimate-mcp-server

# Linux Shell
npx ultimate-mcp-server

# WSL (if you insist)
npx ultimate-mcp-server
```

**Same command, everywhere!**

## TL;DR

1. Have Node.js? ✅
2. Run: `npx ultimate-mcp-server` 
3. There is no step 3

That's the entire installation guide. Really. 🎉