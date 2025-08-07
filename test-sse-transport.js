#!/usr/bin/env node
// Test script for SSE transport

const axios = require('axios');
const EventSource = require('eventsource');

const BASE_URL = 'http://localhost:3000';
let clientId = null;

async function connectSSE() {
  console.log('🔌 Connecting to SSE endpoint...');
  
  const eventSource = new EventSource(`${BASE_URL}/sse`);
  
  eventSource.onopen = () => {
    console.log('✅ SSE connection established');
  };
  
  eventSource.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    clientId = data.clientId;
    console.log(`📝 Client ID: ${clientId}`);
  });
  
  eventSource.addEventListener('response', (event) => {
    const data = JSON.parse(event.data);
    console.log('📨 Response:', JSON.stringify(data, null, 2));
  });
  
  eventSource.addEventListener('heartbeat', (event) => {
    console.log('💓 Heartbeat received');
  });
  
  eventSource.onerror = (error) => {
    console.error('❌ SSE error:', error);
  };
  
  return eventSource;
}

async function testRPC(method, params) {
  if (!clientId) {
    console.error('❌ No client ID available');
    return;
  }
  
  try {
    const response = await axios.post(`${BASE_URL}/rpc`, {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now()
    }, {
      headers: {
        'X-Client-ID': clientId,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ RPC ${method} success:`, response.data);
  } catch (error) {
    console.error(`❌ RPC ${method} failed:`, error.response?.data || error.message);
  }
}

async function testHTTP() {
  try {
    // Test health endpoint
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('🏥 Health check:', health.data);
    
    // Test tools endpoint
    const tools = await axios.get(`${BASE_URL}/tools`);
    console.log('🔧 Available tools:', tools.data);
  } catch (error) {
    console.error('❌ HTTP test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Testing Ultimate MCP SSE Transport\n');
  
  // Connect to SSE
  const eventSource = await connectSSE();
  
  // Wait for connection
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test HTTP endpoints
  await testHTTP();
  
  // Test RPC calls
  if (clientId) {
    await testRPC('tools/list', {});
    await testRPC('tools/call', {
      name: 'ask',
      arguments: {
        prompt: 'What is 2+2?',
        model: 'openai/gpt-4o-mini'
      }
    });
  }
  
  // Keep connection alive for a bit
  setTimeout(() => {
    console.log('\n👋 Closing connection...');
    eventSource.close();
    process.exit(0);
  }, 30000);
}

// Check if EventSource is available
try {
  require('eventsource');
} catch (error) {
  console.error('❌ Please install eventsource: npm install eventsource');
  process.exit(1);
}

main().catch(console.error);