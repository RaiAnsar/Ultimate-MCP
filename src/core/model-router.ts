/**
 * Intelligent Model Routing System
 * 
 * Routes tasks to the most appropriate AI model based on
 * task characteristics, performance history, and constraints
 */

import { CostOptimizer } from './cost-optimizer.js';
import { PerformanceMonitor } from './performance-monitor.js';
import { MODELS } from '../config/models.js';

export interface RoutingDecision {
  model: string;
  reasoning: string;
  alternativeModels: string[];
  estimatedCost: number;
  estimatedLatency: number;
}

interface TaskCharacteristics {
  type: 'coding' | 'debugging' | 'analysis' | 'generation' | 'vision' | 'reasoning' | 'general';
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTokens: number;
  requiresSpeed: boolean;
  requiresAccuracy: boolean;
  contextLength?: number;
  language?: string;
  domain?: string;
}

interface ModelProfile {
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  avoid: string[];
  performance: {
    averageLatency: number;
    successRate: number;
    userSatisfaction: number;
  };
}

export class ModelRouter {
  private costOptimizer: CostOptimizer;
  private performanceMonitor: PerformanceMonitor;
  private modelProfiles: Map<string, ModelProfile> = new Map();
  private routingHistory: RoutingDecision[] = [];
  
  constructor(costOptimizer: CostOptimizer, performanceMonitor: PerformanceMonitor) {
    this.costOptimizer = costOptimizer;
    this.performanceMonitor = performanceMonitor;
    this.initializeModelProfiles();
  }
  
  /**
   * Initialize model profiles with characteristics
   */
  private initializeModelProfiles() {
    // GPT-4o
    this.modelProfiles.set(MODELS.GPT_4O, {
      strengths: ['reasoning', 'coding', 'creativity', 'function-calling'],
      weaknesses: ['cost', 'speed'],
      bestFor: ['complex-reasoning', 'code-generation', 'system-design'],
      avoid: ['simple-tasks', 'bulk-processing'],
      performance: { averageLatency: 3000, successRate: 95, userSatisfaction: 90 }
    });
    
    // GPT-4o Mini
    this.modelProfiles.set(MODELS.GPT_4O_MINI, {
      strengths: ['speed', 'cost', 'general-tasks'],
      weaknesses: ['complex-reasoning', 'nuanced-tasks'],
      bestFor: ['quick-responses', 'simple-coding', 'basic-analysis'],
      avoid: ['complex-architecture', 'deep-analysis'],
      performance: { averageLatency: 1000, successRate: 90, userSatisfaction: 85 }
    });
    
    // Claude 3 Opus
    this.modelProfiles.set(MODELS.CLAUDE_3_OPUS, {
      strengths: ['analysis', 'long-context', 'nuanced-reasoning', 'safety'],
      weaknesses: ['cost', 'availability'],
      bestFor: ['document-analysis', 'complex-decisions', 'ethical-considerations'],
      avoid: ['real-time-applications', 'simple-queries'],
      performance: { averageLatency: 4000, successRate: 96, userSatisfaction: 92 }
    });
    
    // DeepSeek Coder
    this.modelProfiles.set(MODELS.DEEPSEEK_CODER_V2, {
      strengths: ['code-completion', 'debugging', 'code-understanding'],
      weaknesses: ['general-reasoning', 'non-code-tasks'],
      bestFor: ['code-generation', 'bug-fixing', 'code-review'],
      avoid: ['general-conversation', 'creative-writing'],
      performance: { averageLatency: 2000, successRate: 93, userSatisfaction: 88 }
    });
    
    // Gemini 2.5 Flash
    this.modelProfiles.set(MODELS.GEMINI_2_FLASH, {
      strengths: ['speed', 'vision', 'massive-context', 'cost'],
      weaknesses: ['consistency', 'specialized-coding'],
      bestFor: ['ui-analysis', 'large-codebase-analysis', 'quick-tasks'],
      avoid: ['critical-code-generation', 'precise-calculations'],
      performance: { averageLatency: 800, successRate: 88, userSatisfaction: 85 }
    });
    
    // Qwen Coder
    this.modelProfiles.set(MODELS.QWEN_2_5_CODER_32B, {
      strengths: ['code-generation', 'multi-language', 'efficiency'],
      weaknesses: ['english-nuance', 'creative-tasks'],
      bestFor: ['algorithm-implementation', 'code-translation', 'technical-docs'],
      avoid: ['creative-writing', 'cultural-context'],
      performance: { averageLatency: 1500, successRate: 91, userSatisfaction: 87 }
    });
  }
  
  /**
   * Route a task to the best model
   */
  async routeTask(
    task: TaskCharacteristics,
    constraints?: {
      maxCost?: number;
      maxLatency?: number;
      preferredModels?: string[];
      excludeModels?: string[];
    }
  ): Promise<RoutingDecision> {
    const candidates = this.getCandidateModels(task, constraints);
    const scores = await this.scoreModels(candidates, task);
    const decision = this.makeRoutingDecision(scores, task, constraints);
    
    // Record decision
    this.routingHistory.push(decision);
    if (this.routingHistory.length > 1000) {
      this.routingHistory.shift();
    }
    
    return decision;
  }
  
  /**
   * Get candidate models for a task
   */
  private getCandidateModels(
    task: TaskCharacteristics,
    constraints?: any
  ): string[] {
    let candidates = Array.from(this.modelProfiles.keys());
    
    // Apply constraints
    if (constraints?.preferredModels) {
      candidates = candidates.filter(m => constraints.preferredModels.includes(m));
    }
    
    if (constraints?.excludeModels) {
      candidates = candidates.filter(m => !constraints.excludeModels.includes(m));
    }
    
    // Filter by task type
    candidates = candidates.filter(model => {
      const profile = this.modelProfiles.get(model)!;
      
      // Check if model is suitable for task type
      if (task.type === 'coding' || task.type === 'debugging') {
        return profile.strengths.includes('coding') || 
               profile.strengths.includes('code-completion');
      }
      
      if (task.type === 'vision') {
        return profile.strengths.includes('vision');
      }
      
      if (task.type === 'analysis' && task.contextLength && task.contextLength > 100000) {
        return profile.strengths.includes('long-context') || 
               profile.strengths.includes('massive-context');
      }
      
      return true; // General models can handle most tasks
    });
    
    // Always return at least one model (fallback to GPT-4o-mini)
    if (candidates.length === 0) {
      candidates = [MODELS.GPT_4O_MINI];
    }
    
    return candidates;
  }
  
  /**
   * Score models for a specific task
   */
  private async scoreModels(
    models: string[],
    task: TaskCharacteristics
  ): Promise<Array<{ model: string; score: number; breakdown: any }>> {
    const scores = [];
    
    for (const model of models) {
      const profile = this.modelProfiles.get(model)!;
      let score = 0;
      const breakdown: any = {};
      
      // 1. Task fitness score (40%)
      let fitnessScore = 0.5;
      if (profile.bestFor.some(use => task.type.includes(use))) {
        fitnessScore = 1.0;
      } else if (profile.avoid.some(avoid => task.type.includes(avoid))) {
        fitnessScore = 0.2;
      }
      
      // Complexity matching
      if (task.complexity === 'complex' && profile.strengths.includes('reasoning')) {
        fitnessScore *= 1.2;
      } else if (task.complexity === 'simple' && profile.strengths.includes('speed')) {
        fitnessScore *= 1.1;
      }
      
      breakdown.fitness = fitnessScore * 40;
      score += breakdown.fitness;
      
      // 2. Performance score (30%)
      const perfMetrics = this.performanceMonitor.getModelMetrics(model);
      let perfScore = profile.performance.successRate / 100;
      
      if (perfMetrics && typeof perfMetrics === 'object' && 'requests' in perfMetrics) {
        // Use actual performance data if available
        const metrics = perfMetrics as any;
        perfScore = Math.min(metrics.requests > 10 ? 
          (metrics.requests - metrics.errors) / metrics.requests : 
          perfScore, 1.0);
      }
      
      breakdown.performance = perfScore * 30;
      score += breakdown.performance;
      
      // 3. Speed score (20% if speed required, 10% otherwise)
      const speedWeight = task.requiresSpeed ? 20 : 10;
      const speedScore = 1 - (profile.performance.averageLatency / 5000);
      breakdown.speed = Math.max(speedScore * speedWeight, 0);
      score += breakdown.speed;
      
      // 4. Cost score (10% or 20% if speed not required)
      const costWeight = task.requiresSpeed ? 10 : 20;
      const costScore = await this.getCostScore(model, task.estimatedTokens);
      breakdown.cost = costScore * costWeight;
      score += breakdown.cost;
      
      scores.push({ model, score, breakdown });
    }
    
    // Sort by score
    scores.sort((a, b) => b.score - a.score);
    
    return scores;
  }
  
  /**
   * Make final routing decision
   */
  private makeRoutingDecision(
    scores: Array<{ model: string; score: number; breakdown: any }>,
    task: TaskCharacteristics,
    constraints?: any
  ): RoutingDecision {
    const topModel = scores[0];
    
    // Generate alternatives - include other scored models and fallback chain
    let alternatives: string[] = [];
    if (scores.length > 1) {
      alternatives = scores.slice(1, 4).map(s => s.model);
    }
    
    // Add fallback models if we don't have enough alternatives
    if (alternatives.length < 3 && topModel) {
      const fallbackChain = this.costOptimizer.createFallbackChain(topModel.model);
      for (const fallbackModel of fallbackChain) {
        if (!alternatives.includes(fallbackModel) && fallbackModel !== topModel.model) {
          alternatives.push(fallbackModel);
          if (alternatives.length >= 3) break;
        }
      }
    }
    
    // Generate reasoning
    let reasoning = this.generateRoutingReasoning(topModel, task, constraints);
    
    // Estimate cost and latency
    const estimatedCost = this.estimateCost(topModel.model, task.estimatedTokens);
    const estimatedLatency = this.modelProfiles.get(topModel.model)!.performance.averageLatency;
    
    // Check constraints
    if (constraints?.maxLatency && estimatedLatency > constraints.maxLatency) {
      // Find faster alternative
      const fasterModel = scores.find(s => 
        this.modelProfiles.get(s.model)!.performance.averageLatency <= constraints.maxLatency
      );
      
      if (fasterModel) {
        return {
          model: fasterModel.model,
          reasoning: `Selected ${fasterModel.model} due to latency constraint`,
          alternativeModels: alternatives,
          estimatedCost: this.estimateCost(fasterModel.model, task.estimatedTokens),
          estimatedLatency: this.modelProfiles.get(fasterModel.model)!.performance.averageLatency
        };
      } else {
        // No model meets the constraint, but mention it in reasoning
        reasoning += ' (latency constraint could not be met)';
      }
    }
    
    return {
      model: topModel.model,
      reasoning,
      alternativeModels: alternatives,
      estimatedCost,
      estimatedLatency
    };
  }
  
  /**
   * Generate routing reasoning
   */
  private generateRoutingReasoning(
    selection: { model: string; score: number; breakdown: any },
    task: TaskCharacteristics,
    constraints?: any
  ): string {
    const profile = this.modelProfiles.get(selection.model)!;
    const reasons = [];
    
    // Always include task type in reasoning
    reasons.push(`${task.type} task`);
    
    // Task fit
    if (selection.breakdown.fitness > 30) {
      reasons.push(`excellent fit for ${task.type} tasks`);
    }
    
    // Performance
    if (selection.breakdown.performance > 25) {
      reasons.push('high success rate');
    }
    
    // Speed
    if (task.requiresSpeed && selection.breakdown.speed > 15) {
      reasons.push('fast response time');
    }
    
    // Cost
    if (selection.breakdown.cost > 15) {
      reasons.push('cost-effective');
    }
    
    // Special capabilities
    if (task.type === 'vision' && profile.strengths.includes('vision')) {
      reasons.push('vision capabilities');
    }
    
    if (task.contextLength && task.contextLength > 100000) {
      reasons.push('handles large context');
    }
    
    return `Selected ${selection.model} because: ${reasons.join(', ')}`;
  }
  
  /**
   * Get cost score for a model
   */
  private async getCostScore(model: string, estimatedTokens: number): Promise<number> {
    // Delegate to cost optimizer
    const optimalModel = this.costOptimizer.selectOptimalModel({
      type: 'general',
      estimatedTokens,
      complexity: 'medium'
    });
    
    // Compare costs
    const modelCost = this.estimateCost(model, estimatedTokens);
    const optimalCost = this.estimateCost(optimalModel.model.name, estimatedTokens);
    
    // Return inverse ratio (lower cost = higher score)
    return Math.min(optimalCost / (modelCost + 0.001), 1.0);
  }
  
  /**
   * Estimate cost (simplified)
   */
  private estimateCost(model: string, tokens: number): number {
    // This is simplified - in production, use actual cost data
    const costMap: Record<string, number> = {
      [MODELS.GPT_4O]: 0.01,
      [MODELS.GPT_4O_MINI]: 0.0006,
      [MODELS.CLAUDE_3_OPUS]: 0.075,
      [MODELS.CLAUDE_3_HAIKU]: 0.00125,
      [MODELS.GEMINI_2_FLASH]: 0.00003,
      [MODELS.DEEPSEEK_CODER_V2]: 0.00028
    };
    
    return (tokens / 1000) * (costMap[model] || 0.001);
  }
  
  /**
   * Get routing insights
   */
  getRoutingInsights() {
    const insights = {
      totalRoutings: this.routingHistory.length,
      modelUsage: {} as Record<string, number>,
      averageScore: 0,
      recommendations: [] as string[]
    };
    
    // Analyze routing history
    for (const decision of this.routingHistory) {
      insights.modelUsage[decision.model] = 
        (insights.modelUsage[decision.model] || 0) + 1;
    }
    
    // Generate recommendations
    const mostUsed = Object.entries(insights.modelUsage)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostUsed && mostUsed[1] > this.routingHistory.length * 0.7) {
      insights.recommendations.push(
        `Consider diversifying model usage. ${mostUsed[0]} used ${mostUsed[1]} times.`
      );
    }
    
    return insights;
  }
}