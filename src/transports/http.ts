import express, { Request, Response } from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BaseTransport, TransportConfig } from "./base.js";
import { JSONRPCRequest, JSONRPCResponse } from "../types/index.js";
import { randomUUID } from "crypto";

interface Session {
  id: string;
  createdAt: number;
  lastActivity: number;
  context: any;
}

export class HTTPTransport extends BaseTransport {
  private app: express.Application;
  private httpServer: any;
  private sessions: Map<string, Session> = new Map();
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

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

    // JSON parsing with size limit
    this.app.use(express.json({ limit: "10mb" }));

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.debug(`${req.method} ${req.path}`);
      next();
    });

    // Auth middleware
    this.app.use((req, res, next) => {
      if (this.config.auth && this.config.auth.type !== "none") {
        const headers = req.headers as Record<string, string>;
        if (!this.validateAuth(headers)) {
          return res.status(401).json({ 
            error: "Unauthorized",
            code: "AUTH_REQUIRED"
          });
        }
      }
      next();
    });
  }

  private setupRoutes(): void {
    // Create session
    this.app.post("/session", (req: Request, res: Response) => {
      const sessionId = randomUUID();
      const session: Session = {
        id: sessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        context: {},
      };
      
      this.sessions.set(sessionId, session);
      this.logger.info(`Session created: ${sessionId}`);
      
      res.json({
        sessionId,
        expiresIn: this.sessionTimeout,
      });
    });

    // Delete session
    this.app.delete("/session/:sessionId", (req: Request, res: Response) => {
      const { sessionId } = req.params;
      if (this.sessions.delete(sessionId)) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Session not found" });
      }
    });

    // RPC endpoint
    this.app.post("/rpc", async (req: Request, res: Response) => {
      try {
        const request = req.body as JSONRPCRequest;
        const sessionId = req.headers["x-session-id"] as string;

        // Validate session if provided
        if (sessionId) {
          const session = this.sessions.get(sessionId);
          if (!session) {
            return res.status(401).json({
              jsonrpc: "2.0",
              error: {
                code: -32001,
                message: "Invalid or expired session",
              },
              id: request.id,
            });
          }
          session.lastActivity = Date.now();
        }

        // Process request
        const response = await this.handleRequest(request, sessionId);
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

    // REST-style endpoints for common operations
    
    // List tools
    this.app.get("/tools", async (req: Request, res: Response) => {
      try {
        const tools = await this.getAvailableTools();
        res.json(tools);
      } catch (error) {
        res.status(500).json({ error: "Failed to get tools" });
      }
    });

    // Execute tool
    this.app.post("/tools/:toolName/execute", async (req: Request, res: Response) => {
      try {
        const { toolName } = req.params;
        const args = req.body;
        const sessionId = req.headers["x-session-id"] as string;

        const request: JSONRPCRequest = {
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args,
          },
          id: randomUUID(),
        };

        const response = await this.handleRequest(request, sessionId);
        
        if (response.error) {
          res.status(400).json(response.error);
        } else {
          res.json(response.result);
        }
      } catch (error) {
        res.status(500).json({ error: "Tool execution failed" });
      }
    });

    // List models
    this.app.get("/models", async (req: Request, res: Response) => {
      try {
        const models = await this.getAvailableModels();
        res.json(models);
      } catch (error) {
        res.status(500).json({ error: "Failed to get models" });
      }
    });

    // Ask endpoint (simplified interface)
    this.app.post("/ask", async (req: Request, res: Response) => {
      try {
        const { prompt, model, temperature } = req.body;
        const sessionId = req.headers["x-session-id"] as string;

        const request: JSONRPCRequest = {
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "ask",
            arguments: { prompt, model, temperature },
          },
          id: randomUUID(),
        };

        const response = await this.handleRequest(request, sessionId);
        
        if (response.error) {
          res.status(400).json(response.error);
        } else {
          res.json({ answer: response.result });
        }
      } catch (error) {
        res.status(500).json({ error: "Ask failed" });
      }
    });

    // Health check
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({
        status: "ok",
        transport: "http",
        sessions: this.sessions.size,
        uptime: process.uptime(),
        version: "2.0.0",
      });
    });

    // API documentation
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        name: "Ultimate MCP Server",
        version: "2.0.0",
        transport: "http",
        endpoints: {
          session: {
            create: "POST /session",
            delete: "DELETE /session/:sessionId",
          },
          rpc: "POST /rpc",
          tools: {
            list: "GET /tools",
            execute: "POST /tools/:toolName/execute",
          },
          models: "GET /models",
          ask: "POST /ask",
          health: "GET /health",
        },
      });
    });
  }

  private async handleRequest(request: JSONRPCRequest, sessionId?: string): Promise<JSONRPCResponse> {
    try {
      // Add session context if available
      if (sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
          // Attach session context to request
          (request as any).sessionContext = session.context;
        }
      }

      // Process through MCP server
      const result = await this.server.handleRequest(request);
      
      return {
        jsonrpc: "2.0",
        result,
        id: request.id,
      };
    } catch (error: any) {
      return {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error.message || "Internal error",
          data: error.stack,
        },
        id: request.id,
      };
    }
  }

  private async getAvailableTools(): Promise<any> {
    // This would fetch from the actual tool registry
    return {
      tools: [
        {
          name: "ask",
          description: "Ask AI a question",
          parameters: {
            prompt: { type: "string", required: true },
            model: { type: "string", required: false },
            temperature: { type: "number", required: false },
          },
        },
        {
          name: "orchestrate",
          description: "Orchestrate multiple AI models",
          parameters: {
            prompt: { type: "string", required: true },
            strategy: { type: "string", required: true },
            models: { type: "array", required: false },
          },
        },
        // ... other tools
      ],
    };
  }

  private async getAvailableModels(): Promise<any> {
    // This would fetch from the model registry
    return {
      models: [
        { id: "openai/gpt-4o", name: "GPT-4 Optimized" },
        { id: "anthropic/claude-3-opus", name: "Claude 3 Opus" },
        { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
        { id: "x-ai/grok-4-beta", name: "Grok 4 Beta" },
        // ... other models
      ],
    };
  }

  private cleanupSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        this.logger.info(`Session expired: ${sessionId}`);
      }
    }
  }

  async start(): Promise<void> {
    const port = this.config.port || 3001;
    const host = this.config.host || "localhost";

    // Start session cleanup interval
    setInterval(() => this.cleanupSessions(), 60000); // Every minute

    return new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(port, host, () => {
        this.logger.info(`HTTP transport listening on http://${host}:${port}`);
        resolve();
      }).on("error", reject);
    });
  }

  async stop(): Promise<void> {
    // Clear sessions
    this.sessions.clear();

    // Stop HTTP server
    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => {
          this.logger.info("HTTP transport stopped");
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