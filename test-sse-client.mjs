#!/usr/bin/env node
// SSE Client test script

import EventSource from 'eventsource';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
let clientId = null;

console.log('🔌 SSE Client Test - Connecting to Ultimate MCP Server...\n');

// Create EventSource connection
const eventSource = new EventSource(`${BASE_URL}/sse`);

// Handle connection
eventSource.onopen = () => {
  console.log('✅ Connected to SSE server');
};

// Handle connected event
eventSource.addEventListener('connected', (event) => {
  const data = JSON.parse(event.data);
  clientId = data.clientId;
  console.log(`📝 Received client ID: ${clientId}`);
  
  // Now test some RPC calls
  testRPCCalls();
});

// Handle response events
eventSource.addEventListener('response', (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 Received response:', JSON.stringify(data, null, 2));
});

// Handle heartbeat
eventSource.addEventListener('heartbeat', (event) => {
  console.log('💓 Heartbeat received');
});

// Handle errors
eventSource.onerror = (error) => {
  console.error('❌ SSE error:', error);
  if (eventSource.readyState === EventSource.CLOSED) {
    console.log('Connection closed');
    process.exit(1);
  }
};

// Test RPC calls
async function testRPCCalls() {
  console.log('\n🧪 Testing RPC calls...\n');
  
  try {
    // Test 1: List tools
    console.log('1️⃣ Testing tools/list...');
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
    console.log('Tools available:', toolsResponse.data.result?.tools?.length || 0);
    
    // Test 2: Call a simple tool
    console.log('\n2️⃣ Testing tools/call with ask tool...');
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
    
    console.log('Ask tool response:', askResponse.data);
    
    // Test 3: Health check
    console.log('\n3️⃣ Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('Health status:', health.data);
    
  } catch (error) {
    console.error('❌ RPC test failed:', error.response?.data || error.message);
  }
  
  // Keep connection alive for 30 seconds
  console.log('\n⏳ Keeping connection alive for 30 seconds...');
  setTimeout(() => {
    console.log('\n👋 Closing connection...');
    eventSource.close();
    process.exit(0);
  }, 30000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Interrupted, closing connection...');
  eventSource.close();
  process.exit(0);
});