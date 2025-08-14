# Ultimate MCP Server - Cursor/Claude Code Fix

## Problem Identified
The MCP server wasn't working with Cursor and Claude Code due to:
1. Dynamic import issues in the bin wrapper
2. Postinstall script failures
3. Module resolution problems with npm packages

## Solution Applied (v2.0.7)
1. **Simplified bin/ultimate-mcp.js** - Removed dynamic imports, now directly imports the main server
2. **Removed postinstall script** - Was causing installation failures
3. **Added required files to npm package** - Included scripts/make-executable.js

## Temporary Workaround (Until v2.0.7 is published)

### For Cursor Users
Edit your Cursor MCP configuration to point to the local fixed version:

```json
{
  "mcpServers": {
    "ultimate-mcp": {
      "command": "node",
      "args": ["/Users/rai/Documents/MCP/ultimate-mcp-server/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### For Claude Code Users
```bash
# Use the local version directly
claude mcp add ultimate node /Users/rai/Documents/MCP/ultimate-mcp-server/dist/index.js
```

## Once v2.0.7 is Published

### For Cursor Users
```json
{
  "mcpServers": {
    "ultimate-mcp": {
      "command": "npx",
      "args": ["-y", "ultimate-mcp-server@2.0.7"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### For Claude Code Users
```bash
claude mcp add ultimate npx ultimate-mcp-server@2.0.7
```

## Testing the Fix
Test with this command:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test","version":"1.0.0"},"capabilities":{}}}' | npx ultimate-mcp-server@2.0.7
```

Expected response:
```json
{
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "resources": {},
      "prompts": {},
      "logging": {}
    },
    "serverInfo": {
      "name": "ultimate-mcp-server",
      "version": "2.0.7"
    }
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

## Publishing Status
- Version 2.0.7 is ready but rate-limited on npm
- Wait 5-10 minutes before retrying: `npm publish --otp YOUR_OTP`
- The package is built and ready in dist/

## What Changed in the Code

### Before (bin/ultimate-mcp.js):
```javascript
if (command === 'install' || ...) {
  import('../dist/cli.js');
} else {
  import('../dist/index.js');
}
```

### After (bin/ultimate-mcp.js):
```javascript
#!/usr/bin/env node

// Direct execution for MCP server
// This ensures stdio protocol works correctly with all MCP clients
import '../dist/index.js';
```

This simpler approach ensures the server starts immediately and handles stdio correctly.