import { EventEmitter } from "events";

interface ToolMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalDuration: number;
  averageDuration: number;
  lastCalled?: Date;
}

interface SystemMetrics {
  uptime: number;
  totalRequests: number;
  activeRequests: number;
  peakMemoryUsage: number;
  currentMemoryUsage: number;
}

export class MetricsCollector extends EventEmitter {
  private toolMetrics: Map<string, ToolMetrics> = new Map();
  private systemMetrics: SystemMetrics;
  private startTime: Date;

  constructor() {
    super();
    this.startTime = new Date();
    this.systemMetrics = {
      uptime: 0,
      totalRequests: 0,
      activeRequests: 0,
      peakMemoryUsage: 0,
      currentMemoryUsage: 0,
    };

    // Update system metrics periodically
    setInterval(() => this.updateSystemMetrics(), 10000); // Every 10 seconds
  }

  recordToolCall(toolName: string, duration: number, success: boolean): void {
    let metrics = this.toolMetrics.get(toolName);
    if (!metrics) {
      metrics = {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalDuration: 0,
        averageDuration: 0,
      };
      this.toolMetrics.set(toolName, metrics);
    }

    metrics.totalCalls++;
    if (success) {
      metrics.successfulCalls++;
    } else {
      metrics.failedCalls++;
    }
    metrics.totalDuration += duration;
    metrics.averageDuration = metrics.totalDuration / metrics.totalCalls;
    metrics.lastCalled = new Date();

    this.systemMetrics.totalRequests++;
    
    // Emit event for real-time monitoring
    this.emit("toolCall", {
      tool: toolName,
      duration,
      success,
      timestamp: new Date(),
    });
  }

  incrementActiveRequests(): void {
    this.systemMetrics.activeRequests++;
  }

  decrementActiveRequests(): void {
    this.systemMetrics.activeRequests = Math.max(0, this.systemMetrics.activeRequests - 1);
  }

  private updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    this.systemMetrics.currentMemoryUsage = memUsage.heapUsed;
    this.systemMetrics.peakMemoryUsage = Math.max(
      this.systemMetrics.peakMemoryUsage,
      memUsage.heapUsed
    );
    this.systemMetrics.uptime = Date.now() - this.startTime.getTime();
  }

  getToolMetrics(toolName?: string): ToolMetrics | Map<string, ToolMetrics> {
    if (toolName) {
      return this.toolMetrics.get(toolName) || {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalDuration: 0,
        averageDuration: 0,
      };
    }
    return new Map(this.toolMetrics);
  }

  getSystemMetrics(): SystemMetrics {
    this.updateSystemMetrics();
    return { ...this.systemMetrics };
  }

  getTopTools(limit: number = 10): Array<{ name: string; metrics: ToolMetrics }> {
    const sorted = Array.from(this.toolMetrics.entries())
      .sort((a, b) => b[1].totalCalls - a[1].totalCalls)
      .slice(0, limit);

    return sorted.map(([name, metrics]) => ({ name, metrics }));
  }

  getSlowestTools(limit: number = 10): Array<{ name: string; metrics: ToolMetrics }> {
    const sorted = Array.from(this.toolMetrics.entries())
      .filter(([_, metrics]) => metrics.totalCalls > 0)
      .sort((a, b) => b[1].averageDuration - a[1].averageDuration)
      .slice(0, limit);

    return sorted.map(([name, metrics]) => ({ name, metrics }));
  }

  getErrorProneTools(limit: number = 10): Array<{ name: string; errorRate: number }> {
    const errorRates = Array.from(this.toolMetrics.entries())
      .filter(([_, metrics]) => metrics.totalCalls > 0)
      .map(([name, metrics]) => ({
        name,
        errorRate: metrics.failedCalls / metrics.totalCalls,
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);

    return errorRates;
  }

  reset(): void {
    this.toolMetrics.clear();
    this.systemMetrics = {
      uptime: 0,
      totalRequests: 0,
      activeRequests: 0,
      peakMemoryUsage: 0,
      currentMemoryUsage: 0,
    };
    this.startTime = new Date();
  }

  exportMetrics(): {
    tools: Record<string, ToolMetrics>;
    system: SystemMetrics;
    exportedAt: Date;
  } {
    return {
      tools: Object.fromEntries(this.toolMetrics),
      system: this.getSystemMetrics(),
      exportedAt: new Date(),
    };
  }
}