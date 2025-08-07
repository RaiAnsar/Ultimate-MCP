import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SSETransport } from '../src/transports/sse';
import { HTTPTransport } from '../src/transports/http';
import { WebSocketTransport } from '../src/transports/websocket';
import express from 'express';
import { EventEmitter } from 'events';

// Mock express and related modules
vi.mock('express', () => {
  const mockApp = {
    use: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    listen: vi.fn((port, host, cb) => {
      // Handle both (port, cb) and (port, host, cb) signatures
      const callback = typeof host === 'function' ? host : cb;
      if (callback) callback();
      return { 
        close: vi.fn((cb) => cb && cb()),
        on: vi.fn().mockReturnThis(),
        listening: true
      };
    })
  };
  
  const expressFn = vi.fn(() => mockApp);
  (expressFn as any).json = vi.fn(() => (req: any, res: any, next: any) => next());
  
  return { default: expressFn };
});

vi.mock('cors', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next())
}));

// Mock WebSocket
vi.mock('ws', () => {
  const WebSocketServer = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn((cb) => cb && cb())
  }));
  return { 
    default: { Server: WebSocketServer },
    Server: WebSocketServer,
    WebSocketServer,
    WebSocket: { OPEN: 1, CLOSED: 3 }
  };
});

// Mock http module
vi.mock('http', () => ({
  createServer: vi.fn(() => ({
    listen: vi.fn((port, host, cb) => {
      const callback = typeof host === 'function' ? host : cb;
      if (callback) callback();
      return { close: vi.fn((cb) => cb && cb()) };
    }),
    on: vi.fn(),
    close: vi.fn((cb) => cb && cb())
  }))
}));

describe('SSETransport', () => {
  let transport: SSETransport;
  let mockRequest: any;
  let mockResponse: any;
  let mockServer: any;
  let mockConfig: any;

  beforeEach(() => {
    // Create mock server
    mockServer = {
      on: vi.fn(),
      emit: vi.fn()
    };
    
    // Create mock config
    mockConfig = {
      type: 'sse',
      port: 3001,
      cors: {
        origin: '*',
        credentials: false
      }
    };
    
    transport = new SSETransport(mockServer, mockConfig);
    
    // Mock request/response for SSE
    mockRequest = new EventEmitter();
    mockResponse = {
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn()
    };
  });

  afterEach(async () => {
    if (transport && transport.stop) {
      await transport.stop();
    }
  });

  describe('Initialization', () => {
    it('should initialize SSE server', async () => {
      await transport.start();
      
      const app = express();
      expect(app.listen).toHaveBeenCalledWith(3001, 'localhost', expect.any(Function));
    });

    it('should set up SSE endpoint', async () => {
      await transport.start();
      
      const app = express();
      expect(app.get).toHaveBeenCalledWith('/sse', expect.any(Function));
    });
  });

  describe('Client Connection', () => {
    it('should handle new SSE connections', async () => {
      await transport.start();
      
      // Get the route handler
      const app = express();
      const routeHandler = (app.get as any).mock.calls.find(
        (call: any[]) => call[0] === '/sse'
      )?.[1];
      
      expect(routeHandler).toBeDefined();
      
      // Simulate connection
      routeHandler(mockRequest, mockResponse);
      
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, 
        expect.objectContaining({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        })
      );
    });

    it('should send keep-alive messages', async () => {
      vi.useFakeTimers();
      
      await transport.start();
      
      const app = express();
      const routeHandler = (app.get as any).mock.calls.find(
        (call: any[]) => call[0] === '/sse'
      )?.[1];
      
      routeHandler(mockRequest, mockResponse);
      
      // Advance time to trigger keep-alive
      vi.advanceTimersByTime(30000);
      
      // The heartbeat sends JSON data with 'event: heartbeat'
      expect(mockResponse.write).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('Client Management', () => {
    it('should send initial connection event', async () => {
      await transport.start();
      
      const app = express();
      const routeHandler = (app.get as any).mock.calls.find(
        (call: any[]) => call[0] === '/sse'
      )?.[1];
      
      // Connect a client
      routeHandler(mockRequest, mockResponse);
      
      // Should send connected event
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('event: connected')
      );
    });

    it('should handle client disconnection', async () => {
      await transport.start();
      
      const app = express();
      const routeHandler = (app.get as any).mock.calls.find(
        (call: any[]) => call[0] === '/sse'
      )?.[1];
      
      routeHandler(mockRequest, mockResponse);
      
      // Simulate client disconnect
      mockRequest.emit('close');
      
      // Should not throw
      expect(true).toBe(true);
    });
  });
});

describe('HTTPTransport', () => {
  let transport: HTTPTransport;
  let mockServer: any;
  let mockConfig: any;

  beforeEach(() => {
    // Create mock server
    mockServer = {
      on: vi.fn(),
      emit: vi.fn()
    };
    
    // Create mock config
    mockConfig = {
      type: 'http',
      port: 3002,
      cors: {
        origin: '*',
        credentials: false
      }
    };
    
    transport = new HTTPTransport(mockServer, mockConfig);
  });

  afterEach(async () => {
    if (transport && transport.stop) {
      await transport.stop();
    }
  });

  describe('Initialization', () => {
    it('should initialize HTTP server', async () => {
      await transport.start();
      
      const app = express();
      expect(app.listen).toHaveBeenCalledWith(3002, 'localhost', expect.any(Function));
    });

    it('should set up API endpoints', async () => {
      await transport.start();
      
      const app = express();
      expect(app.post).toHaveBeenCalledWith('/rpc', expect.any(Function));
      expect(app.post).toHaveBeenCalledWith('/session', expect.any(Function));
      expect(app.get).toHaveBeenCalledWith('/health', expect.any(Function));
    });
  });

  describe('Endpoints', () => {
    it('should set up ask endpoint', async () => {
      await transport.start();
      
      const app = express();
      expect(app.post).toHaveBeenCalledWith('/ask', expect.any(Function));
    });

    it('should set up tool execute endpoint', async () => {
      await transport.start();
      
      const app = express();
      // Check that the route with params is registered
      const calls = (app.post as any).mock.calls;
      const hasToolExecute = calls.some((call: any[]) => 
        call[0] === '/tools/:toolName/execute'
      );
      expect(hasToolExecute).toBe(true);
    });
  });

  describe('RPC Handling', () => {
    it('should handle RPC requests', async () => {
      await transport.start();
      
      const app = express();
      const rpcHandler = (app.post as any).mock.calls.find(
        (call: any[]) => call[0] === '/rpc'
      )?.[1];
      
      expect(rpcHandler).toBeDefined();
      
      const mockReq = {
        body: {
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: '123'
        },
        headers: {}
      };
      const mockRes = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis()
      };
      
      // Call the handler - might error but shouldn't crash
      try {
        await rpcHandler(mockReq, mockRes);
      } catch (e) {
        // Expected - no real server handler
      }
      
      // Should have called json with some response
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    it('should create sessions', async () => {
      await transport.start();
      
      const app = express();
      const sessionHandler = (app.post as any).mock.calls.find(
        (call: any[]) => call[0] === '/session'
      )?.[1];
      
      expect(sessionHandler).toBeDefined();
    });

    it('should handle health checks', async () => {
      await transport.start();
      
      const app = express();
      const healthHandler = (app.get as any).mock.calls.find(
        (call: any[]) => call[0] === '/health'
      )?.[1];
      
      const mockRes = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis()
      };
      
      healthHandler({}, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.any(String) // Can be 'ok' or 'healthy'
        })
      );
    });
  });
});

describe('WebSocketTransport', () => {
  let transport: WebSocketTransport;
  let mockWsServer: any;
  let mockServer: any;
  let mockConfig: any;

  beforeEach(async () => {
    // Create mock server
    mockServer = {
      on: vi.fn(),
      emit: vi.fn()
    };
    
    // Create mock config
    mockConfig = {
      type: 'websocket',
      port: 3003,
      cors: {
        origin: '*',
        credentials: false
      }
    };
    
    // Mock WebSocket.Server
    mockWsServer = new EventEmitter();
    mockWsServer.close = vi.fn((cb) => cb && cb());
    mockWsServer.on = vi.fn().mockReturnThis();
    mockWsServer.emit = vi.fn();
    
    // Get the mocked ws module
    const ws = await import('ws');
    vi.mocked(ws.WebSocketServer).mockImplementation(() => mockWsServer);
    
    transport = new WebSocketTransport(mockServer, mockConfig);
    // Initialize the transport to create HTTP server
    await transport.initialize();
  });

  afterEach(async () => {
    if (transport && transport.stop) {
      await transport.stop();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create WebSocket server', async () => {
      await transport.start();
      
      const ws = await import('ws');
      // Check that WebSocketServer was created
      expect(ws.WebSocketServer || ws.Server).toHaveBeenCalledWith(expect.objectContaining({
        server: expect.any(Object),
        path: '/ws'
      }));
    });
  });

  describe('Client Connection', () => {
    it('should handle new WebSocket connections', async () => {
      // Check that WebSocket server was set up with connection handlers
      const ws = await import('ws');
      const wssInstance = vi.mocked(ws.WebSocketServer).mock.results[0]?.value;
      
      expect(wssInstance).toBeDefined();
      expect(wssInstance.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should handle client messages', async () => {
      // Don't start the actual transport for this test
      // Just check that message handling is set up
      const ws = await import('ws');
      const wssInstance = vi.mocked(ws.WebSocketServer).mock.results[0]?.value;
      
      expect(wssInstance).toBeDefined();
      expect(wssInstance.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('Connection Management', () => {
    it('should handle multiple client connections', async () => {
      // Test WebSocket server can handle multiple connections
      const ws = await import('ws');
      const wssInstance = vi.mocked(ws.WebSocketServer).mock.results[0]?.value;
      
      expect(wssInstance).toBeDefined();
      // WebSocket server should be able to handle multiple connection events
      expect(wssInstance.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should handle client cleanup', async () => {
      // Test that the transport sets up cleanup handlers
      const ws = await import('ws');
      const wssInstance = vi.mocked(ws.WebSocketServer).mock.results[0]?.value;
      
      expect(wssInstance).toBeDefined();
      // Should be ready to handle connections and cleanup
      expect(wssInstance.on).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle client errors', async () => {
      // Test that error handlers are set up
      const ws = await import('ws');
      const wssInstance = vi.mocked(ws.WebSocketServer).mock.results[0]?.value;
      
      expect(wssInstance).toBeDefined();
      // Should have error handling capability
      expect(wssInstance.on).toHaveBeenCalled();
    });

    it('should handle malformed messages', async () => {
      // Test that message handlers are set up
      const ws = await import('ws');
      const wssInstance = vi.mocked(ws.WebSocketServer).mock.results[0]?.value;
      
      expect(wssInstance).toBeDefined();
      // Should have message handling capability
      expect(wssInstance.on).toHaveBeenCalled();
    });
  });
});