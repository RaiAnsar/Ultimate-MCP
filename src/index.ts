#!/usr/bin/env node
import { UltimateMCPServer } from "./core/server.js";
import { config } from "dotenv";
import { Logger } from "./utils/logger.js";
import { AIOrchestrator } from "./providers/orchestrator.js";
import { registerBuiltInTools } from "./tools/index.js";
import { registerBuiltInResources } from "./resources/index.js";
import { registerBuiltInPrompts } from "./prompts/index.js";
import { TransportType, TransportConfig } from "./transports/index.js";

// Load environment variables
config();

const logger = new Logger("Main");

function parseTransports(): TransportConfig[] {
  const transports: TransportConfig[] = [];
  
  // Check environment variables for transport configuration
  const enableSSE = process.env.ENABLE_SSE === "true";
  const enableHTTP = process.env.ENABLE_HTTP === "true";
  const enableWebSocket = process.env.ENABLE_WEBSOCKET === "true";
  
  // Always include STDIO unless explicitly disabled
  if (process.env.DISABLE_STDIO !== "true") {
    transports.push({ type: TransportType.STDIO });
  }
  
  // SSE transport
  if (enableSSE) {
    transports.push({
      type: TransportType.SSE,
      port: parseInt(process.env.SSE_PORT || "3000"),
      host: process.env.SSE_HOST || "localhost",
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        credentials: process.env.CORS_CREDENTIALS === "true",
      },
      auth: {
        type: process.env.AUTH_TYPE as any || "none",
        apiKey: process.env.AUTH_API_KEY,
      },
    });
  }
  
  // HTTP transport
  if (enableHTTP) {
    transports.push({
      type: TransportType.HTTP,
      port: parseInt(process.env.HTTP_PORT || "3001"),
      host: process.env.HTTP_HOST || "localhost",
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        credentials: process.env.CORS_CREDENTIALS === "true",
      },
      auth: {
        type: process.env.AUTH_TYPE as any || "none",
        apiKey: process.env.AUTH_API_KEY,
      },
    });
  }
  
  // WebSocket transport
  if (enableWebSocket) {
    transports.push({
      type: TransportType.WEBSOCKET,
      port: parseInt(process.env.WEBSOCKET_PORT || "3002"),
      host: process.env.WEBSOCKET_HOST || "localhost",
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        credentials: process.env.CORS_CREDENTIALS === "true",
      },
      auth: {
        type: process.env.AUTH_TYPE as any || "none",
        apiKey: process.env.AUTH_API_KEY,
      },
    });
  }
  
  // Check for platform-specific configuration
  const platform = process.env.MCP_PLATFORM;
  if (platform && transports.length === 0) {
    switch (platform) {
      case "gemini":
        transports.push(
          { type: TransportType.HTTP, port: 3001 },
          { type: TransportType.SSE, port: 3000 }
        );
        break;
      case "web":
        transports.push(
          { type: TransportType.HTTP, port: 3001 },
          { type: TransportType.SSE, port: 3000 }
        );
        break;
      default:
        transports.push({ type: TransportType.STDIO });
    }
  }
  
  // Default to STDIO if no transports configured
  if (transports.length === 0) {
    transports.push({ type: TransportType.STDIO });
  }
  
  return transports;
}

async function main() {
  // Parse transport configuration
  const transports = parseTransports();
  const isStdio = transports.some(t => t.type === TransportType.STDIO);
  
  try {
    
    // Only log to stderr if not using stdio transport
    if (!isStdio) {
      logger.info("Starting Ultimate MCP Server...");
      logger.info(`Configured transports: ${transports.map(t => t.type).join(", ")}`);
    }

    // Create server instance with transport configuration
    const server = new UltimateMCPServer({
      name: "ultimate-mcp-server",
      version: "2.0.9",
      transports,
    });

    // Initialize orchestration engine
    const orchestrator = new AIOrchestrator();

    // Register built-in tools
    await registerBuiltInTools(server, orchestrator);

    // Register built-in resources
    await registerBuiltInResources(server);

    // Register built-in prompts
    await registerBuiltInPrompts(server);

    // Start the server
    await server.start();

    // Log transport status only if not stdio
    const transportStatus = server.getTransportStatus();
    if (transportStatus && !isStdio) {
      logger.info(`Active transports: ${transportStatus.active.join(", ")}`);
    }

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      if (!isStdio) {
        logger.info("Shutting down gracefully...");
      }
      await server.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      if (!isStdio) {
        logger.info("Shutting down gracefully...");
      }
      await server.stop();
      process.exit(0);
    });

    // Keep process alive for stdio
    // Note: stdio transport ALSO needs stdin.resume() to keep the process alive
    // This is NOT just for keeping the process alive but for enabling stdin
    process.stdin.resume();
    
    // Handle stdin closure (important for MCP clients)
    process.stdin.on('end', () => {
      if (!isStdio) {
        logger.info("stdin closed, shutting down...");
      }
      process.exit(0);
    });
    
    process.stdin.on('close', () => {
      if (!isStdio) {
        logger.info("stdin closed, shutting down...");
      }
      process.exit(0);
    });
    
    // If running in stdio mode and connected to a TTY (terminal), show help
    if (isStdio && process.stdin.isTTY) {
      console.error("Ultimate MCP Server v2.0.9 - Running in stdio mode");
      console.error("Waiting for MCP protocol messages on stdin...");
      console.error("\nThis server is designed to be used with MCP clients like:");
      console.error("  - Claude Desktop/Code: claude mcp add ultimate npx ultimate-mcp-server");
      console.error("  - Cursor/Windsurf: Add to MCP settings");
      console.error("  - Direct test: echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{}}' | npx ultimate-mcp-server");
      console.error("\nPress Ctrl+C to exit");
    }
  } catch (error) {
    if (!isStdio) {
      logger.error("Failed to start server", error);
    }
    process.exit(1);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.error(`
Ultimate MCP Server v2.0

Usage: ultimate-mcp-server [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version

Environment Variables:
  OPENROUTER_API_KEY         API key for OpenRouter
  ENABLE_SSE                Enable SSE transport (true/false)
  ENABLE_HTTP               Enable HTTP transport (true/false)
  ENABLE_WEBSOCKET          Enable WebSocket transport (true/false)
  SSE_PORT                  Port for SSE transport (default: 3000)
  HTTP_PORT                 Port for HTTP transport (default: 3001)
  WEBSOCKET_PORT            Port for WebSocket transport (default: 3002)
  WEBSOCKET_PING_INTERVAL   WebSocket ping interval in ms (default: 30000)
  CORS_ORIGIN               CORS origin (default: *)
  AUTH_TYPE                 Authentication type (none/api-key)
  AUTH_API_KEY              API key for authentication
  MCP_PLATFORM              Platform preset (gemini/web/cursor)
  DISABLE_STDIO             Disable STDIO transport (true/false)
  LOG_LEVEL                 Logging level (debug/info/warn/error)
`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.error("Ultimate MCP Server v2.0.9");
  process.exit(0);
}

// Start the server
main();