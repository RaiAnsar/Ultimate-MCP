/**
 * Core MCP Types
 */

export interface MCPRequest {
  id: string | number;
  method: string;
  params?: any;
  jsonrpc?: string;
}

export interface MCPResponse {
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  jsonrpc?: string;
}

export interface MCPError extends Error {
  code: number;
  data?: any;
}

export interface MCPNotification {
  method: string;
  params?: any;
  jsonrpc?: string;
}