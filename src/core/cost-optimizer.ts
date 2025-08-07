/**
 * Cost Optimization Engine
 * 
 * Intelligently manages model selection and token usage
 * to minimize costs while maintaining quality
 */

import { MODELS, MODEL_CATEGORIES } from '../config/models.js';

interface ModelCost {
  inputPer1k: number;
  outputPer1k: number;
}

interface ModelInfo {
  name: string;
  provider: string;
  category: string;
  contextWindow: number;
  cost: ModelCost;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'high' | 'medium' | 'low';
  capabilities: string[];
}

interface OptimizationConstraints {
  maxCost?: number;
  maxLatency?: number;
  minQuality?: 'high' | 'medium' | 'low';
  requiredCapabilities?: string[];
}

interface TokenOptimizationResult {
  original: string;
  optimized: string;
  savings: {
    tokens: number;
    percentage: number;
  };
}

export class CostOptimizer {
  private modelInfo: Map<string, ModelInfo> = new Map();
  private usageHistory: Map<string, { tokens: number; cost: number }> = new Map();
  private modelPerformance: Map<string, { avgLatency: number; successRate: number }> = new Map();
  private budgetConstraints: { daily?: number; monthly?: number } = {};
  
  constructor() {
    this.initializeModelInfo();
  }
  
  /**
   * Initialize model information with costs and capabilities
   */
  private initializeModelInfo() {
    // OpenAI models
    this.modelInfo.set(MODELS.GPT_4O, {
      name: MODELS.GPT_4O,
      provider: 'openai',
      category: 'premium',
      contextWindow: 128000,
      cost: { inputPer1k: 0.0025, outputPer1k: 0.01 },
      speed: 'medium',
      quality: 'high',
      capabilities: ['coding', 'reasoning', 'vision', 'function-calling']
    });
    
    this.modelInfo.set(MODELS.GPT_4O_MINI, {
      name: MODELS.GPT_4O_MINI,
      provider: 'openai',
      category: 'efficient',
      contextWindow: 128000,
      cost: { inputPer1k: 0.00015, outputPer1k: 0.0006 },
      speed: 'fast',
      quality: 'medium',
      capabilities: ['coding', 'reasoning', 'function-calling']
    });
    
    // Anthropic models
    this.modelInfo.set(MODELS.CLAUDE_3_OPUS, {
      name: MODELS.CLAUDE_3_OPUS,
      provider: 'anthropic',
      category: 'premium',
      contextWindow: 200000,
      cost: { inputPer1k: 0.015, outputPer1k: 0.075 },
      speed: 'slow',
      quality: 'high',
      capabilities: ['coding', 'reasoning', 'vision', 'long-context']
    });
    
    this.modelInfo.set(MODELS.CLAUDE_3_HAIKU, {
      name: MODELS.CLAUDE_3_HAIKU,
      provider: 'anthropic',
      category: 'efficient',
      contextWindow: 200000,
      cost: { inputPer1k: 0.00025, outputPer1k: 0.00125 },
      speed: 'fast',
      quality: 'medium',
      capabilities: ['coding', 'reasoning', 'long-context']
    });
    
    // Google models
    this.modelInfo.set(MODELS.GEMINI_2_FLASH, {
      name: MODELS.GEMINI_2_FLASH,
      provider: 'google',
      category: 'efficient',
      contextWindow: 1000000,
      cost: { inputPer1k: 0.00001, outputPer1k: 0.00003 },
      speed: 'fast',
      quality: 'medium',
      capabilities: ['coding', 'reasoning', 'vision', 'massive-context']
    });
    
    // DeepSeek models
    this.modelInfo.set(MODELS.DEEPSEEK_CODER, {
      name: MODELS.DEEPSEEK_CODER,
      provider: 'deepseek',
      category: 'specialized',
      contextWindow: 128000,
      cost: { inputPer1k: 0.00014, outputPer1k: 0.00028 },
      speed: 'medium',
      quality: 'high',
      capabilities: ['coding', 'code-completion', 'debugging']
    });
    
    // Add more models as needed...
  }
  
  /**
   * Select the most cost-effective model for a task
   */
  selectOptimalModel(
    task: {
      type: 'coding' | 'reasoning' | 'vision' | 'general';
      estimatedTokens: number;
      complexity: 'simple' | 'medium' | 'complex';
    },
    constraints: OptimizationConstraints = {}
  ): ModelInfo {
    let candidates = Array.from(this.modelInfo.values());
    
    // Filter by required capabilities
    if (task.type === 'vision') {
      candidates = candidates.filter(m => m.capabilities.includes('vision'));
    } else if (task.type === 'coding') {
      candidates = candidates.filter(m => 
        m.capabilities.includes('coding') || m.capabilities.includes('code-completion')
      );
    }
    
    // Filter by quality requirements
    if (constraints.minQuality) {
      const qualityOrder = { high: 3, medium: 2, low: 1 };
      const minQualityScore = qualityOrder[constraints.minQuality];
      candidates = candidates.filter(m => 
        qualityOrder[m.quality] >= minQualityScore
      );
    }
    
    // Filter by context window
    candidates = candidates.filter(m => m.contextWindow >= task.estimatedTokens);
    
    // Filter by additional capabilities
    if (constraints.requiredCapabilities) {
      candidates = candidates.filter(m =>
        constraints.requiredCapabilities!.every(cap => m.capabilities.includes(cap))
      );
    }
    
    // Score and rank models
    const scored = candidates.map(model => {
      let score = 0;
      
      // Cost score (lower is better)
      const estimatedCost = this.estimateCost(model, task.estimatedTokens);
      const costScore = 1 / (estimatedCost + 0.01); // Avoid division by zero
      score += costScore * 40; // 40% weight
      
      // Quality score
      const qualityScore = model.quality === 'high' ? 1 : model.quality === 'medium' ? 0.7 : 0.4;
      score += qualityScore * 30; // 30% weight
      
      // Speed score
      const speedScore = model.speed === 'fast' ? 1 : model.speed === 'medium' ? 0.7 : 0.4;
      score += speedScore * 20; // 20% weight
      
      // Task fitness score
      let fitnessScore = 0.5;
      if (task.type === 'coding' && model.name && model.name.includes('coder')) fitnessScore = 1;
      if (task.type === 'vision' && model.capabilities && model.capabilities.includes('vision')) fitnessScore = 0.9;
      
      // Adjust for complexity - prefer higher quality models for complex tasks
      if (task.complexity === 'complex') {
        if (model.quality === 'high') fitnessScore = 1;
        // For complex tasks, penalize low-quality models more
        if (model.quality === 'low') score -= 20;
      } else if (task.complexity === 'simple') {
        if (model.speed === 'fast') fitnessScore = 0.9;
        // For simple tasks, prefer cheaper models
        score += costScore * 20; // Add extra weight to cost for simple tasks
      }
      
      score += fitnessScore * 10; // 10% weight
      
      return { model, score };
    });
    
    // Sort by score
    scored.sort((a, b) => b.score - a.score);
    
    // Apply cost constraint if specified
    if (constraints.maxCost) {
      const withinBudget = scored.filter(s => 
        this.estimateCost(s.model, task.estimatedTokens) <= constraints.maxCost!
      );
      if (withinBudget.length > 0) {
        const alternatives = withinBudget.slice(1, 4).map(s => s.model.name);
        return {
          model: withinBudget[0].model,
          reason: `Selected ${withinBudget[0].model.name} - within budget constraint`,
          score: withinBudget[0].score,
          estimatedCost: this.estimateCost(withinBudget[0].model, task.estimatedTokens),
          alternatives
        };
      }
    }
    
    const selected = scored[0];
    if (!selected) {
      const defaultModel = this.getDefaultModel();
      return {
        model: defaultModel,
        reason: 'Using default model',
        score: 0,
        estimatedCost: this.estimateCost(defaultModel, task.estimatedTokens),
        alternatives: []
      };
    }
    
    // Build reason based on task and model characteristics
    let reason = `Selected ${selected.model.name}`;
    const reasons = [];
    
    if (task.type === 'coding' && (selected.model.name.includes('coder') || 
        selected.model.capabilities.includes('coding'))) {
      reasons.push('optimized for coding tasks');
    }
    if (task.type === 'vision' && selected.model.capabilities.includes('vision')) {
      reasons.push('vision capabilities');
    }
    if (task.type === 'debugging' && selected.model.capabilities.includes('coding')) {
      reasons.push('debugging support');
    }
    if (selected.model.speed === 'fast' && task.complexity === 'simple') {
      reasons.push('fast response for simple task');
    }
    if (selected.model.quality === 'high' && task.complexity === 'complex') {
      reasons.push('high quality for complex task');
    }
    
    if (reasons.length > 0) {
      reason += ` - ${reasons.join(', ')}`;
    } else {
      reason += ` - highest score (${selected.score.toFixed(2)})`;
    }
    
    // Get alternative models (top 3 after the selected one)
    const alternatives = scored.slice(1, 4).map(s => s.model.name);
    
    return {
      model: selected.model,
      reason,
      score: selected.score,
      estimatedCost: this.estimateCost(selected.model, task.estimatedTokens),
      alternatives
    };
  }
  
  /**
   * Optimize token usage in prompts
   */
  optimizeTokenUsage(prompt: string, maxTokens?: number): TokenOptimizationResult {
    let optimized = prompt;
    const originalLength = prompt.length;
    
    // 1. Remove redundant whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    // 2. Remove unnecessary line breaks
    optimized = optimized.replace(/\n{3,}/g, '\n\n');
    
    // 3. Compress repeated instructions
    const compressionPatterns = [
      { pattern: /Please\s+/gi, replacement: '' },
      { pattern: /Could you please\s+/gi, replacement: '' },
      { pattern: /I would like you to\s+/gi, replacement: '' },
      { pattern: /Can you\s+/gi, replacement: '' },
      { pattern: /Make sure to\s+/gi, replacement: 'Ensure ' },
      { pattern: /It is important that\s+/gi, replacement: 'Important: ' },
      { pattern: /In order to\s+/gi, replacement: 'To ' },
      { pattern: /\s+very\s+/gi, replacement: ' ' },
      { pattern: /\s+really\s+/gi, replacement: ' ' }
    ];
    
    for (const { pattern, replacement } of compressionPatterns) {
      optimized = optimized.replace(pattern, replacement);
    }
    
    // 4. Use abbreviations for common terms
    const abbreviations = new Map([
      ['artificial intelligence', 'AI'],
      ['machine learning', 'ML'],
      ['natural language processing', 'NLP'],
      ['application programming interface', 'API'],
      ['user interface', 'UI'],
      ['user experience', 'UX'],
      ['typescript', 'TS'],
      ['javascript', 'JS']
    ]);
    
    for (const [full, abbr] of abbreviations) {
      const regex = new RegExp(`\\b${full}\\b`, 'gi');
      optimized = optimized.replace(regex, abbr);
    }
    
    // 5. Remove filler words
    const fillerWords = [
      'basically', 'actually', 'obviously', 'clearly',
      'simply', 'just', 'really', 'very', 'quite'
    ];
    
    for (const filler of fillerWords) {
      const regex = new RegExp(`\\b${filler}\\b\\s*`, 'gi');
      optimized = optimized.replace(regex, '');
    }
    
    // 6. Truncate if needed
    if (maxTokens) {
      const estimatedTokens = Math.ceil(optimized.length / 4); // Rough estimate
      if (estimatedTokens > maxTokens) {
        const targetLength = maxTokens * 4;
        optimized = optimized.substring(0, targetLength) + '...';
      }
    }
    
    const optimizedLength = optimized.length;
    const savings = originalLength - optimizedLength;
    
    return {
      original: prompt,
      optimized,
      savings: {
        tokens: Math.ceil(savings / 4), // Rough token estimate
        percentage: Math.round((savings / originalLength) * 100)
      }
    };
  }
  
  /**
   * Create fallback chain for model failures
   */
  createFallbackChain(primaryModel: string): string[] {
    const primary = this.modelInfo.get(primaryModel);
    if (!primary) return [this.getDefaultModel().name];
    
    const chain: string[] = [primaryModel];
    
    // Add similar quality model from different provider
    const sameQuality = Array.from(this.modelInfo.values())
      .filter(m => 
        m.name !== primaryModel &&
        m.quality === primary.quality &&
        m.provider !== primary.provider
      )
      .sort((a, b) => this.estimateCost(a, 1000) - this.estimateCost(b, 1000));
    
    if (sameQuality.length > 0) {
      chain.push(sameQuality[0].name);
    }
    
    // Add cheaper alternative
    const cheaper = Array.from(this.modelInfo.values())
      .filter(m => 
        !chain.includes(m.name) &&
        this.estimateCost(m, 1000) < this.estimateCost(primary, 1000)
      )
      .sort((a, b) => {
        // Prefer higher quality among cheaper options
        const qualityOrder = { high: 3, medium: 2, low: 1 };
        return qualityOrder[b.quality] - qualityOrder[a.quality];
      });
    
    if (cheaper.length > 0) {
      chain.push(cheaper[0].name);
    }
    
    // Always end with reliable fallbacks
    if (!chain.includes(MODELS.GPT_4O_MINI)) {
      chain.push(MODELS.GPT_4O_MINI);
    }
    
    // Ensure we have at least 3 models in the chain
    const fallbackModels = [MODELS.CLAUDE_3_HAIKU, MODELS.GEMINI_2_FLASH, MODELS.DEEPSEEK_CODER];
    for (const fallback of fallbackModels) {
      if (chain.length >= 3) break;
      if (!chain.includes(fallback)) {
        chain.push(fallback);
      }
    }
    
    return chain;
  }
  
  /**
   * Track usage for cost monitoring
   */
  trackUsage(model: string, inputTokens: number, outputTokens: number) {
    const cost = this.calculateCost(model, inputTokens, outputTokens);
    
    if (!this.usageHistory.has(model)) {
      this.usageHistory.set(model, { tokens: 0, cost: 0 });
    }
    
    const usage = this.usageHistory.get(model)!;
    usage.tokens += inputTokens + outputTokens;
    usage.cost += cost;
  }
  
  /**
   * Get cost report
   */
  getCostReport(period?: 'hour' | 'day' | 'week' | 'month' | 'all') {
    const now = Date.now();
    let since = 0;
    
    switch (period) {
      case 'hour':
        since = now - 3600000;
        break;
      case 'day':
        since = now - 86400000;
        break;
      case 'week':
        since = now - 604800000;
        break;
      case 'month':
        since = now - 2592000000;
        break;
      default:
        since = 0; // All time
    }
    
    const report = {
      totalCost: 0,
      byModel: {} as Record<string, { tokens: number; cost: number; percentage: number }>,
      byProvider: {} as Record<string, number>,
      modelBreakdown: {} as Record<string, number>,
      recommendations: [] as string[]
    };
    
    // Calculate totals
    for (const [model, usage] of this.usageHistory) {
      report.totalCost += usage.cost;
      report.modelBreakdown[model] = usage.cost;
      report.byModel[model] = {
        tokens: usage.tokens,
        cost: usage.cost,
        percentage: 0 // Will calculate after total
      };
      
      const provider = model.split('/')[0];
      report.byProvider[provider] = (report.byProvider[provider] || 0) + usage.cost;
    }
    
    // Calculate percentages
    for (const model in report.byModel) {
      report.byModel[model].percentage = 
        report.totalCost > 0 ? (report.byModel[model].cost / report.totalCost) * 100 : 0;
    }
    
    // Generate recommendations
    if (report.totalCost > 100) {
      report.recommendations.push('Consider using more cost-effective models for simple tasks');
    }
    
    const highCostModels = Object.entries(report.byModel)
      .filter(([_, data]) => data.percentage > 50)
      .map(([model]) => model);
    
    if (highCostModels.length > 0) {
      report.recommendations.push(
        `High concentration of costs in: ${highCostModels.join(', ')}. Consider diversifying.`
      );
    }
    
    return report;
  }
  
  /**
   * Estimate cost for a model and token count
   */
  private estimateCost(model: ModelInfo, estimatedTokens: number): number {
    // Assume 30% of tokens are output
    const inputTokens = estimatedTokens * 0.7;
    const outputTokens = estimatedTokens * 0.3;
    
    return (
      (inputTokens / 1000) * model.cost.inputPer1k +
      (outputTokens / 1000) * model.cost.outputPer1k
    );
  }
  
  /**
   * Calculate actual cost
   */
  private calculateCost(modelName: string, inputTokens: number, outputTokens: number): number {
    const model = this.modelInfo.get(modelName);
    if (!model) return 0;
    
    return (
      (inputTokens / 1000) * model.cost.inputPer1k +
      (outputTokens / 1000) * model.cost.outputPer1k
    );
  }
  
  /**
   * Set budget constraints
   */
  setConstraints(constraints: { daily?: number; monthly?: number }) {
    this.budgetConstraints = constraints;
  }
  
  /**
   * Get optimization insights
   */
  getOptimizationInsights() {
    const insights = {
      recommendations: [] as string[],
      savingsOpportunity: 0,
      currentSpend: 0,
      projectedSavings: 0
    };
    
    // Calculate current spend
    for (const [model, usage] of this.usageHistory) {
      insights.currentSpend += usage.cost;
    }
    
    // Analyze usage patterns
    const highCostModels = Array.from(this.usageHistory.entries())
      .filter(([model, usage]) => {
        const modelInfo = this.modelInfo.get(model);
        return modelInfo && modelInfo.category === 'premium';
      });
    
    if (highCostModels.length > 0) {
      const premiumUsage = highCostModels.reduce((sum, [_, usage]) => sum + usage.tokens, 0);
      const totalUsage = Array.from(this.usageHistory.values())
        .reduce((sum, usage) => sum + usage.tokens, 0);
      
      if (premiumUsage / totalUsage > 0.3) {
        insights.recommendations.push(
          'Consider using more cost-effective models for simple tasks'
        );
        insights.savingsOpportunity = insights.currentSpend * 0.3;
      }
    }
    
    return insights;
  }
  
  /**
   * Get default model
   */
  private getDefaultModel(): ModelInfo {
    return this.modelInfo.get(MODELS.GPT_4O_MINI) || 
           Array.from(this.modelInfo.values())[0];
  }
}