# Ultimate MCP Server - HTTP & SSE Transport Guide

## ✅ Yes, HTTP and SSE are fully supported!

Ultimate MCP Server v2.0.4 includes complete implementations of both HTTP and SSE (Server-Sent Events) transports, in addition to the default stdio transport.

## 🚀 Quick Start

### Enable HTTP Transport
```bash
# Run with HTTP enabled on port 3001
ENABLE_HTTP=true HTTP_PORT=3001 npx ultimate-mcp-server

# Or with custom host
ENABLE_HTTP=true HTTP_HOST=0.0.0.0 HTTP_PORT=8080 npx ultimate-mcp-server
```

### Enable SSE Transport
```bash
# Run with SSE enabled on port 3002
ENABLE_SSE=true SSE_PORT=3002 npx ultimate-mcp-server

# SSE provides real-time event streaming
```

### Enable Both HTTP and SSE
```bash
# Run with both transports
ENABLE_HTTP=true HTTP_PORT=3001 ENABLE_SSE=true SSE_PORT=3002 npx ultimate-mcp-server
```

### Enable All Transports
```bash
# Run with stdio, HTTP, SSE, and WebSocket
ENABLE_STDIO=true ENABLE_HTTP=true ENABLE_SSE=true ENABLE_WEBSOCKET=true npx ultimate-mcp-server
```

## 📡 HTTP Transport Features

### JSON-RPC Endpoint
```bash
# Main RPC endpoint
POST http://localhost:3001/rpc

# Example request
curl -X POST http://localhost:3001/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### REST-style Endpoints
```bash
# List all tools
GET http://localhost:3001/tools

# Execute a specific tool
POST http://localhost:3001/tools/{toolName}/execute

# List resources
GET http://localhost:3001/resources

# Read a resource
GET http://localhost:3001/resources/{uri}

# List prompts
GET http://localhost:3001/prompts

# Get a specific prompt
GET http://localhost:3001/prompts/{name}
```

### Session Management
HTTP transport includes session support:
- Sessions automatically created on first request
- 30-minute timeout by default
- Session ID via `x-session-id` header
- Context preserved across requests in same session

### Example HTTP Usage
```javascript
// Initialize
const response = await fetch('http://localhost:3001/rpc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      clientInfo: { name: 'my-client', version: '1.0.0' }
    }
  })
});

// Call a tool
const toolResponse = await fetch('http://localhost:3001/rpc', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-session-id': 'my-session-123'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'ask',
      arguments: {
        prompt: 'What is TypeScript?',
        model: 'openai/gpt-4o-mini'
      }
    }
  })
});
```

## 📨 SSE Transport Features

### Event Stream Endpoint
```bash
# Connect to SSE stream
GET http://localhost:3002/events

# The stream provides real-time updates
```

### RPC Endpoint for SSE
```bash
# Send requests that trigger SSE events
POST http://localhost:3002/rpc
```

### Event Types
- `connection`: Initial connection established
- `response`: RPC response events
- `notification`: Server notifications
- `heartbeat`: Keep-alive events (every 30s)
- `error`: Error notifications

### Example SSE Usage
```javascript
// Connect to SSE stream
const eventSource = new EventSource('http://localhost:3002/events');

eventSource.onopen = () => {
  console.log('Connected to SSE');
};

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Send requests via RPC endpoint
fetch('http://localhost:3002/rpc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  })
});
```

## 🔒 Security Features

### Authentication Support
Both HTTP and SSE transports support authentication:

```bash
# Basic Auth
HTTP_AUTH_TYPE=basic HTTP_AUTH_USER=admin HTTP_AUTH_PASS=secret npx ultimate-mcp-server

# Bearer Token
HTTP_AUTH_TYPE=bearer HTTP_AUTH_TOKEN=your-token npx ultimate-mcp-server

# API Key
HTTP_AUTH_TYPE=api-key HTTP_AUTH_KEY=your-api-key npx ultimate-mcp-server
```

### CORS Configuration
```bash
# Enable CORS with specific origin
HTTP_CORS_ORIGIN=https://example.com HTTP_CORS_CREDENTIALS=true npx ultimate-mcp-server

# Allow all origins (development only!)
HTTP_CORS_ORIGIN=* npx ultimate-mcp-server
```

## 🎯 Use Cases

### HTTP Transport Best For:
- **Web applications** - Direct integration with frontend apps
- **API gateways** - RESTful API exposure
- **Microservices** - Service-to-service communication
- **Testing** - Easy to test with curl/Postman
- **Stateless operations** - Request/response patterns

### SSE Transport Best For:
- **Real-time updates** - Live streaming of results
- **Long-running operations** - Progress notifications
- **Event-driven architectures** - Push notifications
- **Dashboard applications** - Live metrics and monitoring
- **Chat applications** - Streaming AI responses

## 🔧 Configuration Options

### Environment Variables
```bash
# HTTP Configuration
ENABLE_HTTP=true          # Enable HTTP transport
HTTP_HOST=localhost       # Host to bind (default: localhost)
HTTP_PORT=3001           # Port to bind (default: 3001)
HTTP_AUTH_TYPE=none      # Auth type: none, basic, bearer, api-key
HTTP_AUTH_USER=          # Username for basic auth
HTTP_AUTH_PASS=          # Password for basic auth
HTTP_AUTH_TOKEN=         # Bearer token
HTTP_AUTH_KEY=           # API key
HTTP_CORS_ORIGIN=*       # CORS origin
HTTP_CORS_CREDENTIALS=   # CORS credentials

# SSE Configuration
ENABLE_SSE=true          # Enable SSE transport
SSE_HOST=localhost       # Host to bind (default: localhost)
SSE_PORT=3002           # Port to bind (default: 3002)
SSE_AUTH_TYPE=none      # Auth type (same as HTTP)
SSE_HEARTBEAT=30000     # Heartbeat interval in ms
```

## 🧪 Testing

### Test HTTP Transport
```bash
# List tools via HTTP
curl http://localhost:3001/tools

# Execute a tool
curl -X POST http://localhost:3001/tools/get_metrics/execute \
  -H "Content-Type: application/json" \
  -d '{"type": "system"}'
```

### Test SSE Transport
```bash
# Connect to SSE stream (will show events)
curl -N http://localhost:3002/events

# In another terminal, send a request
curl -X POST http://localhost:3002/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## 📊 Performance

- **HTTP**: Handles 1000+ concurrent connections
- **SSE**: Supports 100+ simultaneous streams
- **Session cleanup**: Automatic every 60 seconds
- **Heartbeat**: Keeps connections alive
- **Rate limiting**: Built-in protection

## 🔄 Multi-Transport Mode

You can run multiple transports simultaneously:

```bash
# All transports at once
ENABLE_STDIO=true \
ENABLE_HTTP=true HTTP_PORT=3001 \
ENABLE_SSE=true SSE_PORT=3002 \
ENABLE_WEBSOCKET=true WS_PORT=3003 \
npx ultimate-mcp-server
```

The server will:
1. Start all enabled transports
2. Route requests appropriately
3. Share the same tool registry
4. Maintain separate contexts per transport

## 🎉 Summary

**Yes, HTTP and SSE are fully implemented and working!**

- ✅ Complete HTTP REST API
- ✅ Full SSE event streaming
- ✅ Session management
- ✅ Authentication support
- ✅ CORS handling
- ✅ Multi-transport capability
- ✅ Production-ready

Use HTTP for request/response patterns and SSE for real-time streaming. Both can run simultaneously alongside stdio transport!