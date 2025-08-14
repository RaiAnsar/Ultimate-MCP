#!/usr/bin/env node

// Direct stdio test - minimal implementation
process.stdin.on('data', (chunk) => {
  try {
    const data = chunk.toString();
    const request = JSON.parse(data);
    
    if (request.method === 'initialize') {
      const response = {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2025-06-18",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "test-server",
            version: "1.0.0"
          }
        }
      };
      
      // Write to stdout for MCP protocol
      process.stdout.write(JSON.stringify(response) + '\n');
      process.exit(0);
    }
  } catch (e) {
    // Errors go to stderr
    process.stderr.write('Error: ' + e.message + '\n');
  }
});

// Keep process alive
process.stdin.resume();