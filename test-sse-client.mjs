#!/usr/bin/env node
// SSE Client test script

import EventSource from 'eventsource';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
let clientId = null;

console.error('🔌 SSE Client Test - Connecting to Ultimate MCP Server...\n');

// Create EventSource connection
const eventSource = new EventSource(`${BASE_URL}/sse`);

// Handle connection
eventSource.onopen = () => {
  console.error('✅ Connected to SSE server');
};

// Handle connected event
eventSource.addEventListener('connected', (event) => {
  const data = JSON.parse(event.data);
  clientId = data.clientId;
  console.error(`📝 Received client ID: ${clientId}`);
  
  // Now test some RPC calls
  testRPCCalls();
});

// Handle response events
eventSource.addEventListener('response', (event) => {
  const data = JSON.parse(event.data);
  console.error('📨 Received response:', JSON.stringify(data, null, 2));
});

// Handle heartbeat
eventSource.addEventListener('heartbeat', (event) => {
  console.error('💓 Heartbeat received');
});

// Handle errors
eventSource.onerror = (error) => {
  console.error('❌ SSE error:', error);
  if (eventSource.readyState === EventSource.CLOSED) {
    console.error('Connection closed');
    process.exit(1);
  }
};

// Test RPC calls
async function testRPCCalls() {
  console.error('\n🧪 Testing RPC calls...\n');
  
  try {
    // Test 1: List tools
    console.error('1️⃣ Testing tools/list...');
    const toolsResponse = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 1
    }, {
      headers: {
        'X-Client-ID': clientId,
        'Content-Type': 'application/json'
      }
    });
    console.error('Tools available:', toolsResponse.data.result?.tools?.length || 0);
    
    // Test 2: Call a simple tool
    console.error('\n2️⃣ Testing tools/call with ask tool...');
    const askResponse = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'ask',
        arguments: {
          prompt: 'What is 2+2?',
          model: 'openai/gpt-4o-mini'
        }
      },
      id: 2
    }, {
      headers: {
        'X-Client-ID': clientId,
        'Content-Type': 'application/json'
      }
    });
    
    console.error('Ask tool response:', askResponse.data);
    
    // Test 3: Health check
    console.error('\n3️⃣ Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.error('Health status:', health.data);
    
  } catch (error) {
    console.error('❌ RPC test failed:', error.response?.data || error.message);
  }
  
  // Keep connection alive for 30 seconds
  console.error('\n⏳ Keeping connection alive for 30 seconds...');
  setTimeout(() => {
    console.error('\n👋 Closing connection...');
    eventSource.close();
    process.exit(0);
  }, 30000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.error('\n👋 Interrupted, closing connection...');
  eventSource.close();
  process.exit(0);
});