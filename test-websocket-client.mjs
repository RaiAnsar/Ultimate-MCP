#!/usr/bin/env node
// WebSocket Client test script

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3002/ws';
let ws = null;

console.error('🔌 WebSocket Client Test - Connecting to Ultimate MCP Server...\n');

// Create WebSocket connection
ws = new WebSocket(WS_URL);

// Connection opened
ws.on('open', () => {
  console.error('✅ Connected to WebSocket server');
  
  // Test authentication if needed
  if (process.env.AUTH_API_KEY) {
    console.error('🔐 Sending authentication...');
    ws.send(JSON.stringify({
      type: 'auth',
      apiKey: process.env.AUTH_API_KEY
    }));
  }
  
  // Send a ping
  ws.send(JSON.stringify({
    type: 'ping'
  }));
});

// Listen for messages
ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.error('📨 Received:', JSON.stringify(message, null, 2));
  
  // Handle different message types
  switch (message.type) {
    case 'connected':
      console.error(`📝 Client ID: ${message.clientId}`);
      // Start testing RPC calls
      testRPCCalls();
      break;
      
    case 'pong':
      console.error('🏓 Pong received');
      break;
      
    case 'auth_success':
      console.error('✅ Authentication successful');
      break;
      
    case 'rpc_response':
      console.error('📊 RPC Response:', message.payload);
      break;
      
    case 'broadcast':
      console.error(`📢 Broadcast (${message.event}):`, message.data);
      break;
      
    case 'error':
      console.error('❌ Error:', message.error);
      break;
  }
});

// Connection closed
ws.on('close', (code, reason) => {
  console.error(`❌ Connection closed: ${code} - ${reason}`);
});

// Connection error
ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

// Test RPC calls
async function testRPCCalls() {
  console.error('\n🧪 Testing RPC calls...\n');
  
  // Test 1: List tools
  console.error('1️⃣ Testing tools/list...');
  ws.send(JSON.stringify({
    type: 'rpc',
    payload: {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 1
    }
  }));
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Call a simple tool
  console.error('\n2️⃣ Testing tools/call with ask tool...');
  ws.send(JSON.stringify({
    type: 'rpc',
    payload: {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'ask',
        arguments: {
          prompt: 'What is the capital of France?',
          model: 'openai/gpt-4o-mini'
        }
      },
      id: 2
    }
  }));
  
  // Test 3: Update context
  console.error('\n3️⃣ Testing context update...');
  ws.send(JSON.stringify({
    type: 'context_update',
    context: {
      user: 'test-user',
      session: 'test-session',
      preferences: {
        model: 'openai/gpt-4o-mini'
      }
    }
  }));
  
  // Keep connection alive for 30 seconds
  console.error('\n⏳ Keeping connection alive for 30 seconds...');
  
  // Send periodic pings
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 10000);
  
  setTimeout(() => {
    clearInterval(pingInterval);
    console.error('\n👋 Closing connection...');
    ws.close();
    process.exit(0);
  }, 30000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.error('\n👋 Interrupted, closing connection...');
  if (ws) {
    ws.close();
  }
  process.exit(0);
});