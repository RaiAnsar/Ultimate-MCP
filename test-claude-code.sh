#!/bin/bash

echo "🧪 Testing Ultimate MCP Server with Claude Code Format"
echo ""

# Test 1: Initialize
echo "Test 1: Initialize Request"
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{"tools":{}},"clientInfo":{"name":"claude-code","version":"1.0.0"}}}' | node dist/index.js 2>/dev/null | head -1 | python3 -c "
import json
import sys
try:
    data = json.load(sys.stdin)
    if 'result' in data and 'serverInfo' in data['result']:
        print('✅ PASSED: Server initialized successfully')
        print(f'   Server: {data[\"result\"][\"serverInfo\"][\"name\"]} v{data[\"result\"][\"serverInfo\"][\"version\"]}')
    else:
        print('❌ FAILED: Invalid response')
except:
    print('❌ FAILED: Could not parse response')
"

# Test 2: List tools
echo ""
echo "Test 2: List Tools"
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | timeout 2 node dist/index.js 2>/dev/null | grep -q '"tools":\[' && echo "✅ PASSED: Tools listed successfully" || echo "❌ FAILED: Tools not listed"

# Test 3: Check for key tools
echo ""
echo "Test 3: Verify Key Tools"
echo '{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}' | node dist/index.js 2>/dev/null | python3 -c "
import json
import sys
try:
    data = json.load(sys.stdin)
    tools = [t['name'] for t in data['result']['tools']]
    required = ['ask', 'orchestrate', 'analyze_error', 'generate_code']
    missing = [t for t in required if t not in tools]
    if not missing:
        print(f'✅ PASSED: Found {len(tools)} tools including all required ones')
    else:
        print(f'❌ FAILED: Missing tools: {missing}')
except Exception as e:
    print(f'❌ FAILED: {e}')
"

echo ""
echo "📦 Testing npx execution..."
npx . --version 2>&1 | grep -q "2.0.4" && echo "✅ PASSED: npx execution works (v2.0.4)" || echo "❌ FAILED: npx execution issue"

echo ""
echo "🎯 Summary:"
echo "If all tests passed, the server is ready for Claude Code!"
echo ""
echo "To add to Claude Code, use:"
echo "  claude mcp add npx ultimate-mcp-server"