/**
 * Autonomous Exploration Types
 * Inspired by code-assistant for self-guided code navigation and task execution
 */

export interface WorkingMemory {
  projectStructure: ProjectStructure;
  visitedFiles: Set<string>;
  keyInsights: Insight[];
  taskContext: TaskContext;
  navigationHistory: NavigationStep[];
  decisions: Decision[];
}

export interface ProjectStructure {
  rootPath: string;
  directories: DirectoryNode;
  fileCount: number;
  totalSize: number;
  languages: Record<string, number>;
  patterns: ProjectPattern[];
  metadata?: Record<string, any>;
}

export interface DirectoryNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DirectoryNode[];
  size?: number;
  language?: string;
  importance?: number;
  lastModified?: Date;
}

export interface Insight {
  id: string;
  type: InsightType;
  description: string;
  relevance: number;
  filePath?: string;
  lineRange?: { start: number; end: number };
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type InsightType = 
  | 'architecture'
  | 'pattern'
  | 'dependency'
  | 'issue'
  | 'opportunity'
  | 'convention'
  | 'entry-point'
  | 'test-coverage';

export interface TaskContext {
  id: string;
  description: string;
  goals: string[];
  constraints: string[];
  currentPhase: TaskPhase;
  progress: number;
  startTime: Date;
  estimatedCompletion?: Date;
}

export type TaskPhase = 
  | 'exploration'
  | 'analysis'
  | 'planning'
  | 'implementation'
  | 'validation'
  | 'completion';

export interface NavigationStep {
  id: string;
  action: NavigationAction;
  target: string;
  reason: string;
  timestamp: Date;
  findings?: string[];
  nextSteps?: string[];
}

export type NavigationAction = 
  | 'explore_directory'
  | 'read_file'
  | 'analyze_code'
  | 'search_pattern'
  | 'follow_import'
  | 'check_references'
  | 'examine_tests';

export interface Decision {
  id: string;
  question: string;
  options: DecisionOption[];
  selected?: string;
  rationale?: string;
  impact: 'low' | 'medium' | 'high';
  timestamp: Date;
  userInput?: boolean;
}

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  confidence: number;
}

export interface ExplorationStrategy {
  name: string;
  description: string;
  phases: ExplorationPhase[];
  heuristics: ExplorationHeuristic[];
}

export interface ExplorationPhase {
  name: string;
  goals: string[];
  actions: NavigationAction[];
  completionCriteria: string[];
  maxDuration?: number;
}

export interface ExplorationHeuristic {
  name: string;
  condition: string;
  action: string;
  priority: number;
}

export interface FileAnalysis {
  filePath: string;
  language: string;
  purpose: string;
  exports: string[];
  imports: string[];
  dependencies: string[];
  complexity: number;
  testCoverage?: number;
  issues: CodeIssue[];
  suggestions: string[];
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  rule?: string;
  fixable?: boolean;
}

export interface ExplorationResult {
  taskId: string;
  success: boolean;
  workingMemory: WorkingMemory;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  artifacts?: Record<string, any>;
  duration: number;
}

export interface AutonomousTask {
  id: string;
  type: TaskType;
  description: string;
  parameters: Record<string, any>;
  strategy?: ExplorationStrategy;
  constraints?: TaskConstraints;
  status: TaskStatus;
  result?: ExplorationResult;
}

export type TaskType = 
  | 'explore_codebase'
  | 'find_implementation'
  | 'analyze_architecture'
  | 'trace_data_flow'
  | 'identify_patterns'
  | 'suggest_improvements'
  | 'generate_documentation';

export type TaskStatus = 
  | 'pending'
  | 'exploring'
  | 'analyzing'
  | 'completed'
  | 'failed'
  | 'interrupted';

export interface TaskConstraints {
  maxFiles?: number;
  maxDepth?: number;
  timeLimit?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  focusAreas?: string[];
}

export interface InteractionRequest {
  id: string;
  type: 'question' | 'confirmation' | 'choice';
  message: string;
  options?: string[];
  context: string;
  timeout?: number;
}

export interface ProjectPattern {
  name: string;
  type: 'architecture' | 'framework' | 'library' | 'convention';
  evidence: string[];
  confidence: number;
  implications: string[];
}

export interface NavigationPlan {
  steps: PlannedStep[];
  estimatedDuration: number;
  requiredCapabilities: string[];
  risks: string[];
}

export interface PlannedStep {
  order: number;
  action: NavigationAction;
  target: string;
  purpose: string;
  dependencies: number[];
  optional: boolean;
}

export interface MemorySnapshot {
  timestamp: Date;
  phase: TaskPhase;
  summary: string;
  metrics: {
    filesExplored: number;
    insightsGathered: number;
    decisionsMode: number;
    codebaseUnderstanding: number; // 0-100
  };
}