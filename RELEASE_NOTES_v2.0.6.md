# Ultimate MCP Server v2.0.6 Release Notes

## 🐛 Critical Bug Fixes

### Fixed MCP Client Compatibility Issues
- **Resolved postinstall script failure** that prevented proper installation via npm/npx
- **Fixed stdio transport handling** to ensure compatibility with Claude Code, Cursor, and other MCP clients
- **Removed problematic postinstall script** that was causing MODULE_NOT_FOUND errors

### Key Changes
1. **Removed postinstall script** from package.json to prevent installation failures
2. **Improved bin wrapper** to handle stdio protocol correctly
3. **Added make-executable.js** to distributed files for proper binary permissions
4. **Fixed dynamic import issues** in the CLI wrapper

## ✅ Compatibility Verified With
- Claude Desktop ✅
- Claude Code ✅
- Cursor ✅
- Windsurf ✅
- VS Code (Continue) ✅
- npx execution ✅

## 🔧 Installation
```bash
# Via npx (recommended)
npx ultimate-mcp-server

# Or install globally
npm install -g ultimate-mcp-server

# Add to Claude Code
claude mcp add ultimate npx ultimate-mcp-server
```

## 📝 Testing Performed
- ✅ Basic stdio protocol communication
- ✅ Tool registration and listing
- ✅ Initialize/handshake sequence
- ✅ npm/npx installation flow
- ✅ Binary execution permissions

## 🚀 How to Update
```bash
# If installed globally
npm update -g ultimate-mcp-server

# For Claude Code users
# Update your .mcp.json to use the latest version
```

## 📋 Migration Notes
No breaking changes. This is a bug fix release that restores compatibility with MCP clients.

---

**Important**: If you're experiencing issues after updating, try:
1. Clear npm cache: `npm cache clean --force`
2. Reinstall: `npm install -g ultimate-mcp-server@latest`
3. Restart your MCP client (Claude Code, Cursor, etc.)