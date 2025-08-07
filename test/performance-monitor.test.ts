import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PerformanceMonitor } from '../src/core/performance-monitor.js';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Tool Metrics', () => {
    it('should track successful tool execution', () => {
      const toolName = 'test_tool';
      
      monitor.startToolExecution(toolName);
      vi.advanceTimersByTime(100);
      monitor.endToolExecution(toolName, true);

      const metrics = monitor.getToolMetrics(toolName);
      expect(metrics).toBeDefined();
      expect(metrics!.calls).toBe(1);
      expect(metrics!.errors).toBe(0);
      expect(metrics!.averageDuration).toBeGreaterThan(0);
      expect(metrics!.averageDuration).toBeLessThanOrEqual(100);
    });

    it('should track failed tool execution', () => {
      const toolName = 'error_tool';
      
      monitor.startToolExecution(toolName);
      vi.advanceTimersByTime(50);
      monitor.endToolExecution(toolName, false);

      const metrics = monitor.getToolMetrics(toolName);
      expect(metrics).toBeDefined();
      expect(metrics!.calls).toBe(1);
      expect(metrics!.errors).toBe(1);
    });

    it('should calculate average duration correctly', () => {
      const toolName = 'avg_tool';
      const durations = [100, 200, 300];
      
      durations.forEach(duration => {
        monitor.startToolExecution(toolName);
        vi.advanceTimersByTime(duration);
        monitor.endToolExecution(toolName, true);
      });

      const metrics = monitor.getToolMetrics(toolName);
      expect(metrics!.calls).toBe(3);
      expect(metrics!.averageDuration).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should handle concurrent tool executions', () => {
      const tool1 = 'tool1';
      const tool2 = 'tool2';
      
      monitor.startToolExecution(tool1);
      vi.advanceTimersByTime(50);
      
      monitor.startToolExecution(tool2);
      vi.advanceTimersByTime(50);
      
      monitor.endToolExecution(tool1, true);
      vi.advanceTimersByTime(50);
      
      monitor.endToolExecution(tool2, true);

      const metrics1 = monitor.getToolMetrics(tool1);
      const metrics2 = monitor.getToolMetrics(tool2);
      
      expect(metrics1!.averageDuration).toBe(100); // 50 + 50
      expect(metrics2!.averageDuration).toBe(100); // 50 + 50
    });

    it('should update lastUsed timestamp', () => {
      const toolName = 'timestamp_tool';
      const now = new Date();
      vi.setSystemTime(now);
      
      monitor.startToolExecution(toolName);
      monitor.endToolExecution(toolName, true);

      const metrics = monitor.getToolMetrics(toolName);
      expect(new Date(metrics!.lastUsed).getTime()).toBe(now.getTime());
    });
  });

  describe('Model Metrics', () => {
    it('should track model usage', () => {
      const model = 'gpt-4o';
      const tokens = 1500;
      const latency = 250;
      
      monitor.recordModelUsage(model, tokens, latency, true);

      const metrics = monitor.getModelMetrics(model);
      expect(metrics).toBeDefined();
      expect(metrics!.requests).toBe(1);
      expect(metrics!.tokens.total).toBe(tokens);
      expect(metrics!.errors).toBe(0);
      expect(metrics!.averageLatency).toBe(latency);
    });

    it('should track model errors', () => {
      const model = 'claude-3-opus';
      
      monitor.recordModelUsage(model, 0, 100, false);
      monitor.recordModelUsage(model, 500, 200, true);

      const metrics = monitor.getModelMetrics(model);
      expect(metrics!.requests).toBe(2);
      expect(metrics!.errors).toBe(1);
      expect(metrics!.tokens.total).toBe(500);
      expect(metrics!.averageLatency).toBe(150); // (100 + 200) / 2
    });

    it('should accumulate token usage', () => {
      const model = 'gemini-pro';
      const usages = [
        { tokens: 100, latency: 50 },
        { tokens: 200, latency: 100 },
        { tokens: 300, latency: 150 }
      ];
      
      usages.forEach(({ tokens, latency }) => {
        monitor.recordModelUsage(model, tokens, latency, true);
      });

      const metrics = monitor.getModelMetrics(model);
      expect(metrics!.tokens.total).toBe(600); // 100 + 200 + 300
      expect(metrics!.averageLatency).toBe(100); // (50 + 100 + 150) / 3
    });
  });

  describe('System Metrics', () => {
    it('should track system uptime', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      const monitor = new PerformanceMonitor();
      
      vi.advanceTimersByTime(5000); // 5 seconds
      
      const systemMetrics = monitor.getSystemMetrics();
      expect(systemMetrics.uptime).toBeGreaterThanOrEqual(5000);
    });

    it('should track active operations', () => {
      monitor.startToolExecution('tool1');
      monitor.startToolExecution('tool2');
      monitor.startToolExecution('tool3');
      
      let metrics = monitor.getSystemMetrics();
      expect(metrics.activeRequests).toBe(3);
      
      monitor.endToolExecution('tool1', true);
      monitor.endToolExecution('tool2', true);
      
      metrics = monitor.getSystemMetrics();
      expect(metrics.activeRequests).toBe(1);
    });

    it('should provide memory usage', () => {
      const metrics = monitor.getSystemMetrics();
      
      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.current).toBeDefined();
      expect(metrics.memory.current.heapUsed).toBeGreaterThan(0);
      expect(metrics.memory.current.heapTotal).toBeGreaterThan(0);
      expect(metrics.memory.current.heapUsed).toBeLessThanOrEqual(metrics.memory.current.heapTotal);
    });
  });

  describe('Performance Summary', () => {
    it('should generate comprehensive summary', () => {
      // Add tool metrics
      monitor.startToolExecution('tool1');
      vi.advanceTimersByTime(100);
      monitor.endToolExecution('tool1', true);
      
      monitor.startToolExecution('tool2');
      vi.advanceTimersByTime(200);
      monitor.endToolExecution('tool2', false);

      // Add model metrics
      monitor.recordModelUsage('gpt-4o', 1000, 150, true);
      monitor.recordModelUsage('claude-3', 2000, 250, true);

      const summary = monitor.getPerformanceSummary();
      
      expect(summary.tools).toBeDefined();
      expect(Object.keys(summary.tools)).toHaveLength(2);
      expect(summary.tools.tool1.errors).toBe(0);
      expect(summary.tools.tool2.errors).toBe(1);
      
      expect(summary.models).toBeDefined();
      expect(Object.keys(summary.models)).toHaveLength(2);
      expect(summary.models['gpt-4o'].tokens.total).toBe(1000);
      expect(summary.models['claude-3'].tokens.total).toBe(2000);
      
      expect(summary.uptime).toBeDefined();
      expect(summary.uptime).toBeGreaterThan(0);
    });

    it('should calculate totals correctly', () => {
      const tools = ['tool1', 'tool2', 'tool3'];
      tools.forEach(tool => {
        for (let i = 0; i < 3; i++) {
          monitor.startToolExecution(tool);
          vi.advanceTimersByTime(100);
          monitor.endToolExecution(tool, i !== 0); // First one fails
        }
      });

      const models = ['model1', 'model2'];
      models.forEach(model => {
        monitor.recordModelUsage(model, 500, 100, true);
        monitor.recordModelUsage(model, 500, 100, false); // One error each
      });

      const summary = monitor.getPerformanceSummary();
      
      // Total tool calls: 3 tools * 3 calls = 9
      const totalToolCalls = Object.values(summary.tools)
        .reduce((sum, t) => sum + t.calls, 0);
      expect(totalToolCalls).toBe(9);
      
      // Total tool errors: 3 tools * 1 error = 3
      const totalToolErrors = Object.values(summary.tools)
        .reduce((sum, t) => sum + t.errors, 0);
      expect(totalToolErrors).toBe(3);
      
      // Total model requests: 2 models * 2 requests = 4
      const totalModelRequests = Object.values(summary.models)
        .reduce((sum, m) => sum + m.requests, 0);
      expect(totalModelRequests).toBe(4);
      
      // Total tokens: 2 models * 1000 tokens = 2000
      const totalTokens = Object.values(summary.models)
        .reduce((sum, m) => sum + m.tokens.total, 0);
      expect(totalTokens).toBe(2000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle endToolExecution without start', () => {
      // Should throw error for missing execution
      expect(() => {
        monitor.endToolExecution('unknown_tool', true);
      }).toThrow('No active execution found for tool: unknown_tool');
    });

    it('should handle multiple starts without end', () => {
      const toolName = 'abandoned_tool';
      
      monitor.startToolExecution(toolName);
      vi.advanceTimersByTime(100);
      
      // Start again without ending first
      monitor.startToolExecution(toolName);
      vi.advanceTimersByTime(50);
      monitor.endToolExecution(toolName, true);

      const metrics = monitor.getToolMetrics(toolName);
      expect(metrics!.calls).toBe(1);
      expect(metrics!.averageDuration).toBe(50); // Should use the most recent start
    });

    it('should handle very long durations', () => {
      const toolName = 'long_tool';
      
      monitor.startToolExecution(toolName);
      vi.advanceTimersByTime(60 * 60 * 1000); // 1 hour
      monitor.endToolExecution(toolName, true);

      const metrics = monitor.getToolMetrics(toolName);
      expect(metrics!.averageDuration).toBe(60 * 60 * 1000);
    });

    it('should return default metrics for non-existent tools', () => {
      const toolMetrics = monitor.getToolMetrics('non_existent');
      expect(toolMetrics).toBeDefined();
      expect(toolMetrics!.invocations).toBe(0);
      expect(toolMetrics!.calls).toBe(0);
      
      expect(monitor.getModelMetrics('non_existent')).toBeNull();
    });
  });
});