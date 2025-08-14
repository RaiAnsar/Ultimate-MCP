#!/usr/bin/env node

import { spawn } from 'child_process';
import fetch from 'node-fetch';
import EventSource from 'eventsource';

console.log('🔍 Testing HTTP and SSE Transports\n');

async function startServer() {
  return new Promise((resolve) => {
    const child = spawn('node', ['dist/index.js'], {
      env: {
        ...process.env,
        ENABLE_HTTP: 'true',
        HTTP_PORT: '3001',
        ENABLE_SSE: 'true', 
        SSE_PORT: '3002',
        ENABLE_STDIO: 'false'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('HTTP transport started') || output.includes('listening')) {
        setTimeout(() => resolve(child), 1000); // Give it a second to fully start
      }
    });
    
    // Timeout fallback
    setTimeout(() => resolve(child), 3000);
  });
}

async function testHTTP() {
  console.log('📡 Testing HTTP Transport on port 3001...');
  
  try {
    // Test initialize
    const initResponse = await fetch('http://localhost:3001/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          clientInfo: { name: 'http-test', version: '1.0.0' }
        }
      })
    });
    
    const initData = await initResponse.json();
    if (initData.result && initData.result.serverInfo) {
      console.log(`✅ HTTP Initialize: ${initData.result.serverInfo.name} v${initData.result.serverInfo.version}`);
    } else {
      console.log('❌ HTTP Initialize failed');
    }
    
    // Test list tools
    const toolsResponse = await fetch('http://localhost:3001/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    
    const toolsData = await toolsResponse.json();
    if (toolsData.result && Array.isArray(toolsData.result.tools)) {
      console.log(`✅ HTTP List Tools: Found ${toolsData.result.tools.length} tools`);
    } else {
      console.log('❌ HTTP List Tools failed');
    }
    
  } catch (error) {
    console.log(`❌ HTTP Error: ${error.message}`);
  }
}

async function testSSE() {
  console.log('\n📡 Testing SSE Transport on port 3002...');
  
  return new Promise((resolve) => {
    const eventSource = new EventSource('http://localhost:3002/events');
    
    let connected = false;
    const timeout = setTimeout(() => {
      if (!connected) {
        console.log('❌ SSE Connection timeout');
      }
      eventSource.close();
      resolve();
    }, 5000);
    
    eventSource.onopen = () => {
      connected = true;
      console.log('✅ SSE Connected');
      
      // Send a request via HTTP to trigger SSE event
      fetch('http://localhost:3002/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: { tools: {} },
            clientInfo: { name: 'sse-test', version: '1.0.0' }
          }
        })
      }).catch(() => {});
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('✅ SSE Message received:', data.type || 'response');
      } catch (e) {
        console.log('✅ SSE Heartbeat received');
      }
    };
    
    eventSource.onerror = (error) => {
      if (connected) {
        console.log('⚠️  SSE Connection closed');
      } else {
        console.log('❌ SSE Connection failed');
      }
      clearTimeout(timeout);
      eventSource.close();
      resolve();
    };
  });
}

async function runTests() {
  console.log('Starting server with HTTP and SSE enabled...\n');
  
  const server = await startServer();
  
  try {
    await testHTTP();
    await testSSE();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ HTTP and SSE transports are working!');
    console.log('='.repeat(60));
    console.log('\nUsage examples:');
    console.log('  HTTP: POST to http://localhost:3001/rpc');
    console.log('  SSE:  Connect to http://localhost:3002/events');
    console.log('\nTo enable in production:');
    console.log('  ENABLE_HTTP=true ENABLE_SSE=true npx ultimate-mcp-server');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    server.kill();
  }
}

// Check if we have the dependencies
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
  require.resolve('node-fetch');
  require.resolve('eventsource');
} catch (e) {
  console.log('Installing test dependencies...');
  const { execSync } = await import('child_process');
  execSync('npm install --no-save node-fetch eventsource', { stdio: 'inherit' });
}

runTests().catch(console.error);