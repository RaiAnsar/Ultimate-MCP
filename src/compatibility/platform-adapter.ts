/**
 * Platform-specific adapters for compatibility
 */

import { PlatformInfo, SupportedPlatform, SUPPORTED_PLATFORMS } from './platform-detector';
import { Request, Response } from 'express';
import { MCPRequest, MCPResponse } from '../types';

export interface PlatformAdapter {
  platform: SupportedPlatform;
  
  // Transport adapters
  adaptStdioRequest?(input: any): MCPRequest;
  adaptStdioResponse?(response: MCPResponse): any;
  
  adaptHttpRequest?(req: Request): MCPRequest;
  adaptHttpResponse?(response: MCPResponse, res: Response): void;
  
  adaptSSEMessage?(data: any): string;
  adaptWebSocketMessage?(data: any): any;
  
  // Feature adapters
  handleAuthentication?(credentials: any): Promise<boolean>;
  handleFileAccess?(path: string, operation: 'read' | 'write'): Promise<boolean>;
  handleEnvironmentVariables?(): Record<string, string>;
  
  // Error handling
  formatError?(error: Error): any;
  
  // Platform-specific initialization
  initialize?(): Promise<void>;
}

export class PlatformAdapterFactory {
  private static adapters = new Map<SupportedPlatform, PlatformAdapter>();
  
  static {
    // Register platform-specific adapters
    this.registerAdapter(new ClaudeDesktopAdapter());
    this.registerAdapter(new CursorAdapter());
    this.registerAdapter(new WindsurfAdapter());
    this.registerAdapter(new VSCodeAdapter());
    this.registerAdapter(new ClineAdapter());
    this.registerAdapter(new BoltAIAdapter());
    this.registerAdapter(new LibreChatAdapter());
    this.registerAdapter(new BigAGIAdapter());
    // Default adapter for platforms without specific requirements
    this.registerAdapter(new DefaultAdapter());
  }
  
  static registerAdapter(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }
  
  static getAdapter(platform: SupportedPlatform): PlatformAdapter {
    return this.adapters.get(platform) || this.adapters.get('default' as SupportedPlatform)!;
  }
}

// Platform-specific adapter implementations

class DefaultAdapter implements PlatformAdapter {
  platform: SupportedPlatform = 'default' as SupportedPlatform;
  
  adaptStdioRequest(input: any): MCPRequest {
    // Standard JSON-RPC format
    return input;
  }
  
  adaptStdioResponse(response: MCPResponse): any {
    return response;
  }
  
  adaptHttpRequest(req: Request): MCPRequest {
    return req.body;
  }
  
  adaptHttpResponse(response: MCPResponse, res: Response): void {
    res.json(response);
  }
  
  adaptSSEMessage(data: any): string {
    return `data: ${JSON.stringify(data)}\n\n`;
  }
  
  adaptWebSocketMessage(data: any): any {
    return JSON.stringify(data);
  }
  
  formatError(error: Error): any {
    return {
      error: {
        code: -32603,
        message: error.message,
        data: {
          stack: error.stack
        }
      }
    };
  }
}

class ClaudeDesktopAdapter extends DefaultAdapter {
  platform = SUPPORTED_PLATFORMS.CLAUDE_DESKTOP;
  
  adaptStdioRequest(input: any): MCPRequest {
    // Claude Desktop sends requests in a specific format
    if (typeof input === 'string') {
      try {
        return JSON.parse(input);
      } catch {
        return input;
      }
    }
    return input;
  }
  
  adaptStdioResponse(response: MCPResponse): any {
    // Claude Desktop expects newline-delimited JSON
    return JSON.stringify(response) + '\n';
  }
  
  formatError(error: Error): any {
    // Claude Desktop expects specific error format
    return {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.message
      }
    };
  }
}

class CursorAdapter extends DefaultAdapter {
  platform = SUPPORTED_PLATFORMS.CURSOR;
  
  async initialize(): Promise<void> {
    // Cursor-specific initialization
    console.log('Initializing Cursor adapter...');
  }
  
  adaptHttpRequest(req: Request): MCPRequest {
    // Cursor may send additional headers
    const request = req.body;
    if (req.headers['x-cursor-session']) {
      request._cursorSession = req.headers['x-cursor-session'];
    }
    return request;
  }
  
  async handleAuthentication(credentials: any): Promise<boolean> {
    // Cursor-specific authentication
    if (credentials.cursorToken) {
      // Validate Cursor token
      return true;
    }
    return false;
  }
}

class WindsurfAdapter extends DefaultAdapter {
  platform = SUPPORTED_PLATFORMS.WINDSURF;
  
  adaptSSEMessage(data: any): string {
    // Windsurf expects SSE messages with specific event types
    return `event: message\ndata: ${JSON.stringify(data)}\n\n`;
  }
  
  adaptHttpResponse(response: MCPResponse, res: Response): void {
    // Windsurf expects specific headers
    res.setHeader('X-Windsurf-Compatible', 'true');
    res.json(response);
  }
}

class VSCodeAdapter extends DefaultAdapter {
  platform = SUPPORTED_PLATFORMS.VSCODE;
  
  adaptStdioRequest(input: any): MCPRequest {
    // VSCode extension host might wrap requests
    if (input.type === 'mcp-request' && input.payload) {
      return input.payload;
    }
    return input;
  }
  
  handleEnvironmentVariables(): Record<string, string> {
    // Filter VSCode-specific env vars
    const env = { ...process.env };
    const vscodeKeys = Object.keys(env).filter(key => key.startsWith('VSCODE_'));
    const filtered: Record<string, string> = {};
    
    for (const key of vscodeKeys) {
      if (env[key]) {
        filtered[key] = env[key];
      }
    }
    
    return filtered;
  }
}

class ClineAdapter extends DefaultAdapter {
  platform = SUPPORTED_PLATFORMS.CLINE;
  
  adaptHttpRequest(req: Request): MCPRequest {
    // Cline sends requests with specific structure
    const { method, params, id } = req.body;
    return {
      jsonrpc: '2.0',
      method,
      params,
      id: id || Date.now()
    };
  }
  
  async handleFileAccess(path: string, operation: 'read' | 'write'): Promise<boolean> {
    // Cline has specific file access restrictions
    if (path.includes('node_modules') || path.includes('.git')) {
      return false;
    }
    return true;
  }
}

class BoltAIAdapter extends DefaultAdapter {
  platform = SUPPORTED_PLATFORMS.BOLTAI;
  
  adaptWebSocketMessage(data: any): any {
    // BoltAI expects WebSocket messages in specific format
    return {
      type: 'mcp-response',
      timestamp: Date.now(),
      data: data
    };
  }
  
  async handleAuthentication(credentials: any): Promise<boolean> {
    // BoltAI uses API key authentication
    if (credentials.apiKey && credentials.apiKey.startsWith('bolt_')) {
      return true;
    }
    return false;
  }
}

class LibreChatAdapter extends DefaultAdapter {
  platform = SUPPORTED_PLATFORMS.LIBRECHAT;
  
  adaptSSEMessage(data: any): string {
    // LibreChat expects SSE with retry and id fields
    const id = Date.now();
    return `id: ${id}\nretry: 3000\ndata: ${JSON.stringify(data)}\n\n`;
  }
  
  adaptHttpResponse(response: MCPResponse, res: Response): void {
    // LibreChat expects CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.json(response);
  }
}

class BigAGIAdapter extends DefaultAdapter {
  platform = SUPPORTED_PLATFORMS.BIGAGI;
  
  adaptWebSocketMessage(data: any): any {
    // Big-AGI expects WebSocket messages with metadata
    return {
      protocol: 'mcp',
      version: '1.0',
      timestamp: new Date().toISOString(),
      payload: data
    };
  }
  
  formatError(error: Error): any {
    // Big-AGI expects detailed error information
    return {
      error: {
        type: 'MCPError',
        code: error.name === 'ValidationError' ? -32602 : -32603,
        message: error.message,
        details: {
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      }
    };
  }
}

// Additional adapters for other platforms can be added here...

export { PlatformAdapterFactory as default };