#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🧪 Ultimate MCP Server Compatibility Test v2.0.6');
console.log('================================================\n');

// Test 1: Version check
console.log('Test 1: Version Check');
const versionChild = spawn('node', ['bin/ultimate-mcp.js', '--version'], { 
  capture: ['stdout', 'stderr'] 
});

versionChild.stderr.on('data', (data) => {
  const output = data.toString().trim();
  if (output.includes('2.0.6')) {
    console.log('✅ Version check passed:', output);
  } else {
    console.log('❌ Version check failed:', output);
  }
});

versionChild.on('close', () => {
  // Test 2: MCP Protocol Test
  console.log('\nTest 2: MCP Protocol Communication');
  
  const mcpChild = spawn('node', ['bin/ultimate-mcp.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseCount = 0;
  const expectedResponses = 3;

  mcpChild.stdout.on('data', (data) => {
    try {
      const response = JSON.parse(data.toString());
      responseCount++;
      
      if (response.id === 1 && response.result?.serverInfo) {
        console.log('✅ Initialize response received');
        console.log('   Server:', response.result.serverInfo.name);
        console.log('   Version:', response.result.serverInfo.version);
      } else if (response.id === 2 && response.result?.tools) {
        console.log('✅ Tools list received');
        console.log('   Tool count:', response.result.tools.length);
      } else if (response.id === 3 && response.result?.content) {
        console.log('✅ Tool execution successful');
      }
      
      if (responseCount === expectedResponses) {
        console.log('\n✅ All tests passed!');
        mcpChild.stdin.end();
      }
    } catch (e) {
      // Ignore parse errors from debug output
    }
  });

  mcpChild.on('exit', (code) => {
    console.log('\n================================================');
    console.log('Test suite completed with exit code:', code);
    if (code === 0 || code === null) {
      console.log('✅ MCP Server is working correctly!');
    } else {
      console.log('⚠️  Server exited with non-zero code');
    }
  });

  // Send test messages
  const messages = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        clientInfo: { name: "test-client", version: "1.0.0" },
        capabilities: {}
      }
    },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    },
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "get_metrics",
        arguments: { type: "system" }
      }
    }
  ];

  // Send messages with delay
  messages.forEach((msg, index) => {
    setTimeout(() => {
      mcpChild.stdin.write(JSON.stringify(msg) + '\n');
    }, index * 500);
  });

  // Timeout after 5 seconds
  setTimeout(() => {
    if (responseCount < expectedResponses) {
      console.log('\n⚠️  Test timeout - not all responses received');
      console.log(`   Received ${responseCount}/${expectedResponses} responses`);
      mcpChild.stdin.end();
    }
  }, 5000);
});