import { WebSocket, WebSocketServer } from 'ws';
import { createServer, Server as HTTPServer } from 'http';
import express, { Express } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { BaseTransport, TransportType } from './base.js';
import type { TransportConfig } from './index.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

interface WSClient {
  id: string;
  ws: WebSocket;
  context: Record<string, any>;
  lastActivity: number;
  authenticated: boolean;
}

export class WebSocketTransport extends BaseTransport {
  private wss: WebSocketServer | null = null;
  private httpServer: HTTPServer | null = null;
  private app: Express;
  private clients: Map<string, WSClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: Server, config: TransportConfig = {}) {
    super(server, config);
    this.type = TransportType.WEBSOCKET;
    this.app = express();
    
    // Default configuration
    this.config = {
      port: 3002,
      host: 'localhost',
      cors: { origin: '*', credentials: true },
      pingInterval: 30000,
      auth: { type: 'none' },
      ...config
    };
  }

  async initialize(): Promise<void> {
    // Configure middleware
    this.app.use(cors(this.config.cors));
    this.app.use(express.json());

    // Setup HTTP routes for WebSocket negotiation
    this.setupRoutes();
    
    // Create HTTP server
    this.httpServer = createServer(this.app);
    
    // Create WebSocket server
    this.wss = new WebSocketServer({ 
      server: this.httpServer,
      path: '/ws'
    });
    
    // Setup WebSocket handlers
    this.setupWebSocketHandlers();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        transport: 'websocket',
        clients: this.clients.size,
        uptime: process.uptime()
      });
    });
    
    // WebSocket info endpoint
    this.app.get('/ws/info', (req, res) => {
      res.json({
        url: `ws://${this.config.host}:${this.config.port}/ws`,
        protocol: 'mcp-websocket',
        version: '1.0',
        features: ['binary', 'text', 'ping/pong', 'compression']
      });
    });
  }

  private setupWebSocketHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = randomUUID();
      const client: WSClient = {
        id: clientId,
        ws,
        context: {},
        lastActivity: Date.now(),
        authenticated: this.config.auth?.type === 'none'
      };
      
      this.clients.set(clientId, client);
      console.log(`WebSocket client connected: ${clientId}`);
      
      // Send welcome message
      this.sendMessage(client, {
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      });
      
      // Setup message handler
      ws.on('message', async (data) => {
        await this.handleMessage(client, data);
      });
      
      // Setup error handler
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });
      
      // Setup close handler
      ws.on('close', (code, reason) => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId} (${code} - ${reason})`);
      });
      
      // Setup pong handler
      ws.on('pong', () => {
        client.lastActivity = Date.now();
      });
    });
  }

  private async handleMessage(client: WSClient, data: any): Promise<void> {
    try {
      client.lastActivity = Date.now();
      
      // Parse message
      const message = JSON.parse(data.toString());
      
      // Handle authentication if required
      if (this.config.auth?.type === 'api-key' && !client.authenticated) {
        if (message.type === 'auth' && message.apiKey === this.config.auth.apiKey) {
          client.authenticated = true;
          this.sendMessage(client, { type: 'auth_success' });
          return;
        } else if (message.type !== 'auth') {
          this.sendMessage(client, { 
            type: 'error', 
            error: 'Authentication required' 
          });
          return;
        }
      }
      
      // Handle different message types
      switch (message.type) {
        case 'rpc':
          await this.handleRPC(client, message.payload);
          break;
          
        case 'ping':
          this.sendMessage(client, { type: 'pong', timestamp: Date.now() });
          break;
          
        case 'context_update':
          client.context = { ...client.context, ...message.context };
          this.sendMessage(client, { 
            type: 'context_updated', 
            context: client.context 
          });
          break;
          
        default:
          this.sendMessage(client, { 
            type: 'error', 
            error: `Unknown message type: ${message.type}` 
          });
      }
    } catch (error: any) {
      console.error('Error handling WebSocket message:', error);
      this.sendMessage(client, { 
        type: 'error', 
        error: error.message 
      });
    }
  }

  private async handleRPC(client: WSClient, payload: any): Promise<void> {
    try {
      // Add session context to request
      payload.sessionContext = client.context;
      
      // Process through MCP server
      const response = await this.server.handleRequest(payload);
      
      // Update client context
      if (payload.sessionContext) {
        client.context = payload.sessionContext;
      }
      
      // Send response
      this.sendMessage(client, {
        type: 'rpc_response',
        payload: response
      });
    } catch (error: any) {
      this.sendMessage(client, {
        type: 'rpc_error',
        error: {
          code: -32603,
          message: error.message
        },
        id: payload.id
      });
    }
  }

  private sendMessage(client: WSClient, message: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        reject(new Error('HTTP server not initialized'));
        return;
      }

      this.httpServer.listen(this.config.port, this.config.host, () => {
        this.isRunning = true;
        console.log(`WebSocket transport listening on ws://${this.config.host}:${this.config.port}/ws`);
        
        // Start ping interval
        this.pingInterval = setInterval(() => {
          this.pingClients();
        }, this.config.pingInterval || 30000);
        
        resolve();
      });
      
      this.httpServer.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    // Stop ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Close all client connections
    this.clients.forEach((client) => {
      client.ws.close(1000, 'Server shutting down');
    });
    this.clients.clear();
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    // Close HTTP server
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer!.close(() => {
          this.isRunning = false;
          resolve();
        });
      });
    }
  }

  private pingClients(): void {
    const now = Date.now();
    const timeout = 60000; // 1 minute timeout
    
    this.clients.forEach((client, id) => {
      if (now - client.lastActivity > timeout) {
        console.log(`Closing inactive WebSocket client: ${id}`);
        client.ws.close(1000, 'Ping timeout');
        this.clients.delete(id);
      } else {
        client.ws.ping();
      }
    });
  }

  broadcast(event: string, data: any): void {
    const message = {
      type: 'broadcast',
      event,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.clients.forEach((client) => {
      this.sendMessage(client, message);
    });
  }
}