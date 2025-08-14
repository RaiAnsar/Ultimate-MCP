import express, { Request, Response } from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BaseTransport, TransportConfig } from "./base.js";
import { JSONRPCRequest, JSONRPCResponse } from "../types/index.js";

interface SSEClient {
  id: string;
  response: Response;
  lastActivity: number;
}

export class SSETransport extends BaseTransport {
  private app: express.Application;
  private httpServer: any;
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: Server, config: TransportConfig) {
    super(server, config);
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS configuration
    if (this.config.cors) {
      this.app.use(cors({
        origin: this.config.cors.origin,
        credentials: this.config.cors.credentials ?? false,
      }));
    }

    // JSON parsing
    this.app.use(express.json());

    // Auth middleware
    this.app.use((req, res, next) => {
      if (this.config.auth && this.config.auth.type !== "none") {
        const headers = req.headers as Record<string, string>;
        if (!this.validateAuth(headers)) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }
      next();
    });
  }

  private setupRoutes(): void {
    // SSE endpoint for clients to connect
    this.app.get("/sse", (req: Request, res: Response) => {
      const clientId = this.generateClientId();
      
      // Set SSE headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable Nginx buffering
      });

      // Send initial connection event
      res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

      // Store client
      this.clients.set(clientId, {
        id: clientId,
        response: res,
        lastActivity: Date.now(),
      });

      this.logger.info(`SSE client connected: ${clientId}`);

      // Handle client disconnect
      req.on("close", () => {
        this.clients.delete(clientId);
        this.logger.info(`SSE client disconnected: ${clientId}`);
      });
    });

    // RPC endpoint
    this.app.post("/rpc", async (req: Request, res: Response) => {
      try {
        const request = req.body as JSONRPCRequest;
        const clientId = req.headers["x-client-id"] as string;

        if (!clientId || !this.clients.has(clientId)) {
          res.status(400).json({
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "Invalid client ID",
            },
            id: request.id,
          });
          return;
        }

        // Update client activity
        const client = this.clients.get(clientId)!;
        client.lastActivity = Date.now();

        // Process request through MCP server
        const response = await this.handleRequest(request);
        
        // Send response via SSE
        this.sendToClient(clientId, "response", response);
        
        // Also return in HTTP response for reliability
        res.json(response);
      } catch (error) {
        this.logger.error("RPC request failed", error);
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal error",
          },
          id: req.body.id,
        });
      }
    });

    // Health check endpoint
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({
        status: "ok",
        transport: "sse",
        clients: this.clients.size,
        uptime: process.uptime(),
      });
    });

    // List available tools
    this.app.get("/tools", async (req: Request, res: Response) => {
      try {
        const tools = await this.getAvailableTools();
        res.json(tools);
      } catch (error) {
        res.status(500).json({ error: "Failed to get tools" });
      }
    });
  }

  private async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    // This would integrate with the MCP server's request handler
    // For now, we'll create a basic response structure
    try {
      // TODO: Implement proper request routing through MCP server
      // For now, return a placeholder response
      return {
        jsonrpc: "2.0",
        result: {
          message: "SSE transport request handling in development"
        },
        id: request.id,
      };
    } catch (error: any) {
      return {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error.message || "Internal error",
        },
        id: request.id,
      };
    }
  }

  private async getAvailableTools(): Promise<any> {
    // This would fetch tools from the server
    // Placeholder implementation
    return {
      tools: [
        { name: "ask", description: "Ask AI a question" },
        { name: "orchestrate", description: "Orchestrate multiple models" },
        // ... other tools
      ],
    };
  }

  private sendToClient(clientId: string, event: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        this.logger.error(`Failed to send to client ${clientId}`, error);
        this.clients.delete(clientId);
      }
    }
  }

  private broadcastToAll(event: string, data: any): void {
    for (const [clientId, client] of this.clients) {
      this.sendToClient(clientId, event, data);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      // Clean up inactive clients
      for (const [clientId, client] of this.clients) {
        if (now - client.lastActivity > timeout) {
          this.logger.info(`Removing inactive client: ${clientId}`);
          this.clients.delete(clientId);
          continue;
        }

        // Send heartbeat
        this.sendToClient(clientId, "heartbeat", { timestamp: now });
      }
    }, 30000); // Every 30 seconds
  }

  private generateClientId(): string {
    return `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async start(): Promise<void> {
    const port = this.config.port || 3000;
    const host = this.config.host || "localhost";

    return new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(port, host, () => {
        this.logger.info(`SSE transport listening on http://${host}:${port}`);
        this.startHeartbeat();
        resolve();
      }).on("error", reject);
    });
  }

  async stop(): Promise<void> {
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      client.response.end();
    }
    this.clients.clear();

    // Stop HTTP server
    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => {
          this.logger.info("SSE transport stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  isRunning(): boolean {
    return this.httpServer && this.httpServer.listening;
  }
}