#!/usr/bin/env node

import { spawn } from 'child_process';

// Test minimal MCP interaction
const child = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle stdout
child.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

// Handle stderr
child.stderr.on('data', (data) => {
  console.error('Debug:', data.toString());
});

// Handle exit
child.on('exit', (code) => {
  console.log('Process exited with code:', code);
});

// Send initialization
const initRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    },
    capabilities: {}
  }
};

console.log('Sending init request...');
child.stdin.write(JSON.stringify(initRequest) + '\n');

// After 1 second, send a tools/list request
setTimeout(() => {
  const listRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  };
  console.log('Sending tools/list request...');
  child.stdin.write(JSON.stringify(listRequest) + '\n');
  
  // Exit after another second
  setTimeout(() => {
    child.stdin.end();
  }, 1000);
}, 1000);