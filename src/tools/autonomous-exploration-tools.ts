/**
 * Autonomous Exploration Tools
 * MCP tools for self-guided codebase exploration and task execution
 */

import { z } from 'zod';
import { ToolDefinition } from '../types/index.js';
import { ExplorationEngine } from '../autonomous/exploration-engine.js';
import {
  AutonomousTask,
  TaskType,
  InsightType,
  NavigationAction
} from '../autonomous/types.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('AutonomousTools');

// Global exploration engine instance
let explorationEngine: ExplorationEngine | null = null;

// Initialize exploration engine
function getExplorationEngine(): ExplorationEngine {
  if (!explorationEngine) {
    explorationEngine = new ExplorationEngine();
  }
  return explorationEngine;
}

// Tool definitions

export const exploreCodebase: ToolDefinition = {
  name: 'auto_explore_codebase',
  description: 'Autonomously explore and understand a codebase structure',
  inputSchema: z.object({
    rootPath: z.string().describe('Root directory path to explore'),
    focusAreas: z.array(z.string()).optional()
      .describe('Specific areas to focus on'),
    maxFiles: z.number().optional().default(100)
      .describe('Maximum files to analyze'),
    timeLimit: z.number().optional().default(60000)
      .describe('Time limit in milliseconds')
  }).strict(),
  handler: async (args) => {
    const engine = getExplorationEngine();
    
    // Create exploration task
    const task: AutonomousTask = {
      id: generateId(),
      type: 'explore_codebase',
      description: `Explore codebase at ${args.rootPath}`,
      parameters: {
        rootPath: args.rootPath
      },
      constraints: {
        maxFiles: args.maxFiles,
        timeLimit: args.timeLimit,
        focusAreas: args.focusAreas
      },
      status: 'exploring'
    };
    
    // Execute exploration
    const result = await engine.executeTask(task);
    
    return {
      success: result.success,
      summary: result.summary,
      keyFindings: result.keyFindings,
      recommendations: result.recommendations,
      statistics: {
        filesExplored: result.workingMemory.visitedFiles.size,
        insightsGenerated: result.workingMemory.keyInsights.length,
        decisionsMode: result.workingMemory.decisions.length,
        languages: Object.keys(result.workingMemory.projectStructure.languages),
        duration: `${result.duration}ms`
      },
      projectInfo: {
        totalFiles: result.workingMemory.projectStructure.fileCount,
        totalSize: `${Math.round(result.workingMemory.projectStructure.totalSize / 1024)} KB`,
        patterns: result.workingMemory.projectStructure.patterns.map(p => p.name)
      }
    };
  }
};

export const findImplementation: ToolDefinition = {
  name: 'auto_find_implementation',
  description: 'Autonomously find and understand a specific implementation',
  inputSchema: z.object({
    rootPath: z.string().describe('Root directory to search in'),
    target: z.string().describe('What to find (function, class, feature, etc.)'),
    includeUsage: z.boolean().optional().default(true)
      .describe('Also find where it is used')
  }).strict(),
  handler: async (args) => {
    const engine = getExplorationEngine();
    
    const task: AutonomousTask = {
      id: generateId(),
      type: 'find_implementation',
      description: `Find implementation of ${args.target}`,
      parameters: {
        rootPath: args.rootPath,
        target: args.target,
        includeUsage: args.includeUsage
      },
      status: 'exploring'
    };
    
    const result = await engine.executeTask(task);
    
    // Extract implementation-specific findings
    const implementations = result.workingMemory.keyInsights
      .filter(i => i.description.toLowerCase().includes(args.target.toLowerCase()))
      .map(i => ({
        file: i.filePath || 'unknown',
        description: i.description,
        relevance: i.relevance
      }));
    
    return {
      found: implementations.length > 0,
      target: args.target,
      implementations,
      summary: result.summary,
      recommendations: result.recommendations,
      explorationPath: result.workingMemory.navigationHistory
        .slice(0, 10)
        .map(step => ({
          action: step.action,
          target: step.target,
          findings: step.findings?.slice(0, 3)
        }))
    };
  }
};

export const analyzeArchitecture: ToolDefinition = {
  name: 'auto_analyze_architecture',
  description: 'Autonomously analyze and understand project architecture',
  inputSchema: z.object({
    rootPath: z.string().describe('Root directory of the project'),
    depth: z.enum(['shallow', 'medium', 'deep']).optional().default('medium')
      .describe('Analysis depth')
  }).strict(),
  handler: async (args) => {
    const engine = getExplorationEngine();
    
    const depthConfig = {
      shallow: { maxFiles: 50, timeLimit: 30000 },
      medium: { maxFiles: 150, timeLimit: 90000 },
      deep: { maxFiles: 500, timeLimit: 300000 }
    };
    
    const config = depthConfig[args.depth];
    
    const task: AutonomousTask = {
      id: generateId(),
      type: 'analyze_architecture',
      description: 'Analyze project architecture and patterns',
      parameters: {
        rootPath: args.rootPath
      },
      constraints: config,
      status: 'exploring'
    };
    
    const result = await engine.executeTask(task);
    
    // Extract architecture insights
    const architectureInsights = result.workingMemory.keyInsights
      .filter(i => i.type === 'architecture' || i.type === 'pattern')
      .map(i => i.description);
    
    const patterns = result.workingMemory.projectStructure.patterns;
    
    return {
      architecture: {
        patterns: patterns.map(p => ({
          name: p.name,
          type: p.type,
          confidence: `${Math.round(p.confidence * 100)}%`,
          implications: p.implications
        })),
        insights: architectureInsights,
        languages: result.workingMemory.projectStructure.languages,
        entryPoints: result.workingMemory.keyInsights
          .filter(i => i.type === 'entry-point')
          .map(i => i.filePath || i.description)
      },
      recommendations: result.recommendations,
      statistics: {
        totalFiles: result.workingMemory.projectStructure.fileCount,
        analyzedFiles: result.workingMemory.visitedFiles.size,
        depth: args.depth,
        duration: `${result.duration}ms`
      }
    };
  }
};

export const navigateAutonomously: ToolDefinition = {
  name: 'auto_navigate',
  description: 'Navigate to a specific target with autonomous reasoning',
  inputSchema: z.object({
    target: z.string().describe('Where to navigate (file, directory, symbol)'),
    reason: z.string().describe('Why navigating there'),
    followUp: z.boolean().optional().default(true)
      .describe('Suggest follow-up actions')
  }).strict(),
  handler: async (args) => {
    const engine = getExplorationEngine();
    
    const step = await engine.navigateTo(args.target, args.reason);
    
    return {
      navigation: {
        action: step.action,
        target: step.target,
        reason: step.reason,
        timestamp: step.timestamp
      },
      findings: step.findings || [],
      nextSteps: args.followUp ? step.nextSteps || [] : [],
      workingMemory: {
        visitedFiles: engine.getWorkingMemory().visitedFiles.size,
        insights: engine.getWorkingMemory().keyInsights.length
      }
    };
  }
};

export const planExploration: ToolDefinition = {
  name: 'auto_plan_exploration',
  description: 'Create an exploration plan for a specific goal',
  inputSchema: z.object({
    goal: z.string().describe('What you want to achieve'),
    constraints: z.object({
      maxSteps: z.number().optional().default(20),
      timeLimit: z.number().optional(),
      focusAreas: z.array(z.string()).optional()
    }).optional()
  }).strict(),
  handler: async (args) => {
    const engine = getExplorationEngine();
    
    const plan = await engine.planNavigation(args.goal);
    
    // Apply constraints
    if (args.constraints?.maxSteps) {
      plan.steps = plan.steps.slice(0, args.constraints.maxSteps);
    }
    
    return {
      goal: args.goal,
      plan: {
        steps: plan.steps.map(s => ({
          order: s.order,
          action: s.action,
          target: s.target,
          purpose: s.purpose,
          optional: s.optional
        })),
        estimatedDuration: `${Math.round(plan.estimatedDuration / 1000)}s`,
        requiredCapabilities: plan.requiredCapabilities,
        risks: plan.risks
      },
      constraints: args.constraints
    };
  }
};

export const generateInsight: ToolDefinition = {
  name: 'auto_generate_insight',
  description: 'Generate and record an insight from exploration',
  inputSchema: z.object({
    type: z.enum([
      'architecture', 'pattern', 'dependency', 'issue',
      'opportunity', 'convention', 'entry-point', 'test-coverage'
    ] as const).describe('Type of insight'),
    description: z.string().describe('Insight description'),
    filePath: z.string().optional().describe('Related file path')
  }).strict(),
  handler: async (args) => {
    const engine = getExplorationEngine();
    
    const insight = await engine.generateInsight(
      args.type as InsightType,
      args.description,
      args.filePath
    );
    
    return {
      insight: {
        id: insight.id,
        type: insight.type,
        description: insight.description,
        relevance: `${Math.round(insight.relevance * 100)}%`,
        timestamp: insight.timestamp,
        filePath: insight.filePath
      },
      totalInsights: engine.getWorkingMemory().keyInsights.length
    };
  }
};

export const getExplorationProgress: ToolDefinition = {
  name: 'auto_get_progress',
  description: 'Get current exploration progress and statistics',
  inputSchema: z.object({}).strict(),
  handler: async () => {
    const engine = getExplorationEngine();
    const progress = engine.getProgress();
    const memory = engine.getWorkingMemory();
    
    return {
      currentPhase: progress.phase,
      progress: `${progress.progress}%`,
      statistics: {
        filesVisited: memory.visitedFiles.size,
        totalFiles: memory.projectStructure.fileCount,
        insights: progress.insights,
        decisions: memory.decisions.length,
        navigationSteps: memory.navigationHistory.length
      },
      recentInsights: memory.keyInsights
        .slice(-5)
        .map(i => ({
          type: i.type,
          description: i.description,
          relevance: `${Math.round(i.relevance * 100)}%`
        })),
      languages: Object.entries(memory.projectStructure.languages)
        .map(([lang, count]) => ({ language: lang, files: count }))
    };
  }
};

export const makeAutonomousDecision: ToolDefinition = {
  name: 'auto_make_decision',
  description: 'Make an autonomous decision with reasoning',
  inputSchema: z.object({
    question: z.string().describe('Decision question'),
    options: z.array(z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      pros: z.array(z.string()).optional().default([]),
      cons: z.array(z.string()).optional().default([])
    })).describe('Available options')
  }).strict(),
  handler: async (args) => {
    const engine = getExplorationEngine();
    
    // Calculate confidence for each option
    const optionsWithConfidence = args.options.map(opt => ({
      ...opt,
      confidence: calculateConfidence(opt.pros.length, opt.cons.length)
    }));
    
    const decision = await engine.makeDecision(
      args.question,
      optionsWithConfidence
    );
    
    return {
      decision: {
        question: decision.question,
        selected: decision.selected,
        rationale: decision.rationale,
        impact: decision.impact,
        timestamp: decision.timestamp
      },
      allOptions: args.options.map(opt => ({
        id: opt.id,
        label: opt.label,
        selected: opt.id === decision.selected
      }))
    };
  }
};

export const traceDataFlow: ToolDefinition = {
  name: 'auto_trace_data_flow',
  description: 'Trace how data flows through the codebase',
  inputSchema: z.object({
    rootPath: z.string().describe('Root directory'),
    dataPoint: z.string().describe('Data point to trace (variable, function, etc.)'),
    maxDepth: z.number().optional().default(5)
      .describe('Maximum trace depth')
  }).strict(),
  handler: async (args) => {
    const engine = getExplorationEngine();
    
    const task: AutonomousTask = {
      id: generateId(),
      type: 'trace_data_flow',
      description: `Trace data flow of ${args.dataPoint}`,
      parameters: {
        rootPath: args.rootPath,
        dataPoint: args.dataPoint
      },
      constraints: {
        maxDepth: args.maxDepth
      },
      status: 'exploring'
    };
    
    const result = await engine.executeTask(task);
    
    // Extract flow-related insights
    const flowSteps = result.workingMemory.navigationHistory
      .filter(step => 
        step.action === 'follow_import' || 
        step.action === 'check_references'
      )
      .map(step => ({
        from: step.target,
        action: step.action,
        findings: step.findings
      }));
    
    return {
      dataPoint: args.dataPoint,
      flowTrace: flowSteps,
      summary: result.summary,
      insights: result.keyFindings.filter(f => 
        f.toLowerCase().includes('flow') || 
        f.toLowerCase().includes('dependency')
      )
    };
  }
};

export const suggestImprovements: ToolDefinition = {
  name: 'auto_suggest_improvements',
  description: 'Autonomously analyze code and suggest improvements',
  inputSchema: z.object({
    rootPath: z.string().describe('Root directory'),
    focusAreas: z.array(z.enum([
      'performance', 'security', 'maintainability',
      'testing', 'documentation', 'architecture'
    ])).optional().describe('Areas to focus on')
  }).strict(),
  handler: async (args) => {
    const engine = getExplorationEngine();
    
    const task: AutonomousTask = {
      id: generateId(),
      type: 'suggest_improvements',
      description: 'Analyze code and suggest improvements',
      parameters: {
        rootPath: args.rootPath,
        focusAreas: args.focusAreas
      },
      status: 'exploring'
    };
    
    const result = await engine.executeTask(task);
    
    // Categorize recommendations
    const categorized: Record<string, string[]> = {};
    
    for (const rec of result.recommendations) {
      const category = detectCategory(rec);
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(rec);
    }
    
    return {
      improvements: categorized,
      issues: result.workingMemory.keyInsights
        .filter(i => i.type === 'issue')
        .map(i => ({
          description: i.description,
          file: i.filePath,
          relevance: `${Math.round(i.relevance * 100)}%`
        })),
      summary: result.summary,
      codebaseHealth: calculateHealth(result)
    };
  }
};

// Helper functions

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function calculateConfidence(pros: number, cons: number): number {
  if (pros + cons === 0) return 0.5;
  return pros / (pros + cons);
}

function detectCategory(recommendation: string): string {
  const lower = recommendation.toLowerCase();
  
  if (lower.includes('test')) return 'testing';
  if (lower.includes('type') || lower.includes('typescript')) return 'type-safety';
  if (lower.includes('document') || lower.includes('comment')) return 'documentation';
  if (lower.includes('security') || lower.includes('vulnerab')) return 'security';
  if (lower.includes('performance') || lower.includes('optimize')) return 'performance';
  if (lower.includes('structure') || lower.includes('architect')) return 'architecture';
  
  return 'general';
}

function calculateHealth(result: any): { score: number; status: string } {
  let score = 70; // Base score
  
  // Positive factors
  if (result.workingMemory.keyInsights.some((i: any) => i.type === 'test-coverage')) {
    score += 10;
  }
  
  if (result.workingMemory.projectStructure.patterns.some((p: any) => 
    p.name.includes('TypeScript')
  )) {
    score += 5;
  }
  
  // Negative factors
  const issues = result.workingMemory.keyInsights.filter((i: any) => i.type === 'issue');
  score -= issues.length * 3;
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  const status = score >= 80 ? 'excellent' :
                 score >= 60 ? 'good' :
                 score >= 40 ? 'fair' : 'needs improvement';
  
  return { score, status };
}

// Export all autonomous exploration tools
export const autonomousExplorationTools: ToolDefinition[] = [
  exploreCodebase,
  findImplementation,
  analyzeArchitecture,
  navigateAutonomously,
  planExploration,
  generateInsight,
  getExplorationProgress,
  makeAutonomousDecision,
  traceDataFlow,
  suggestImprovements
];