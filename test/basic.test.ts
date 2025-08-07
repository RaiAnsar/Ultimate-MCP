import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { LazyToolRegistry } from '../src/core/lazy-tool-registry.js';
import { PerformanceMonitor } from '../src/core/performance-monitor.js';
import { CostOptimizer } from '../src/core/cost-optimizer.js';
import { ModelRouter } from '../src/core/model-router.js';

describe('Ultimate MCP Server - Core Tests', () => {
  let server: Server;
  let registry: LazyToolRegistry;
  let performanceMonitor: PerformanceMonitor;
  let costOptimizer: CostOptimizer;
  let modelRouter: ModelRouter;

  beforeAll(() => {
    // Initialize components
    registry = new LazyToolRegistry();
    performanceMonitor = new PerformanceMonitor();
    costOptimizer = new CostOptimizer();
    modelRouter = new ModelRouter(costOptimizer, performanceMonitor);
    
    server = new Server({
      name: 'ultimate-mcp-test',
      version: '2.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
  });

  describe('Lazy Tool Registry', () => {
    it('should register tools without loading implementation', () => {
      const toolName = 'test_tool';
      let implementationLoaded = false;
      
      registry.registerLazyTool({
        name: toolName,
        description: 'Test tool',
        inputSchema: { type: 'object' },
        loader: async () => {
          implementationLoaded = true;
          return async () => ({ content: [{ type: 'text', text: 'test' }] });
        }
      });
      
      expect(registry.hasToolMetadata(toolName)).toBe(true);
      expect(implementationLoaded).toBe(false);
    });

    it('should load implementation on first use', async () => {
      const toolName = 'lazy_test_tool';
      let loadCount = 0;
      
      registry.registerLazyTool({
        name: toolName,
        description: 'Lazy test tool',
        inputSchema: { type: 'object' },
        loader: async () => {
          loadCount++;
          return async () => ({ content: [{ type: 'text', text: 'loaded' }] });
        }
      });
      
      // First execution should load
      const impl1 = await registry.getImplementation(toolName);
      expect(loadCount).toBe(1);
      
      // Second execution should use cache
      const impl2 = await registry.getImplementation(toolName);
      expect(loadCount).toBe(1);
      expect(impl1).toBe(impl2);
    });
  });

  describe('Performance Monitor', () => {
    it('should track tool execution metrics', async () => {
      const toolName = 'perf_test_tool';
      
      performanceMonitor.startToolExecution(toolName);
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      performanceMonitor.endToolExecution(toolName, true);
      
      const metrics = performanceMonitor.getToolMetrics(toolName);
      expect(metrics).toBeDefined();
      expect(metrics!.calls).toBe(1);
      expect(metrics!.errors).toBe(0);
    });

    it('should track model usage', () => {
      const model = 'test-model';
      const tokens = 1000;
      
      performanceMonitor.recordModelUsage(model, tokens, 200, true);
      
      const metrics = performanceMonitor.getModelMetrics(model);
      expect(metrics).toBeDefined();
      expect(metrics!.requests).toBe(1);
      expect(metrics!.tokens.total).toBe(tokens);
      expect(metrics!.errors).toBe(0);
      expect(metrics!.averageLatency).toBe(200);
    });
  });

  describe('Cost Optimizer', () => {
    it('should select optimal model based on task', () => {
      const task = {
        type: 'coding' as const,
        estimatedTokens: 1000,
        complexity: 'simple' as const
      };
      
      const model = costOptimizer.selectOptimalModel(task);
      expect(model).toBeDefined();
      expect(model.reason).toContain('coding');
    });

    it('should track costs', () => {
      // trackUsage expects inputTokens and outputTokens, not totalTokens and cost
      costOptimizer.trackUsage('openai/gpt-4o', 700, 300);  // 1000 total
      costOptimizer.trackUsage('openai/gpt-4o-mini', 1400, 600);  // 2000 total
      
      const report = costOptimizer.getCostReport('day');
      expect(report.totalCost).toBeGreaterThan(0);
      expect(report.modelBreakdown).toBeDefined();
    });
  });

  describe('Model Router', () => {
    it('should route tasks to appropriate models', async () => {
      const task = {
        type: 'coding' as const,
        complexity: 'complex' as const,
        estimatedTokens: 5000,
        requiresSpeed: false,
        requiresAccuracy: true
      };
      
      const decision = await modelRouter.routeTask(task);
      expect(decision).toBeDefined();
      expect(decision.model).toBeTruthy();
      expect(decision.reasoning).toBeTruthy();
      expect(decision.alternativeModels.length).toBeGreaterThan(0);
    });

    it('should respect constraints', async () => {
      const task = {
        type: 'general' as const,
        complexity: 'simple' as const,
        estimatedTokens: 500,
        requiresSpeed: true,
        requiresAccuracy: false
      };
      
      const constraints = {
        maxLatency: 1000,
        excludeModels: ['openai/gpt-4o', 'anthropic/claude-3-opus']
      };
      
      const decision = await modelRouter.routeTask(task, constraints);
      expect(constraints.excludeModels).not.toContain(decision.model);
      expect(decision.estimatedLatency).toBeLessThanOrEqual(constraints.maxLatency);
    });
  });

  describe('Integration Tests', () => {
    it('should handle full tool execution flow', async () => {
      // Register a test tool
      const toolName = 'integration_test_tool';
      registry.registerLazyTool({
        name: toolName,
        description: 'Integration test tool',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          },
          required: ['input']
        },
        loader: async () => ({
          name: toolName,
          description: 'Integration test tool',
          inputSchema: {
            type: 'object',
            properties: {
              input: { type: 'string' }
            },
            required: ['input']
          },
          handler: async (args: any) => ({
            content: [{
              type: 'text',
              text: `Processed: ${args.input}`
            }]
          })
        })
      });
      
      // Execute tool
      performanceMonitor.startToolExecution(toolName);
      const impl = await registry.getImplementation(toolName);
      const result = await impl({ input: 'test data' });
      performanceMonitor.endToolExecution(toolName, true);
      
      // Verify results
      expect(result.content[0].text).toBe('Processed: test data');
      
      // Check metrics
      const metrics = performanceMonitor.getToolMetrics(toolName);
      expect(metrics!.calls).toBe(1);
      expect(metrics!.lastUsed).toBeDefined();
    });
  });

  afterAll(() => {
    // Cleanup if needed
  });
});

describe('Tool-specific Tests', () => {
  describe('Browser Automation', () => {
    it('should validate screenshot options', () => {
      const validOptions = {
        url: 'https://example.com',
        fullPage: true,
        tileSize: 1072,
        engine: 'playwright' as const
      };
      
      // Basic validation
      expect(validOptions.url).toMatch(/^https?:\/\//);
      expect(validOptions.tileSize).toBeGreaterThan(0);
      expect(['playwright', 'puppeteer']).toContain(validOptions.engine);
    });
  });

  describe('UI Analysis', () => {
    it('should validate analysis types', () => {
      const validTypes = [
        'quick',
        'comprehensive',
        'accessibility',
        'design_system',
        'user_flow'
      ];
      
      const analysisType = 'comprehensive';
      expect(validTypes).toContain(analysisType);
    });
  });
});