# Ultimate MCP Platform Compatibility Guide

## Overview

Ultimate MCP is designed to work seamlessly with 30+ AI platforms and development tools. This guide provides detailed information about platform-specific configurations and compatibility.

## Supported Platforms

### Desktop Applications

#### Claude Desktop
- **Transport**: STDIO only
- **Configuration**: Automatic detection via environment
- **Special Features**: Native integration, no additional setup required
```json
{
  "mcpServers": {
    "ultimate-mcp": {
      "command": "npx",
      "args": ["-y", "ultimate-mcp-server"]
    }
  }
}
```

#### Cursor
- **Transport**: STDIO, SSE, HTTP, WebSocket
- **Configuration**: Add to `.cursor/mcp.json`
- **Special Features**: Full transport support, session management
```json
{
  "servers": {
    "ultimate-mcp": {
      "command": "npx",
      "args": ["ultimate-mcp-server"],
      "transport": "stdio"
    }
  }
}
```

#### Windsurf
- **Transport**: STDIO, SSE, HTTP
- **Configuration**: Add to windsurf settings
- **Special Features**: SSE streaming support
```json
{
  "mcp": {
    "ultimate": {
      "type": "sse",
      "url": "http://localhost:3000/sse"
    }
  }
}
```

#### VSCode
- **Transport**: STDIO, SSE, HTTP, WebSocket
- **Configuration**: Via extension settings
- **Special Features**: Extension host integration
```json
{
  "mcp.servers": {
    "ultimate": {
      "command": "npx",
      "args": ["ultimate-mcp-server"]
    }
  }
}
```

#### Cline
- **Transport**: STDIO, HTTP
- **Configuration**: Add to Cline settings
- **Special Features**: File access restrictions
```json
{
  "mcpServers": {
    "ultimate": {
      "transport": "http",
      "endpoint": "http://localhost:3000/api"
    }
  }
}
```

#### BoltAI
- **Transport**: All transports supported
- **Configuration**: API key required
- **Special Features**: WebSocket real-time updates
```json
{
  "servers": {
    "ultimate-mcp": {
      "transport": "websocket",
      "url": "ws://localhost:3000/ws",
      "apiKey": "bolt_your_api_key"
    }
  }
}
```

### Web Applications

#### LibreChat
- **Transport**: SSE, HTTP, WebSocket
- **Configuration**: Add to LibreChat config
- **Special Features**: CORS support, no file access
```yaml
mcp:
  ultimate:
    endpoint: http://localhost:3000/api
    transport: sse
```

#### Big-AGI
- **Transport**: SSE, HTTP, WebSocket
- **Configuration**: Environment variables
- **Special Features**: Metadata in responses
```env
BIG_AGI_MCP_ULTIMATE=http://localhost:3000/api
```

### CLI Tools

#### Claude CLI
- **Transport**: STDIO only
- **Configuration**: Automatic
- **Special Features**: Pipe support
```bash
claude --mcp ultimate-mcp-server
```

#### MCPHub
- **Transport**: All transports
- **Configuration**: Hub registry
- **Special Features**: Auto-discovery
```bash
mcphub add ultimate-mcp
```

### Development Tools

#### Continue
- **Transport**: STDIO, SSE, HTTP
- **Configuration**: `.continue/config.json`
```json
{
  "mcpServers": [{
    "name": "ultimate-mcp",
    "command": "npx",
    "args": ["ultimate-mcp-server"]
  }]
}
```

#### Aide
- **Transport**: STDIO, SSE, HTTP
- **Configuration**: Project settings
```json
{
  "aide.mcp.servers": {
    "ultimate": {
      "command": "npx ultimate-mcp-server"
    }
  }
}
```

## Transport Configuration

### STDIO (Standard Input/Output)
Default for desktop applications. No additional configuration needed.

```bash
npx ultimate-mcp-server
```

### HTTP/REST API
For web applications and remote access.

```bash
npx ultimate-mcp-server --transport http --port 3000
```

### Server-Sent Events (SSE)
For real-time streaming without WebSockets.

```bash
npx ultimate-mcp-server --transport sse --port 3000
```

### WebSocket
For bidirectional real-time communication.

```bash
npx ultimate-mcp-server --transport websocket --port 3000
```

## Platform-Specific Features

### Authentication

Some platforms require authentication:

- **BoltAI**: API key starting with `bolt_`
- **Cursor**: Session tokens
- **LibreChat**: Bearer tokens

### File Access

Platforms with file access restrictions:
- **LibreChat**: No file system access
- **Big-AGI**: No file system access
- **Model.Computer**: Limited file access
- **Cline**: Excludes node_modules and .git

### Environment Variables

Platforms that provide special environment variables:
- **Claude Desktop**: `CLAUDE_DESKTOP`, `CLAUDE_VERSION`
- **Cursor**: `CURSOR_IDE`, `CURSOR_VERSION`
- **VSCode**: `VSCODE_PID`, `TERM_PROGRAM`
- **Windsurf**: `WINDSURF`, `WINDSURF_VERSION`

## Testing Compatibility

Run compatibility tests for your platform:

```bash
# Test all platforms
npm run test:compatibility --all

# Test specific platform
npm run test:compatibility cursor

# Generate report
npm run test:compatibility --all --report
```

## Troubleshooting

### Common Issues

1. **Platform not detected**
   - Set `MCP_USER_AGENT` environment variable
   - Use explicit transport configuration

2. **Transport not supported**
   - Check platform compatibility matrix
   - Use recommended transport for platform

3. **Authentication failures**
   - Verify API keys/tokens
   - Check platform-specific auth requirements

4. **Performance issues**
   - Use appropriate transport for use case
   - Enable lazy loading for large tool sets

### Debug Mode

Enable debug logging:

```bash
DEBUG=ultimate-mcp:* npx ultimate-mcp-server
```

### Platform Detection

Force platform detection:

```bash
CLAUDE_DESKTOP=1 npx ultimate-mcp-server
```

## Performance Optimization

### By Platform Type

**Desktop Applications**
- Use STDIO for best performance
- Enable tool lazy loading
- Minimize memory usage

**Web Applications**
- Use HTTP with caching
- Enable compression
- Implement rate limiting

**CLI Tools**
- Optimize startup time
- Use streaming for large outputs
- Implement progress indicators

### Bundle Size Optimization

For platforms with size constraints:

```bash
# Production build with optimizations
npm run build:prod

# Minimal build (core features only)
npm run build:minimal
```

## Adding New Platform Support

To add support for a new platform:

1. Add platform to `platform-detector.ts`
2. Create platform adapter in `platform-adapter.ts`
3. Add compatibility tests
4. Update documentation

Example:

```typescript
// Add to SUPPORTED_PLATFORMS
NEW_PLATFORM: 'new-platform',

// Create adapter
class NewPlatformAdapter extends DefaultAdapter {
  platform = SUPPORTED_PLATFORMS.NEW_PLATFORM;
  
  // Implement platform-specific methods
}
```

## Best Practices

1. **Always test compatibility** before deployment
2. **Use recommended transport** for each platform
3. **Handle platform-specific quirks** gracefully
4. **Provide fallback options** for unsupported features
5. **Monitor performance** across platforms

## Support Matrix

| Feature | Desktop | Web | CLI | Mobile |
|---------|---------|-----|-----|---------|
| STDIO | ✅ | ❌ | ✅ | ❌ |
| HTTP | ✅ | ✅ | ✅ | ✅ |
| SSE | ✅ | ✅ | ❌ | ✅ |
| WebSocket | ✅ | ✅ | ❌ | ✅ |
| File Access | ✅ | ⚠️ | ✅ | ❌ |
| Streaming | ✅ | ✅ | ✅ | ✅ |
| Auth | ✅ | ✅ | ⚠️ | ✅ |

Legend:
- ✅ Full support
- ⚠️ Limited support
- ❌ Not supported

## Future Platform Support

Planned support for:
- IntelliJ IDEA / WebStorm
- Sublime Text
- Neovim
- Emacs
- Mobile applications
- Browser extensions

## Contributing

To contribute platform support:
1. Fork the repository
2. Add platform detection and adapter
3. Write compatibility tests
4. Submit pull request with documentation

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.