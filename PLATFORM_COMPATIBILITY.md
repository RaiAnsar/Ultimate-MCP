# Ultimate MCP Server - Platform Compatibility Guide

## ✅ Confirmed Working Platforms

### 1. **Claude Desktop** ✅
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

### 2. **Claude Code** ✅
```bash
# Direct installation
claude mcp add npx ultimate-mcp-server

# Or manual configuration
claude mcp add server ultimate-mcp "npx ultimate-mcp-server"
```

### 3. **Cursor** ✅
Cursor uses stdio transport (same as Claude). Add to `.cursorrules` or settings:
```json
{
  "mcp": {
    "servers": {
      "ultimate-mcp": {
        "command": "npx",
        "args": ["ultimate-mcp-server"]
      }
    }
  }
}
```

### 4. **Windsurf** ✅
Windsurf supports MCP through stdio. Configure in Windsurf settings:
```json
{
  "mcp.servers": {
    "ultimate-mcp": {
      "command": "npx",
      "args": ["ultimate-mcp-server"]
    }
  }
}
```

### 5. **VS Code (via Continue extension)** ✅
Install Continue extension, then add to `~/.continue/config.json`:
```json
{
  "models": [...],
  "mcpServers": {
    "ultimate-mcp": {
      "command": "npx",
      "args": ["ultimate-mcp-server"]
    }
  }
}
```

### 6. **Google AI Studio / Gemini** ✅
Gemini uses HTTP/SSE transport. Run the server with:
```bash
# Set environment variables for HTTP mode
export ENABLE_HTTP=true
export HTTP_PORT=3001
export ENABLE_SSE=true
export SSE_PORT=3000

# Run server
npx ultimate-mcp-server

# Or use platform-specific mode
npx ultimate-mcp-server --platform gemini
```

Then configure in Gemini/AI Studio to connect to:
- HTTP endpoint: `http://localhost:3001`
- SSE endpoint: `http://localhost:3000/events`

### 7. **ChatGPT** ⚠️
ChatGPT doesn't natively support MCP protocol yet, but you can:

**Option A: Use via API Bridge**
```bash
# Run Ultimate MCP with HTTP transport
export ENABLE_HTTP=true
export HTTP_PORT=3001
npx ultimate-mcp-server

# Use a bridge service to connect ChatGPT Custom GPT to the HTTP endpoint
```

**Option B: Use ChatGPT Desktop (if/when MCP support is added)**
The server is ready for when OpenAI adds MCP support.

## 🔧 Transport Modes

The server automatically detects and configures the appropriate transport:

| Platform | Primary Transport | Fallback Transport | Auto-Detected |
|----------|------------------|-------------------|---------------|
| Claude Desktop | stdio | - | ✅ |
| Claude Code | stdio | - | ✅ |
| Cursor | stdio | HTTP | ✅ |
| Windsurf | stdio | - | ✅ |
| VS Code | stdio | HTTP | ✅ |
| Gemini | HTTP + SSE | - | ✅ (with flag) |
| ChatGPT | HTTP | - | ❌ (needs bridge) |

## 🚀 Quick Setup Commands

### For stdio-based platforms (Claude, Cursor, Windsurf, VS Code):
```bash
# Just run - stdio is the default
npx ultimate-mcp-server
```

### For HTTP-based platforms (Gemini):
```bash
# Enable HTTP/SSE transports
ENABLE_HTTP=true ENABLE_SSE=true npx ultimate-mcp-server
```

### For testing multiple transports:
```bash
# Enable all transports
ENABLE_STDIO=true ENABLE_HTTP=true ENABLE_SSE=true ENABLE_WEBSOCKET=true npx ultimate-mcp-server
```

## 🔍 Verification

To verify the server is working with your platform:

1. **Check capabilities exposure:**
   - Should show 81+ tools available
   - Should NOT show "Capabilities: none"

2. **Test basic tool:**
   ```
   Ask the AI: "Use the get_metrics tool to show server metrics"
   ```

3. **Test AI orchestration:**
   ```
   Ask the AI: "Use the ask tool to query GPT-4 about Python"
   ```

## 📝 Platform-Specific Notes

### Cursor
- Cursor caches MCP connections, restart Cursor after configuration changes
- Check Cursor logs: `View > Output > MCP` for debugging

### Windsurf
- Windsurf may require explicit PATH configuration for npx
- Alternative: Use global installation instead of npx

### VS Code (Continue)
- Requires Continue extension v0.8.0 or later
- MCP servers restart when Continue reloads

### Gemini/Google AI Studio
- Requires CORS headers (automatically handled by the server)
- May need to whitelist localhost:3001 in browser settings

### ChatGPT
- No native MCP support yet
- Can use HTTP API with custom GPT actions
- Watch for updates from OpenAI on MCP support

## 🐛 Troubleshooting

### "Capabilities: none" error
✅ Fixed in v2.0.4 - update to latest version

### Server not connecting
1. Check Node.js version (requires v18+)
2. Clear npm cache: `npm cache clean --force`
3. Reinstall: `npm install -g ultimate-mcp-server@latest`

### Platform-specific issues
- **Cursor**: Restart Cursor completely
- **Windsurf**: Check Windsurf console for errors
- **VS Code**: Reload Continue extension
- **Gemini**: Check browser console for CORS errors

## 📊 Compatibility Matrix

| Feature | Claude | Cursor | Windsurf | VS Code | Gemini | ChatGPT |
|---------|--------|--------|----------|---------|---------|---------|
| stdio transport | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| HTTP transport | ❌ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ |
| SSE transport | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| WebSocket | 🔜 | 🔜 | 🔜 | 🔜 | 🔜 | ❌ |
| All 81 tools | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Auto-config | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ |

Legend:
- ✅ Fully supported
- ⚠️ Partial support / requires configuration
- ❌ Not supported
- 🔜 Coming soon

## 🎯 Summary

Ultimate MCP Server v2.0.4 works with:
- **Native MCP support**: Claude Desktop, Claude Code, Cursor, Windsurf, VS Code (Continue)
- **HTTP/SSE support**: Google Gemini, Google AI Studio
- **Future ready**: ChatGPT (when MCP support is added)

The stdio transport fix in v2.0.4 ensures compatibility with all stdio-based MCP clients!