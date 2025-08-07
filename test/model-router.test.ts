import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRouter } from '../src/core/model-router.js';
import { CostOptimizer } from '../src/core/cost-optimizer.js';
import { PerformanceMonitor } from '../src/core/performance-monitor.js';
import { MODELS } from '../src/config/models.js';

describe('ModelRouter', () => {
  let router: ModelRouter;
  let costOptimizer: CostOptimizer;
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    costOptimizer = new CostOptimizer();
    performanceMonitor = new PerformanceMonitor();
    router = new ModelRouter(costOptimizer, performanceMonitor);
  });

  describe('Task Routing', () => {
    it('should route coding tasks to appropriate models', async () => {
      const task = {
        type: 'coding' as const,
        complexity: 'medium' as const,
        estimatedTokens: 2000,
        requiresSpeed: false,
        requiresAccuracy: true
      };

      const decision = await router.routeTask(task);
      
      expect(decision).toBeDefined();
      expect(decision.model).toBeTruthy();
      expect(decision.reasoning).toContain('coding');
      expect(decision.alternativeModels).toHaveLength(3);
      expect(decision.estimatedCost).toBeGreaterThan(0);
      expect(decision.estimatedLatency).toBeGreaterThan(0);
    });

    it('should prioritize speed when required', async () => {
      const fastTask = {
        type: 'general' as const,
        complexity: 'simple' as const,
        estimatedTokens: 500,
        requiresSpeed: true,
        requiresAccuracy: false
      };

      const slowTask = {
        type: 'general' as const,
        complexity: 'simple' as const,
        estimatedTokens: 500,
        requiresSpeed: false,
        requiresAccuracy: true
      };

      const fastDecision = await router.routeTask(fastTask);
      const slowDecision = await router.routeTask(slowTask);
      
      // Fast task should have lower latency
      expect(fastDecision.estimatedLatency).toBeLessThan(slowDecision.estimatedLatency);
      expect(fastDecision.reasoning).toContain('fast');
    });

    it('should handle vision tasks correctly', async () => {
      const visionTask = {
        type: 'vision' as const,
        complexity: 'medium' as const,
        estimatedTokens: 1000,
        requiresSpeed: false,
        requiresAccuracy: true
      };

      const decision = await router.routeTask(visionTask);
      
      expect(decision.reasoning).toContain('vision');
      // Should select a model with vision capabilities
      expect([MODELS.GEMINI_2_FLASH, MODELS.GPT_4O_WITH_VISION]).toContain(decision.model);
    });

    it('should handle large context tasks', async () => {
      const largeContextTask = {
        type: 'analysis' as const,
        complexity: 'complex' as const,
        estimatedTokens: 50000,
        requiresSpeed: false,
        requiresAccuracy: true,
        contextLength: 150000
      };

      const decision = await router.routeTask(largeContextTask);
      
      expect(decision.reasoning).toContain('large context');
    });
  });

  describe('Constraints Handling', () => {
    it('should respect latency constraints', async () => {
      const task = {
        type: 'general' as const,
        complexity: 'simple' as const,
        estimatedTokens: 1000,
        requiresSpeed: true,
        requiresAccuracy: false
      };

      const constraints = {
        maxLatency: 1000 // 1 second max
      };

      const decision = await router.routeTask(task, constraints);
      
      expect(decision.estimatedLatency).toBeLessThanOrEqual(1000);
    });

    it('should respect cost constraints', async () => {
      const task = {
        type: 'general' as const,
        complexity: 'medium' as const,
        estimatedTokens: 5000,
        requiresSpeed: false,
        requiresAccuracy: false
      };

      const constraints = {
        maxCost: 0.01
      };

      const decision = await router.routeTask(task, constraints);
      
      expect(decision.estimatedCost).toBeLessThanOrEqual(0.01);
    });

    it('should exclude specified models', async () => {
      const task = {
        type: 'coding' as const,
        complexity: 'medium' as const,
        estimatedTokens: 2000,
        requiresSpeed: false,
        requiresAccuracy: true
      };

      const constraints = {
        excludeModels: [MODELS.GPT_4O, MODELS.CLAUDE_3_OPUS]
      };

      const decision = await router.routeTask(task, constraints);
      
      expect(constraints.excludeModels).not.toContain(decision.model);
      decision.alternativeModels.forEach(model => {
        expect(constraints.excludeModels).not.toContain(model);
      });
    });

    it('should prefer specified models', async () => {
      const task = {
        type: 'general' as const,
        complexity: 'simple' as const,
        estimatedTokens: 1000,
        requiresSpeed: false,
        requiresAccuracy: false
      };

      const constraints = {
        preferredModels: [MODELS.GPT_4O_MINI, MODELS.CLAUDE_3_HAIKU]
      };

      const decision = await router.routeTask(task, constraints);
      
      expect(constraints.preferredModels).toContain(decision.model);
    });
  });

  describe('Scoring System', () => {
    it('should score models based on multiple factors', async () => {
      const task = {
        type: 'coding' as const,
        complexity: 'complex' as const,
        estimatedTokens: 3000,
        requiresSpeed: false,
        requiresAccuracy: true
      };

      const decision = await router.routeTask(task);
      
      // Complex coding task should prefer capable models
      expect([
        MODELS.GPT_4O,
        MODELS.CLAUDE_3_OPUS,
        MODELS.DEEPSEEK_CODER,
        MODELS.QWEN_CODER_32B
      ]).toContain(decision.model);
    });

    it('should provide detailed reasoning', async () => {
      const task = {
        type: 'debugging' as const,
        complexity: 'medium' as const,
        estimatedTokens: 2000,
        requiresSpeed: true,
        requiresAccuracy: true
      };

      const decision = await router.routeTask(task);
      
      expect(decision.reasoning).toBeTruthy();
      expect(decision.reasoning.length).toBeGreaterThan(20);
      expect(decision.reasoning).toMatch(/Selected .+ because:/);
    });
  });

  describe('Performance Integration', () => {
    it('should use performance history for routing', async () => {
      // Simulate performance history
      performanceMonitor.recordModelUsage(MODELS.GPT_4O_MINI, 1000, 500, true);
      performanceMonitor.recordModelUsage(MODELS.GPT_4O_MINI, 1000, 600, true);
      performanceMonitor.recordModelUsage(MODELS.GPT_4O_MINI, 1000, 400, true);
      
      performanceMonitor.recordModelUsage(MODELS.GPT_4O, 1000, 2000, false); // Failed
      performanceMonitor.recordModelUsage(MODELS.GPT_4O, 1000, 2500, true);

      const task = {
        type: 'general' as const,
        complexity: 'simple' as const,
        estimatedTokens: 1000,
        requiresSpeed: true,
        requiresAccuracy: false
      };

      const decision = await router.routeTask(task);
      
      // Should prefer model with better performance history
      expect(decision.model).toBe(MODELS.GPT_4O_MINI);
    });
  });

  describe('Routing Insights', () => {
    it('should track routing history', async () => {
      const tasks = [
        { type: 'coding' as const, complexity: 'simple' as const },
        { type: 'debugging' as const, complexity: 'medium' as const },
        { type: 'vision' as const, complexity: 'complex' as const }
      ];

      for (const task of tasks) {
        await router.routeTask({
          ...task,
          estimatedTokens: 1000,
          requiresSpeed: false,
          requiresAccuracy: true
        });
      }

      const insights = router.getRoutingInsights();
      
      expect(insights.totalRoutings).toBe(3);
      expect(Object.keys(insights.modelUsage).length).toBeGreaterThan(0);
    });

    it('should provide recommendations', async () => {
      // Route many tasks to the same model
      const task = {
        type: 'general' as const,
        complexity: 'simple' as const,
        estimatedTokens: 1000,
        requiresSpeed: false,
        requiresAccuracy: false
      };

      for (let i = 0; i < 10; i++) {
        await router.routeTask(task, {
          preferredModels: [MODELS.GPT_4O_MINI]
        });
      }

      const insights = router.getRoutingInsights();
      
      expect(insights.recommendations.length).toBeGreaterThan(0);
      expect(insights.recommendations[0]).toContain('diversifying');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown task types', async () => {
      const task = {
        type: 'unknown' as any,
        complexity: 'medium' as const,
        estimatedTokens: 1000,
        requiresSpeed: false,
        requiresAccuracy: false
      };

      const decision = await router.routeTask(task);
      
      expect(decision.model).toBeTruthy();
      expect(decision.alternativeModels.length).toBeGreaterThan(0);
    });

    it('should handle extreme token counts', async () => {
      const task = {
        type: 'analysis' as const,
        complexity: 'complex' as const,
        estimatedTokens: 1000000, // 1M tokens
        requiresSpeed: false,
        requiresAccuracy: true,
        contextLength: 2000000
      };

      const decision = await router.routeTask(task);
      
      expect(decision.model).toBeTruthy();
      expect(decision.estimatedCost).toBeGreaterThan(0.01); // Large token count should be expensive
    });

    it('should handle conflicting requirements', async () => {
      const task = {
        type: 'coding' as const,
        complexity: 'complex' as const,
        estimatedTokens: 10000,
        requiresSpeed: true, // Conflicts with complex
        requiresAccuracy: true
      };

      const constraints = {
        maxCost: 0.001, // Very low budget for complex task
        maxLatency: 500 // Very fast for complex task
      };

      const decision = await router.routeTask(task, constraints);
      
      // Should still provide a decision
      expect(decision.model).toBeTruthy();
      // But acknowledge the constraints
      expect(decision.reasoning).toContain('constraint');
    });
  });
});