#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';

console.log('🧪 Ultimate MCP Server Comprehensive Test Suite\n');

const tests = [
  {
    name: 'Initialize Request',
    request: {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        clientInfo: { name: "test", version: "1.0.0" }
      }
    },
    validateResponse: (response) => {
      return response.result && 
             response.result.protocolVersion === "2025-06-18" &&
             response.result.serverInfo &&
             response.result.capabilities;
    }
  },
  {
    name: 'List Tools Request',
    request: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    },
    validateResponse: (response) => {
      return response.result && 
             Array.isArray(response.result.tools) &&
             response.result.tools.length > 0;
    }
  },
  {
    name: 'List Resources Request',
    request: {
      jsonrpc: "2.0",
      id: 3,
      method: "resources/list",
      params: {}
    },
    validateResponse: (response) => {
      return response.result && 
             Array.isArray(response.result.resources);
    }
  },
  {
    name: 'List Prompts Request',
    request: {
      jsonrpc: "2.0",
      id: 4,
      method: "prompts/list",
      params: {}
    },
    validateResponse: (response) => {
      return response.result && 
             Array.isArray(response.result.prompts);
    }
  }
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let responseData = '';
    let errorData = '';
    let timeout;
    
    child.stdout.on('data', (data) => {
      responseData += data.toString();
      
      // Try to parse response
      const lines = responseData.split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.id === test.request.id) {
            clearTimeout(timeout);
            child.kill();
            
            if (test.validateResponse(response)) {
              resolve({ success: true, response });
            } else {
              resolve({ 
                success: false, 
                error: 'Invalid response structure',
                response 
              });
            }
            return;
          }
        } catch (e) {
          // Continue parsing other lines
        }
      }
    });
    
    child.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    child.on('exit', () => {
      clearTimeout(timeout);
      if (!responseData && errorData) {
        resolve({ 
          success: false, 
          error: `Server error: ${errorData}` 
        });
      }
    });
    
    // Send request
    child.stdin.write(JSON.stringify(test.request) + '\n');
    
    // Set timeout
    timeout = setTimeout(() => {
      child.kill();
      resolve({ 
        success: false, 
        error: 'Timeout: No response within 5 seconds' 
      });
    }, 5000);
  });
}

async function runAllTests() {
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    
    try {
      const result = await runTest(test);
      
      if (result.success) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log(`❌ FAILED: ${result.error}`);
        if (result.response) {
          console.log('  Response:', JSON.stringify(result.response, null, 2));
        }
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Success Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%`);
  
  // Test npx command
  console.log('\n🚀 Testing npx execution...');
  try {
    await new Promise((resolve, reject) => {
      const npxChild = spawn('npx', ['.', '--version'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      npxChild.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      npxChild.on('exit', (code) => {
        if (code === 0 && output.includes('2.0.4')) {
          console.log('✅ npx execution works correctly');
          resolve();
        } else {
          console.log('❌ npx execution failed');
          reject(new Error('npx test failed'));
        }
      });
    });
  } catch (error) {
    console.log('❌ npx test error:', error.message);
  }
  
  // Summary
  console.log('\n📝 Summary:');
  if (failed === 0) {
    console.log('✨ All tests passed! Server is ready for production.');
    console.log('📦 Ready to publish to npm.');
  } else {
    console.log('⚠️  Some tests failed. Please fix issues before publishing.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});