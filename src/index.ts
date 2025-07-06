#!/usr/bin/env node
import { UltimateMCPServer } from "./core/server.js";
import { config } from "dotenv";
import { Logger } from "./utils/logger.js";
import { AIOrchestrator } from "./providers/orchestrator.js";
import { registerBuiltInTools } from "./tools/index.js";
import { registerBuiltInResources } from "./resources/index.js";
import { registerBuiltInPrompts } from "./prompts/index.js";

// Load environment variables
config();

const logger = new Logger("Main");

async function main() {
  try {
    logger.info("Starting Ultimate MCP Server...");

    // Create server instance
    const server = new UltimateMCPServer(
      "ultimate-mcp-server",
      "1.0.0"
    );

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

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Shutting down gracefully...");
      await server.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Shutting down gracefully...");
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  logger.error("Unhandled error:", error);
  process.exit(1);
});