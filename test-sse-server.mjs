#!/usr/bin/env node
// Test script to run the Ultimate MCP Server with SSE enabled

import { UltimateMCPServer } from './dist/core/server.js';
import { config } from 'dotenv';

// Load environment variables
config();

console.error('🚀 Starting Ultimate MCP Server with SSE transport...\n');

// Set environment variables for SSE
process.env.ENABLE_SSE = 'true';
process.env.SSE_PORT = '3000';
process.env.DISABLE_STDIO = 'false';

// Create server with SSE transport
const server = new UltimateMCPServer({
  name: 'ultimate-mcp-server',
  version: '2.0.0',
  transports: [
    { type: 'stdio' },
    { 
      type: 'sse', 
      port: 3000,
      host: 'localhost',
      cors: {
        origin: '*',
        credentials: true
      }
    }
  ]
});

// Start the server
server.start().then(() => {
  console.error('✅ Server started successfully');
  console.error('\nAvailable transports:');
  const status = server.getTransportStatus();
  if (status) {
    console.error(JSON.stringify(status, null, 2));
  }
  
  console.error('\nSSE Endpoints:');
  console.error('- GET  http://localhost:3000/sse    - SSE connection');
  console.error('- POST http://localhost:3000/rpc    - RPC endpoint');
  console.error('- GET  http://localhost:3000/health - Health check');
  console.error('\nPress Ctrl+C to stop the server.\n');
}).catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('\n👋 Shutting down server...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n👋 Shutting down server...');
  await server.stop();
  process.exit(0);
});