# Task Master Compatibility Note

## Issue
Claude Task Master is designed specifically for editor integrations (Cursor, Windsurf, VS Code) and is not fully compatible with Claude Desktop/CLI's MCP implementation.

## Why It Doesn't Work
1. **Different MCP Implementations**: Task Master uses editor-specific MCP configs (mcp.json) while Claude uses a different configuration system
2. **Configuration Warnings**: Task Master expects to run in a project directory with .taskmaster config
3. **Protocol Differences**: The MCP protocol implementation differs between editors and Claude Desktop

## Alternative Solutions

### 1. Use Built-in Task Management
Claude Code already has excellent task management:
- **TodoWrite/TodoRead**: For session-level task tracking
- **Ultimate MCP Server**: For code generation and orchestration

### 2. Enhanced Todo System
We could enhance the existing todo system to add:
- Task persistence across sessions
- PRD parsing capabilities
- Task prioritization and dependencies

### 3. Create Custom Task Manager
Build a Claude-compatible task management MCP server that:
- Parses PRDs and requirements
- Integrates with TodoWrite/Read
- Provides research capabilities
- Works seamlessly with Claude's MCP system

## Recommendation
For now, use the existing TodoWrite/TodoRead tools combined with Ultimate MCP Server for:
- Quick task management (TodoWrite)
- Complex implementations (Ultimate MCP)
- Multi-step planning (combine both)

Task Master remains available for editor integrations but cannot be used directly with Claude Desktop/CLI.