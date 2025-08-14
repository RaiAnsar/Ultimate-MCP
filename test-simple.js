#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Suppress all console output to stderr to not interfere with stdio protocol
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = (...args) => originalConsoleError(...args);
console.error = (...args) => originalConsoleError(...args);

const server = new Server(
  {
    name: "test",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "test",
    description: "Test tool",
    inputSchema: { type: "object", properties: {} }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => ({
  content: [{ type: "text", text: "Test response" }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);