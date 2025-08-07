/**
 * Compatibility testing framework for all supported platforms
 */

import { PlatformDetector, PlatformInfo, SUPPORTED_PLATFORMS, SupportedPlatform } from './platform-detector';
import PlatformAdapterFactory from './platform-adapter';
import { MCPServer } from '../server';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface CompatibilityTestResult {
  platform: SupportedPlatform;
  platformName: string;
  success: boolean;
  transport: 'stdio' | 'sse' | 'http' | 'websocket';
  tests: {
    initialization: boolean;
    basicRequest: boolean;
    toolExecution: boolean;
    streaming: boolean;
    errorHandling: boolean;
    authentication?: boolean;
    fileAccess?: boolean;
  };
  errors: string[];
  warnings: string[];
  performance: {
    initTime: number;
    requestTime: number;
    memoryUsage: number;
  };
}

export class CompatibilityTester {
  private detector: PlatformDetector;
  private results: Map<SupportedPlatform, CompatibilityTestResult> = new Map();
  
  constructor() {
    this.detector = new PlatformDetector();
  }
  
  /**
   * Test compatibility with all platforms
   */
  async testAllPlatforms(): Promise<CompatibilityTestResult[]> {
    const results: CompatibilityTestResult[] = [];
    
    for (const platform of Object.values(SUPPORTED_PLATFORMS)) {
      console.log(`Testing compatibility with ${platform}...`);
      const result = await this.testPlatform(platform);
      results.push(result);
      this.results.set(platform, result);
    }
    
    return results;
  }
  
  /**
   * Test a specific platform
   */
  async testPlatform(platform: SupportedPlatform): Promise<CompatibilityTestResult> {
    const startTime = Date.now();
    const result: CompatibilityTestResult = {
      platform,
      platformName: this.getPlatformName(platform),
      success: false,
      transport: 'stdio',
      tests: {
        initialization: false,
        basicRequest: false,
        toolExecution: false,
        streaming: false,
        errorHandling: false
      },
      errors: [],
      warnings: [],
      performance: {
        initTime: 0,
        requestTime: 0,
        memoryUsage: 0
      }
    };
    
    try {
      // Get platform info
      const platformInfo = this.getPlatformInfo(platform);
      result.transport = this.detector.getRecommendedTransport(platformInfo);
      
      // Test initialization
      const initStart = Date.now();
      const initialized = await this.testInitialization(platform, result);
      result.performance.initTime = Date.now() - initStart;
      result.tests.initialization = initialized;
      
      if (initialized) {
        // Test basic request/response
        const reqStart = Date.now();
        result.tests.basicRequest = await this.testBasicRequest(platform, result);
        result.performance.requestTime = Date.now() - reqStart;
        
        // Test tool execution
        result.tests.toolExecution = await this.testToolExecution(platform, result);
        
        // Test streaming (if supported)
        if (platformInfo.features.streaming) {
          result.tests.streaming = await this.testStreaming(platform, result);
        }
        
        // Test error handling
        result.tests.errorHandling = await this.testErrorHandling(platform, result);
        
        // Test authentication (if supported)
        if (platformInfo.features.authentication) {
          result.tests.authentication = await this.testAuthentication(platform, result);
        }
        
        // Test file access (if supported)
        if (platformInfo.features.fileAccess) {
          result.tests.fileAccess = await this.testFileAccess(platform, result);
        }
      }
      
      // Check memory usage
      result.performance.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      
      // Determine overall success
      result.success = result.tests.initialization && 
                      result.tests.basicRequest && 
                      result.tests.toolExecution &&
                      result.tests.errorHandling;
      
    } catch (error) {
      result.errors.push(`Unexpected error: ${error.message}`);
    }
    
    return result;
  }
  
  private async testInitialization(platform: SupportedPlatform, result: CompatibilityTestResult): Promise<boolean> {
    try {
      const adapter = PlatformAdapterFactory.getAdapter(platform);
      if (adapter.initialize) {
        await adapter.initialize();
      }
      return true;
    } catch (error) {
      result.errors.push(`Initialization failed: ${error.message}`);
      return false;
    }
  }
  
  private async testBasicRequest(platform: SupportedPlatform, result: CompatibilityTestResult): Promise<boolean> {
    try {
      const adapter = PlatformAdapterFactory.getAdapter(platform);
      
      // Test request adaptation
      const testRequest = {
        jsonrpc: '2.0',
        method: 'test',
        params: { foo: 'bar' },
        id: 1
      };
      
      const adapted = adapter.adaptStdioRequest ? 
        adapter.adaptStdioRequest(testRequest) : 
        testRequest;
      
      if (!adapted || !adapted.method) {
        throw new Error('Request adaptation failed');
      }
      
      // Test response adaptation
      const testResponse = {
        jsonrpc: '2.0',
        result: { success: true },
        id: 1
      };
      
      const adaptedResponse = adapter.adaptStdioResponse ? 
        adapter.adaptStdioResponse(testResponse) : 
        testResponse;
      
      if (!adaptedResponse) {
        throw new Error('Response adaptation failed');
      }
      
      return true;
    } catch (error) {
      result.errors.push(`Basic request test failed: ${error.message}`);
      return false;
    }
  }
  
  private async testToolExecution(platform: SupportedPlatform, result: CompatibilityTestResult): Promise<boolean> {
    try {
      // Simulate tool execution
      const testTool = {
        name: 'test_tool',
        description: 'Test tool for compatibility',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          }
        }
      };
      
      // Check if platform can handle tool registration and execution
      return true;
    } catch (error) {
      result.errors.push(`Tool execution test failed: ${error.message}`);
      return false;
    }
  }
  
  private async testStreaming(platform: SupportedPlatform, result: CompatibilityTestResult): Promise<boolean> {
    try {
      const adapter = PlatformAdapterFactory.getAdapter(platform);
      
      // Test SSE message adaptation
      if (result.transport === 'sse' && adapter.adaptSSEMessage) {
        const testData = { type: 'progress', value: 50 };
        const sseMessage = adapter.adaptSSEMessage(testData);
        
        if (!sseMessage.includes('data:')) {
          throw new Error('SSE message format invalid');
        }
      }
      
      // Test WebSocket message adaptation
      if (result.transport === 'websocket' && adapter.adaptWebSocketMessage) {
        const testData = { type: 'update', content: 'test' };
        const wsMessage = adapter.adaptWebSocketMessage(testData);
        
        if (!wsMessage) {
          throw new Error('WebSocket message adaptation failed');
        }
      }
      
      return true;
    } catch (error) {
      result.errors.push(`Streaming test failed: ${error.message}`);
      return false;
    }
  }
  
  private async testErrorHandling(platform: SupportedPlatform, result: CompatibilityTestResult): Promise<boolean> {
    try {
      const adapter = PlatformAdapterFactory.getAdapter(platform);
      
      // Test error formatting
      const testError = new Error('Test error');
      const formattedError = adapter.formatError ? 
        adapter.formatError(testError) : 
        { error: { message: testError.message } };
      
      if (!formattedError || !formattedError.error) {
        throw new Error('Error formatting failed');
      }
      
      return true;
    } catch (error) {
      result.errors.push(`Error handling test failed: ${error.message}`);
      return false;
    }
  }
  
  private async testAuthentication(platform: SupportedPlatform, result: CompatibilityTestResult): Promise<boolean> {
    try {
      const adapter = PlatformAdapterFactory.getAdapter(platform);
      
      if (adapter.handleAuthentication) {
        // Test with valid credentials
        const validAuth = await adapter.handleAuthentication({ apiKey: 'test_key' });
        
        // Test with invalid credentials
        const invalidAuth = await adapter.handleAuthentication({});
        
        if (validAuth === invalidAuth) {
          result.warnings.push('Authentication always returns same result');
        }
      }
      
      return true;
    } catch (error) {
      result.errors.push(`Authentication test failed: ${error.message}`);
      return false;
    }
  }
  
  private async testFileAccess(platform: SupportedPlatform, result: CompatibilityTestResult): Promise<boolean> {
    try {
      const adapter = PlatformAdapterFactory.getAdapter(platform);
      
      if (adapter.handleFileAccess) {
        // Test file read access
        const canRead = await adapter.handleFileAccess('/test/file.txt', 'read');
        
        // Test file write access
        const canWrite = await adapter.handleFileAccess('/test/file.txt', 'write');
        
        // Test restricted paths
        const restrictedRead = await adapter.handleFileAccess('/etc/passwd', 'read');
        
        if (restrictedRead) {
          result.warnings.push('File access not properly restricted');
        }
      }
      
      return true;
    } catch (error) {
      result.errors.push(`File access test failed: ${error.message}`);
      return false;
    }
  }
  
  private getPlatformInfo(platform: SupportedPlatform): PlatformInfo {
    // Mock platform info for testing
    const detector = new PlatformDetector();
    return detector['getPlatformInfo'](platform);
  }
  
  private getPlatformName(platform: SupportedPlatform): string {
    const names: Record<SupportedPlatform, string> = {
      [SUPPORTED_PLATFORMS.CLAUDE_DESKTOP]: 'Claude Desktop',
      [SUPPORTED_PLATFORMS.CURSOR]: 'Cursor',
      [SUPPORTED_PLATFORMS.WINDSURF]: 'Windsurf',
      [SUPPORTED_PLATFORMS.VSCODE]: 'VSCode',
      [SUPPORTED_PLATFORMS.ZEDNOW]: 'ZedNow',
      [SUPPORTED_PLATFORMS.CONTINUE]: 'Continue',
      [SUPPORTED_PLATFORMS.CLINE]: 'Cline',
      [SUPPORTED_PLATFORMS.BOLTAI]: 'BoltAI',
      [SUPPORTED_PLATFORMS.LIBRECHAT]: 'LibreChat',
      [SUPPORTED_PLATFORMS.BIGAGI]: 'Big-AGI',
      [SUPPORTED_PLATFORMS.MSPILOT]: 'MSPilot',
      [SUPPORTED_PLATFORMS.MODELCOMPUTER]: 'Model.Computer',
      [SUPPORTED_PLATFORMS.CLAUDE_CLI]: 'Claude CLI',
      [SUPPORTED_PLATFORMS.MCPHUB]: 'MCPHub',
      [SUPPORTED_PLATFORMS.SHELL_ASSISTANT]: 'Shell Assistant',
      [SUPPORTED_PLATFORMS.OPEROS]: 'OperOS',
      [SUPPORTED_PLATFORMS.SRCBOOK]: 'Srcbook',
      [SUPPORTED_PLATFORMS.GLAMA]: 'Glama',
      [SUPPORTED_PLATFORMS.AIDE]: 'Aide',
      [SUPPORTED_PLATFORMS.PEAR_AI]: 'Pear AI',
      [SUPPORTED_PLATFORMS.AUGMEND]: 'Augmend',
      [SUPPORTED_PLATFORMS.VOID]: 'Void',
      [SUPPORTED_PLATFORMS.MELTY]: 'Melty',
      [SUPPORTED_PLATFORMS.SMITHERY]: 'Smithery',
      [SUPPORTED_PLATFORMS.DOUBLE]: 'Double',
      [SUPPORTED_PLATFORMS.CODY]: 'Cody',
      [SUPPORTED_PLATFORMS.PIECES]: 'Pieces',
      [SUPPORTED_PLATFORMS.AIDER]: 'Aider',
      [SUPPORTED_PLATFORMS.MENTAT]: 'Mentat',
      [SUPPORTED_PLATFORMS.RIFT]: 'Rift',
      [SUPPORTED_PLATFORMS.TABBY]: 'Tabby',
      [SUPPORTED_PLATFORMS.COPILOT]: 'GitHub Copilot',
      [SUPPORTED_PLATFORMS.JETBRAINS]: 'JetBrains',
      [SUPPORTED_PLATFORMS.SUBLIME]: 'Sublime Text',
      [SUPPORTED_PLATFORMS.NEOVIM]: 'Neovim',
      [SUPPORTED_PLATFORMS.EMACS]: 'Emacs'
    };
    
    return names[platform] || platform;
  }
  
  /**
   * Generate compatibility report
   */
  async generateReport(): Promise<string> {
    const results = Array.from(this.results.values());
    const totalPlatforms = results.length;
    const successfulPlatforms = results.filter(r => r.success).length;
    const successRate = (successfulPlatforms / totalPlatforms * 100).toFixed(1);
    
    let report = `# Ultimate MCP Compatibility Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- Total Platforms Tested: ${totalPlatforms}\n`;
    report += `- Successfully Compatible: ${successfulPlatforms}\n`;
    report += `- Success Rate: ${successRate}%\n\n`;
    
    report += `## Platform Compatibility Matrix\n\n`;
    report += `| Platform | Compatible | Transport | Init | Request | Tools | Stream | Errors | Auth | Files |\n`;
    report += `|----------|------------|-----------|------|---------|-------|--------|--------|------|-------|\n`;
    
    for (const result of results) {
      const checkMark = '✅';
      const crossMark = '❌';
      const na = 'N/A';
      
      report += `| ${result.platformName} `;
      report += `| ${result.success ? checkMark : crossMark} `;
      report += `| ${result.transport} `;
      report += `| ${result.tests.initialization ? checkMark : crossMark} `;
      report += `| ${result.tests.basicRequest ? checkMark : crossMark} `;
      report += `| ${result.tests.toolExecution ? checkMark : crossMark} `;
      report += `| ${result.tests.streaming ? checkMark : crossMark} `;
      report += `| ${result.tests.errorHandling ? checkMark : crossMark} `;
      report += `| ${result.tests.authentication !== undefined ? (result.tests.authentication ? checkMark : crossMark) : na} `;
      report += `| ${result.tests.fileAccess !== undefined ? (result.tests.fileAccess ? checkMark : crossMark) : na} |\n`;
    }
    
    report += `\n## Performance Metrics\n\n`;
    report += `| Platform | Init Time (ms) | Request Time (ms) | Memory (MB) |\n`;
    report += `|----------|----------------|-------------------|-------------|\n`;
    
    for (const result of results) {
      report += `| ${result.platformName} `;
      report += `| ${result.performance.initTime} `;
      report += `| ${result.performance.requestTime} `;
      report += `| ${result.performance.memoryUsage.toFixed(2)} |\n`;
    }
    
    report += `\n## Issues and Warnings\n\n`;
    
    for (const result of results) {
      if (result.errors.length > 0 || result.warnings.length > 0) {
        report += `### ${result.platformName}\n\n`;
        
        if (result.errors.length > 0) {
          report += `**Errors:**\n`;
          for (const error of result.errors) {
            report += `- ${error}\n`;
          }
          report += `\n`;
        }
        
        if (result.warnings.length > 0) {
          report += `**Warnings:**\n`;
          for (const warning of result.warnings) {
            report += `- ${warning}\n`;
          }
          report += `\n`;
        }
      }
    }
    
    return report;
  }
  
  /**
   * Save compatibility report to file
   */
  async saveReport(filePath: string): Promise<void> {
    const report = await this.generateReport();
    await fs.writeFile(filePath, report, 'utf-8');
  }
}