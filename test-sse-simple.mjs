#!/usr/bin/env node
// Simple SSE transport test that can run directly

import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

// Create Express app for SSE
const app = express();
app.use(cors());
app.use(express.json());

// Track connected clients
const clients = new Map();

// SSE endpoint
app.get('/sse', (req, res) => {
  const clientId = uuidv4();
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Send connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);
  
  // Store client
  clients.set(clientId, res);
  console.log(`✅ Client connected: ${clientId}`);
  
  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {}\n\n');
  }, 30000);
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
    console.log(`❌ Client disconnected: ${clientId}`);
  });
});

// RPC endpoint
app.post('/rpc', (req, res) => {
  const clientId = req.headers['x-client-id'];
  const { method, params, id } = req.body;
  
  console.log(`📨 RPC request from ${clientId}: ${method}`);
  
  // Simple echo response for testing
  const response = {
    jsonrpc: '2.0',
    result: {
      method,
      params,
      echo: 'This is a test response',
      timestamp: new Date().toISOString()
    },
    id
  };
  
  // Send response via SSE if client is connected
  const client = clients.get(clientId);
  if (client) {
    client.write(`event: response\ndata: ${JSON.stringify(response)}\n\n`);
  }
  
  res.json(response);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    clients: clients.size
  });
});

// Start server
const PORT = process.env.SSE_PORT || 3000;
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 SSE Test Server running on http://localhost:${PORT}`);
  console.log(`
Available endpoints:
- GET  /sse     - SSE connection endpoint
- POST /rpc     - RPC endpoint (requires X-Client-ID header)
- GET  /health  - Health check

Press Ctrl+C to stop the server.
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  clients.forEach((client, id) => {
    client.end();
    console.log(`Closed connection: ${id}`);
  });
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});