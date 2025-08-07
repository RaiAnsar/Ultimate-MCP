/**
 * Performance Monitoring System
 * 
 * Tracks metrics, performance, and provides insights
 * for Ultimate MCP server operations
 */

import { EventEmitter } from 'events';

interface PerformanceMetric {
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
}

interface ToolMetrics {
  invocations: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  lastUsed: number;
  errors: number;
  calls: number; // Added for backward compatibility
}

interface ModelMetrics {
  requests: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  averageLatency: number;
  errors: number;
}

export class PerformanceMonitor extends EventEmitter {
  private toolMetrics = new Map<string, PerformanceMetric[]>();
  private modelMetrics = new Map<string, ModelMetrics>();
  private systemMetrics = {
    startTime: Date.now(),
    totalRequests: 0,
    activeRequests: 0,
    peakActiveRequests: 0,
    memoryUsage: [] as Array<{ timestamp: number; used: number; total: number }>,
    cpuUsage: [] as Array<{ timestamp: number; usage: number }>
  };
  
  private metricsInterval?: NodeJS.Timeout;
  
  constructor() {
    super();
    this.startSystemMetricsCollection();
  }
  
  /**
   * Start tracking tool execution
   */
  private activeToolExecutions = new Map<string, { startTime: number }>();
  
  startToolExecution(toolName: string) {
    this.activeToolExecutions.set(toolName, { startTime: Date.now() });
    this.systemMetrics.activeRequests++;
    this.systemMetrics.totalRequests++;
    
    if (this.systemMetrics.activeRequests > this.systemMetrics.peakActiveRequests) {
      this.systemMetrics.peakActiveRequests = this.systemMetrics.activeRequests;
    }
  }
  
  /**
   * End tracking tool execution
   */
  endToolExecution(toolName: string, success: boolean, error?: string) {
    const execution = this.activeToolExecutions.get(toolName);
    if (!execution) {
      throw new Error(`No active execution found for tool: ${toolName}`);
    }
    
    const duration = Date.now() - execution.startTime;
    this.activeToolExecutions.delete(toolName);
    this.systemMetrics.activeRequests--;
    
    this.trackToolExecution(toolName, duration, success, error);
  }
  
  /**
   * Record model usage
   */
  recordModelUsage(
    model: string,
    tokens: number,
    latency: number,
    success: boolean,
    inputTokens?: number,
    outputTokens?: number,
    cost?: number
  ) {
    // For backward compatibility, use tokens as total if input/output not provided
    const actualInputTokens = inputTokens ?? Math.floor(tokens * 0.3);
    const actualOutputTokens = outputTokens ?? Math.floor(tokens * 0.7);
    const actualCost = cost ?? this.estimateCost(model, actualInputTokens, actualOutputTokens);
    
    this.trackModelUsage(
      model,
      actualInputTokens,
      actualOutputTokens,
      actualCost,
      latency,
      success
    );
  }
  
  /**
   * Estimate cost based on model and tokens
   */
  private estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Simple cost estimation - in real implementation would use actual pricing
    const rates = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 }
    };
    
    const baseRate = { input: 0.001, output: 0.002 };
    const modelRates = Object.entries(rates).find(([key]) => model.includes(key))?.[1] || baseRate;
    
    return (inputTokens * modelRates.input + outputTokens * modelRates.output) / 1000;
  }
  
  /**
   * Track tool execution
   */
  trackToolExecution(toolName: string, duration: number, success: boolean, error?: string) {
    if (!this.toolMetrics.has(toolName)) {
      this.toolMetrics.set(toolName, []);
    }
    
    const metrics = this.toolMetrics.get(toolName)!;
    metrics.push({
      timestamp: Date.now(),
      duration,
      success,
      error
    });
    
    // Keep only last 1000 metrics per tool
    if (metrics.length > 1000) {
      metrics.shift();
    }
    
    // Emit event for real-time monitoring
    this.emit('tool:executed', {
      tool: toolName,
      duration,
      success,
      error
    });
  }
  
  /**
   * Track model usage
   */
  trackModelUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    latency: number,
    success: boolean
  ) {
    if (!this.modelMetrics.has(model)) {
      this.modelMetrics.set(model, {
        requests: 0,
        tokens: { input: 0, output: 0, total: 0 },
        cost: 0,
        averageLatency: 0,
        errors: 0
      });
    }
    
    const metrics = this.modelMetrics.get(model)!;
    metrics.requests++;
    metrics.tokens.input += inputTokens;
    metrics.tokens.output += outputTokens;
    metrics.tokens.total += inputTokens + outputTokens;
    metrics.cost += cost;
    
    // Update average latency
    metrics.averageLatency = 
      (metrics.averageLatency * (metrics.requests - 1) + latency) / metrics.requests;
    
    if (!success) {
      metrics.errors++;
    }
    
    // Emit event
    this.emit('model:used', {
      model,
      tokens: { input: inputTokens, output: outputTokens },
      cost,
      latency
    });
  }
  
  /**
   * Track request lifecycle
   */
  startRequest(): string {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.systemMetrics.totalRequests++;
    this.systemMetrics.activeRequests++;
    
    if (this.systemMetrics.activeRequests > this.systemMetrics.peakActiveRequests) {
      this.systemMetrics.peakActiveRequests = this.systemMetrics.activeRequests;
    }
    
    return requestId;
  }
  
  endRequest(requestId: string) {
    this.systemMetrics.activeRequests--;
  }
  
  /**
   * Get tool metrics
   */
  getToolMetrics(toolName?: string): Record<string, ToolMetrics> | ToolMetrics | null {
    if (toolName) {
      const metrics = this.toolMetrics.get(toolName);
      if (!metrics || metrics.length === 0) {
        // Return default metrics instead of null for consistency
        return {
          invocations: 0,
          totalDuration: 0,
          averageDuration: 0,
          minDuration: 0,
          maxDuration: 0,
          successRate: 0,
          lastUsed: 0,
          errors: 0,
          calls: 0
        };
      }
      
      return this.calculateToolMetrics(toolName, metrics);
    }
    
    // Return all tool metrics
    const allMetrics: Record<string, ToolMetrics> = {};
    for (const [name, metrics] of this.toolMetrics.entries()) {
      if (metrics.length > 0) {
        allMetrics[name] = this.calculateToolMetrics(name, metrics);
      }
    }
    
    return allMetrics;
  }
  
  /**
   * Calculate metrics for a tool
   */
  private calculateToolMetrics(toolName: string, metrics: PerformanceMetric[]): ToolMetrics {
    const durations = metrics.map(m => m.duration);
    const successful = metrics.filter(m => m.success).length;
    
    return {
      invocations: metrics.length,
      totalDuration: durations.reduce((a, b) => a + b, 0),
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successful / metrics.length) * 100,
      lastUsed: metrics[metrics.length - 1].timestamp,
      errors: metrics.length - successful,
      calls: metrics.length // Added for backward compatibility
    };
  }
  
  /**
   * Get model metrics
   */
  getModelMetrics(model?: string): Record<string, ModelMetrics> | ModelMetrics | null {
    if (model) {
      return this.modelMetrics.get(model) || null;
    }
    
    return Object.fromEntries(this.modelMetrics.entries());
  }
  
  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      uptime: Date.now() - this.systemMetrics.startTime,
      totalRequests: this.systemMetrics.totalRequests,
      activeRequests: this.systemMetrics.activeRequests,
      peakActiveRequests: this.systemMetrics.peakActiveRequests,
      tools: {} as Record<string, ToolMetrics>,
      models: {} as Record<string, ModelMetrics>,
      memoryUsage: this.systemMetrics.memoryUsage[this.systemMetrics.memoryUsage.length - 1] || null
    };
    
    // Aggregate tool metrics
    const toolMetrics = this.getToolMetrics() as Record<string, ToolMetrics>;
    summary.tools = toolMetrics;
    
    // Aggregate model metrics
    const modelMetrics = this.getModelMetrics() as Record<string, ModelMetrics>;
    summary.models = modelMetrics;
    
    return summary;
  }
  
  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const uptime = Date.now() - this.systemMetrics.startTime;
    const memoryUsage = process.memoryUsage();
    
    return {
      uptime,
      uptimeHuman: this.formatUptime(uptime),
      totalRequests: this.systemMetrics.totalRequests,
      activeRequests: this.systemMetrics.activeRequests,
      peakActiveRequests: this.systemMetrics.peakActiveRequests,
      requestsPerMinute: (this.systemMetrics.totalRequests / (uptime / 60000)).toFixed(2),
      memory: {
        current: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        history: this.systemMetrics.memoryUsage.slice(-20) // Last 20 samples
      },
      cpu: {
        history: this.systemMetrics.cpuUsage.slice(-20) // Last 20 samples
      }
    };
  }
  
  /**
   * Get cost breakdown
   */
  getCostBreakdown() {
    const breakdown: Record<string, { cost: number; percentage: number }> = {};
    let totalCost = 0;
    
    // Calculate total cost
    for (const metrics of this.modelMetrics.values()) {
      totalCost += metrics.cost;
    }
    
    // Calculate breakdown
    for (const [model, metrics] of this.modelMetrics.entries()) {
      breakdown[model] = {
        cost: metrics.cost,
        percentage: totalCost > 0 ? (metrics.cost / totalCost) * 100 : 0
      };
    }
    
    return {
      total: totalCost,
      breakdown,
      byProvider: this.groupCostByProvider()
    };
  }
  
  /**
   * Group costs by provider
   */
  private groupCostByProvider() {
    const providers: Record<string, number> = {};
    
    for (const [model, metrics] of this.modelMetrics.entries()) {
      const provider = model.split('/')[0] || 'unknown';
      providers[provider] = (providers[provider] || 0) + metrics.cost;
    }
    
    return providers;
  }
  
  /**
   * Get performance insights
   */
  getInsights() {
    const insights: string[] = [];
    
    // Analyze tool performance
    const toolMetrics = this.getToolMetrics() as Record<string, ToolMetrics>;
    const slowTools = Object.entries(toolMetrics)
      .filter(([_, metrics]) => metrics.averageDuration > 5000)
      .sort((a, b) => b[1].averageDuration - a[1].averageDuration);
    
    if (slowTools.length > 0) {
      insights.push(`Slow tools detected: ${slowTools.map(([name]) => name).join(', ')}`);
    }
    
    // Analyze error rates
    const highErrorTools = Object.entries(toolMetrics)
      .filter(([_, metrics]) => metrics.successRate < 90)
      .sort((a, b) => a[1].successRate - b[1].successRate);
    
    if (highErrorTools.length > 0) {
      insights.push(`High error rate tools: ${highErrorTools.map(([name, m]) => 
        `${name} (${m.successRate.toFixed(1)}%)`).join(', ')}`);
    }
    
    // Analyze costs
    const costBreakdown = this.getCostBreakdown();
    if (costBreakdown.total > 10) {
      insights.push(`High API costs: $${costBreakdown.total.toFixed(2)} total`);
    }
    
    // Memory usage
    const currentMemory = process.memoryUsage();
    const heapPercentage = (currentMemory.heapUsed / currentMemory.heapTotal) * 100;
    if (heapPercentage > 80) {
      insights.push(`High memory usage: ${heapPercentage.toFixed(1)}% of heap`);
    }
    
    return insights;
  }
  
  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    return {
      timestamp: Date.now(),
      tools: Object.fromEntries(
        Array.from(this.toolMetrics.entries()).map(([name, metrics]) => [
          name,
          metrics.slice(-100) // Last 100 executions
        ])
      ),
      models: Object.fromEntries(this.modelMetrics.entries()),
      system: this.getSystemMetrics()
    };
  }
  
  /**
   * Start collecting system metrics
   */
  private startSystemMetricsCollection() {
    // Collect every 30 seconds
    this.metricsInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      this.systemMetrics.memoryUsage.push({
        timestamp: Date.now(),
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal
      });
      
      // Keep only last hour of data
      const oneHourAgo = Date.now() - 3600000;
      this.systemMetrics.memoryUsage = this.systemMetrics.memoryUsage
        .filter(m => m.timestamp > oneHourAgo);
      
      // CPU usage (simplified - in production use proper CPU monitoring)
      const cpuUsage = process.cpuUsage();
      this.systemMetrics.cpuUsage.push({
        timestamp: Date.now(),
        usage: (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to seconds
      });
      
      this.systemMetrics.cpuUsage = this.systemMetrics.cpuUsage
        .filter(m => m.timestamp > oneHourAgo);
        
      // Emit metrics event
      this.emit('metrics:collected', {
        memory: memoryUsage,
        cpu: cpuUsage
      });
    }, 30000);
  }
  
  /**
   * Format uptime
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  /**
   * Cleanup
   */
  destroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.removeAllListeners();
  }
}