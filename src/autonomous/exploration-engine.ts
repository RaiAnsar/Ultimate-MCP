/**
 * Autonomous Exploration Engine
 * Self-guided codebase exploration and task execution
 */

import {
  WorkingMemory,
  ProjectStructure,
  DirectoryNode,
  Insight,
  TaskContext,
  NavigationStep,
  Decision,
  ExplorationStrategy,
  ExplorationResult,
  AutonomousTask,
  FileAnalysis,
  NavigationAction,
  TaskPhase,
  InsightType,
  DecisionOption,
  NavigationPlan,
  PlannedStep
} from './types.js';
import { Logger } from '../utils/logger.js';
import { CodeContextManager } from '../code-context/context-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = new Logger('ExplorationEngine');

export class ExplorationEngine {
  private workingMemory: WorkingMemory;
  private contextManager: CodeContextManager;
  private strategies: Map<string, ExplorationStrategy>;
  private currentTask: AutonomousTask | null = null;
  
  constructor() {
    this.contextManager = new CodeContextManager();
    this.strategies = this.initializeStrategies();
    this.workingMemory = this.initializeWorkingMemory();
  }
  
  /**
   * Execute an autonomous task
   */
  async executeTask(task: AutonomousTask): Promise<ExplorationResult> {
    logger.info(`Starting autonomous task: ${task.description}`);
    this.currentTask = task;
    const startTime = Date.now();
    
    try {
      // Initialize task context
      this.workingMemory.taskContext = {
        id: task.id,
        description: task.description,
        goals: this.extractGoals(task),
        constraints: this.extractConstraints(task),
        currentPhase: 'exploration',
        progress: 0,
        startTime: new Date()
      };
      
      // Select strategy
      const strategy = task.strategy || this.selectStrategy(task);
      
      // Execute exploration phases
      for (const phase of strategy.phases) {
        await this.executePhase(phase);
        this.updateProgress();
      }
      
      // Generate result
      const result: ExplorationResult = {
        taskId: task.id,
        success: true,
        workingMemory: this.workingMemory,
        summary: this.generateSummary(),
        keyFindings: this.extractKeyFindings(),
        recommendations: this.generateRecommendations(),
        duration: Date.now() - startTime
      };
      
      logger.info(`Task completed in ${result.duration}ms`);
      return result;
      
    } catch (error) {
      logger.error('Task execution failed:', error);
      return {
        taskId: task.id,
        success: false,
        workingMemory: this.workingMemory,
        summary: `Task failed: ${error}`,
        keyFindings: [],
        recommendations: [],
        duration: Date.now() - startTime
      };
    } finally {
      this.currentTask = null;
    }
  }
  
  /**
   * Explore a codebase autonomously
   */
  async exploreCodebase(rootPath: string): Promise<ProjectStructure> {
    logger.info(`Exploring codebase at: ${rootPath}`);
    
    // Build initial structure
    const structure = await this.buildProjectStructure(rootPath);
    this.workingMemory.projectStructure = structure;
    
    // Identify key entry points
    await this.identifyEntryPoints(structure);
    
    // Explore important files
    await this.exploreKeyFiles();
    
    // Analyze patterns and conventions
    await this.analyzePatterns();
    
    return structure;
  }
  
  /**
   * Navigate to a specific target with reasoning
   */
  async navigateTo(target: string, reason: string): Promise<NavigationStep> {
    const step: NavigationStep = {
      id: this.generateId(),
      action: this.determineAction(target),
      target,
      reason,
      timestamp: new Date(),
      findings: []
    };
    
    try {
      // Execute navigation
      switch (step.action) {
        case 'read_file':
          const analysis = await this.analyzeFile(target);
          step.findings = this.extractFindings(analysis);
          break;
          
        case 'explore_directory':
          const files = await this.exploreDirectory(target);
          step.findings = files.map(f => `Found: ${f}`);
          break;
          
        case 'search_pattern':
          const matches = await this.searchPattern(target);
          step.findings = matches;
          break;
          
        case 'follow_import':
          const resolved = await this.resolveImport(target);
          step.findings = resolved ? [`Resolved to: ${resolved}`] : ['Could not resolve'];
          break;
      }
      
      // Record step
      this.workingMemory.navigationHistory.push(step);
      
      // Determine next steps
      step.nextSteps = await this.suggestNextSteps(step);
      
    } catch (error) {
      logger.error(`Navigation failed: ${error}`);
      step.findings = [`Error: ${error}`];
    }
    
    return step;
  }
  
  /**
   * Make an autonomous decision
   */
  async makeDecision(question: string, options: DecisionOption[]): Promise<Decision> {
    const decision: Decision = {
      id: this.generateId(),
      question,
      options,
      impact: this.assessImpact(question),
      timestamp: new Date()
    };
    
    // Autonomous decision making
    const selected = this.selectBestOption(options);
    decision.selected = selected.id;
    decision.rationale = this.generateRationale(selected, options);
    
    // Record decision
    this.workingMemory.decisions.push(decision);
    
    return decision;
  }
  
  /**
   * Plan navigation for a specific goal
   */
  async planNavigation(goal: string): Promise<NavigationPlan> {
    const steps: PlannedStep[] = [];
    
    // Analyze goal
    const targets = await this.identifyTargets(goal);
    
    // Plan steps
    let order = 0;
    for (const target of targets) {
      const action = this.determineAction(target);
      steps.push({
        order: order++,
        action,
        target,
        purpose: `Explore ${target} for ${goal}`,
        dependencies: [],
        optional: false
      });
    }
    
    // Add follow-up steps
    steps.push({
      order: order++,
      action: 'analyze_code',
      target: 'collected_data',
      purpose: 'Synthesize findings',
      dependencies: steps.map((s, i) => i),
      optional: false
    });
    
    return {
      steps,
      estimatedDuration: steps.length * 500, // Rough estimate
      requiredCapabilities: ['file_reading', 'code_analysis'],
      risks: ['Large codebase may exceed time limit']
    };
  }
  
  /**
   * Generate insights from exploration
   */
  async generateInsight(
    type: InsightType,
    description: string,
    filePath?: string
  ): Promise<Insight> {
    const insight: Insight = {
      id: this.generateId(),
      type,
      description,
      relevance: this.calculateRelevance(type, description),
      timestamp: new Date(),
      filePath
    };
    
    this.workingMemory.keyInsights.push(insight);
    logger.info(`Generated insight: ${description}`);
    
    return insight;
  }
  
  // Private helper methods
  
  private initializeStrategies(): Map<string, ExplorationStrategy> {
    const strategies = new Map<string, ExplorationStrategy>();
    
    // Comprehensive exploration strategy
    strategies.set('comprehensive', {
      name: 'Comprehensive Exploration',
      description: 'Thorough analysis of entire codebase',
      phases: [
        {
          name: 'Structure Discovery',
          goals: ['Map directory structure', 'Identify key files'],
          actions: ['explore_directory', 'read_file'],
          completionCriteria: ['All directories explored'],
          maxDuration: 30000
        },
        {
          name: 'Code Analysis',
          goals: ['Analyze main components', 'Trace dependencies'],
          actions: ['analyze_code', 'follow_import'],
          completionCriteria: ['Key files analyzed'],
          maxDuration: 60000
        },
        {
          name: 'Pattern Recognition',
          goals: ['Identify patterns', 'Find conventions'],
          actions: ['search_pattern', 'analyze_code'],
          completionCriteria: ['Patterns documented'],
          maxDuration: 30000
        }
      ],
      heuristics: [
        {
          name: 'Prioritize entry points',
          condition: 'File is main/index',
          action: 'Analyze first',
          priority: 10
        },
        {
          name: 'Follow imports',
          condition: 'Unknown import found',
          action: 'Resolve and explore',
          priority: 8
        }
      ]
    });
    
    // Focused exploration strategy
    strategies.set('focused', {
      name: 'Focused Exploration',
      description: 'Target specific areas of interest',
      phases: [
        {
          name: 'Target Location',
          goals: ['Find target files', 'Map local structure'],
          actions: ['search_pattern', 'explore_directory'],
          completionCriteria: ['Target found'],
          maxDuration: 15000
        },
        {
          name: 'Deep Analysis',
          goals: ['Understand implementation', 'Trace usage'],
          actions: ['analyze_code', 'check_references'],
          completionCriteria: ['Implementation understood'],
          maxDuration: 30000
        }
      ],
      heuristics: [
        {
          name: 'Skip unrelated',
          condition: 'File not related to target',
          action: 'Skip exploration',
          priority: 10
        }
      ]
    });
    
    return strategies;
  }
  
  private initializeWorkingMemory(): WorkingMemory {
    return {
      projectStructure: {
        rootPath: '',
        directories: { name: 'root', path: '', type: 'directory' },
        fileCount: 0,
        totalSize: 0,
        languages: {},
        patterns: []
      },
      visitedFiles: new Set<string>(),
      keyInsights: [],
      taskContext: {
        id: '',
        description: '',
        goals: [],
        constraints: [],
        currentPhase: 'exploration',
        progress: 0,
        startTime: new Date()
      },
      navigationHistory: [],
      decisions: []
    };
  }
  
  private async buildProjectStructure(rootPath: string): Promise<ProjectStructure> {
    const structure: ProjectStructure = {
      rootPath,
      directories: await this.buildDirectoryTree(rootPath),
      fileCount: 0,
      totalSize: 0,
      languages: {},
      patterns: []
    };
    
    // Calculate statistics
    this.calculateStructureStats(structure.directories, structure);
    
    // Detect patterns
    structure.patterns = await this.detectProjectPatterns(structure);
    
    return structure;
  }
  
  private async buildDirectoryTree(dirPath: string): Promise<DirectoryNode> {
    const name = path.basename(dirPath);
    const node: DirectoryNode = {
      name,
      path: dirPath,
      type: 'directory',
      children: []
    };
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip common ignore patterns
        if (this.shouldIgnore(entry.name)) continue;
        
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const childNode = await this.buildDirectoryTree(fullPath);
          node.children!.push(childNode);
        } else {
          const stats = await fs.stat(fullPath);
          const fileNode: DirectoryNode = {
            name: entry.name,
            path: fullPath,
            type: 'file',
            size: stats.size,
            language: this.detectLanguage(entry.name),
            lastModified: stats.mtime
          };
          node.children!.push(fileNode);
        }
      }
    } catch (error) {
      logger.error(`Failed to read directory ${dirPath}:`, error);
    }
    
    return node;
  }
  
  private shouldIgnore(name: string): boolean {
    const ignorePatterns = [
      'node_modules', '.git', 'dist', 'build', '.cache',
      '.next', '.nuxt', 'coverage', '.pytest_cache'
    ];
    return ignorePatterns.includes(name) || name.startsWith('.');
  }
  
  private detectLanguage(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.r': 'r',
      '.m': 'objective-c',
      '.h': 'c/cpp/objective-c',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bat': 'batch',
      '.ps1': 'powershell'
    };
    
    return languageMap[ext] || 'unknown';
  }
  
  private calculateStructureStats(
    node: DirectoryNode,
    structure: ProjectStructure
  ): void {
    if (node.type === 'file') {
      structure.fileCount++;
      structure.totalSize += node.size || 0;
      
      if (node.language && node.language !== 'unknown') {
        structure.languages[node.language] = 
          (structure.languages[node.language] || 0) + 1;
      }
    } else if (node.children) {
      for (const child of node.children) {
        this.calculateStructureStats(child, structure);
      }
    }
  }
  
  private async detectProjectPatterns(
    structure: ProjectStructure
  ): Promise<any[]> {
    const patterns = [];
    
    // Check for common patterns
    const hasPackageJson = await this.fileExists(
      path.join(structure.rootPath, 'package.json')
    );
    const hasTsConfig = await this.fileExists(
      path.join(structure.rootPath, 'tsconfig.json')
    );
    const hasRequirements = await this.fileExists(
      path.join(structure.rootPath, 'requirements.txt')
    );
    
    if (hasPackageJson) {
      patterns.push({
        name: 'Node.js Project',
        type: 'framework',
        evidence: ['package.json exists'],
        confidence: 0.9,
        implications: ['Use npm/yarn commands', 'Check node_modules']
      });
    }
    
    if (hasTsConfig) {
      patterns.push({
        name: 'TypeScript Project',
        type: 'framework',
        evidence: ['tsconfig.json exists'],
        confidence: 0.95,
        implications: ['Type-safe code', 'Compilation required']
      });
    }
    
    if (hasRequirements) {
      patterns.push({
        name: 'Python Project',
        type: 'framework',
        evidence: ['requirements.txt exists'],
        confidence: 0.9,
        implications: ['Use pip for dependencies', 'Check virtual env']
      });
    }
    
    return patterns;
  }
  
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  private async identifyEntryPoints(structure: ProjectStructure): Promise<void> {
    const entryPoints = [
      'index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts',
      'server.js', 'server.ts', 'index.py', 'main.py', 'app.py',
      '__main__.py', 'cli.js', 'cli.ts', 'cmd/main.go'
    ];
    
    for (const entry of entryPoints) {
      const found = this.findFileInStructure(structure.directories, entry);
      if (found) {
        await this.generateInsight(
          'entry-point',
          `Found entry point: ${entry}`,
          found
        );
      }
    }
  }
  
  private findFileInStructure(
    node: DirectoryNode,
    fileName: string
  ): string | null {
    if (node.type === 'file' && node.name === fileName) {
      return node.path;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = this.findFileInStructure(child, fileName);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  private async exploreKeyFiles(): Promise<void> {
    const insights = this.workingMemory.keyInsights
      .filter(i => i.type === 'entry-point');
    
    for (const insight of insights) {
      if (insight.filePath) {
        await this.analyzeFile(insight.filePath);
      }
    }
  }
  
  private async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const content = await fs.readFile(filePath, 'utf-8');
    const language = this.detectLanguage(filePath);
    
    const analysis: FileAnalysis = {
      filePath,
      language,
      purpose: 'Unknown',
      exports: [],
      imports: [],
      dependencies: [],
      complexity: this.calculateComplexity(content),
      issues: [],
      suggestions: []
    };
    
    // Extract file context
    const fileContext = await this.contextManager.getFileContext(filePath);
    if (fileContext) {
      analysis.imports = fileContext.imports.map(i => i.source);
      analysis.exports = fileContext.exports.map(e => e.name);
      
      // Determine purpose
      if (fileContext.classes.length > 0) {
        analysis.purpose = `Defines ${fileContext.classes.length} classes`;
      } else if (fileContext.functions.length > 0) {
        analysis.purpose = `Contains ${fileContext.functions.length} functions`;
      }
    }
    
    // Mark as visited
    this.workingMemory.visitedFiles.add(filePath);
    
    return analysis;
  }
  
  private calculateComplexity(content: string): number {
    // Simple complexity calculation
    const lines = content.split('\n').length;
    const conditions = (content.match(/if\s*\(|while\s*\(|for\s*\(/g) || []).length;
    const functions = (content.match(/function\s+\w+|=>|def\s+\w+/g) || []).length;
    
    return Math.round(Math.log(lines) + conditions * 2 + functions * 3);
  }
  
  private async analyzePatterns(): Promise<void> {
    // Analyze code patterns across visited files
    const patterns = new Map<string, number>();
    
    for (const filePath of this.workingMemory.visitedFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Check for common patterns
        if (content.includes('async') && content.includes('await')) {
          patterns.set('async/await', (patterns.get('async/await') || 0) + 1);
        }
        
        if (content.includes('class') && content.includes('extends')) {
          patterns.set('inheritance', (patterns.get('inheritance') || 0) + 1);
        }
        
        if (content.includes('import') || content.includes('require')) {
          patterns.set('modular', (patterns.get('modular') || 0) + 1);
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    // Generate insights from patterns
    for (const [pattern, count] of patterns) {
      if (count > 3) {
        await this.generateInsight(
          'pattern',
          `Common pattern detected: ${pattern} (found in ${count} files)`
        );
      }
    }
  }
  
  private async exploreDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!this.shouldIgnore(entry.name)) {
          const fullPath = path.join(dirPath, entry.name);
          files.push(fullPath);
          
          if (entry.isFile()) {
            this.workingMemory.visitedFiles.add(fullPath);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to explore directory ${dirPath}:`, error);
    }
    
    return files;
  }
  
  private async searchPattern(pattern: string): Promise<string[]> {
    const matches: string[] = [];
    
    for (const filePath of this.workingMemory.visitedFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.includes(pattern)) {
          matches.push(`${filePath}: Found pattern "${pattern}"`);
        }
      } catch (error) {
        // Skip unreadable files
      }
    }
    
    return matches;
  }
  
  private async resolveImport(importPath: string): Promise<string | null> {
    // Simple import resolution
    const basePath = this.workingMemory.projectStructure.rootPath;
    const possiblePaths = [
      path.join(basePath, importPath),
      path.join(basePath, importPath + '.js'),
      path.join(basePath, importPath + '.ts'),
      path.join(basePath, 'src', importPath),
      path.join(basePath, 'src', importPath + '.js'),
      path.join(basePath, 'src', importPath + '.ts')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (await this.fileExists(possiblePath)) {
        return possiblePath;
      }
    }
    
    return null;
  }
  
  private extractFindings(analysis: FileAnalysis): string[] {
    const findings: string[] = [];
    
    findings.push(`Purpose: ${analysis.purpose}`);
    findings.push(`Language: ${analysis.language}`);
    findings.push(`Complexity: ${analysis.complexity}`);
    
    if (analysis.exports.length > 0) {
      findings.push(`Exports: ${analysis.exports.join(', ')}`);
    }
    
    if (analysis.imports.length > 0) {
      findings.push(`Imports from: ${analysis.imports.slice(0, 3).join(', ')}`);
    }
    
    return findings;
  }
  
  private async suggestNextSteps(step: NavigationStep): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Based on current action, suggest follow-ups
    switch (step.action) {
      case 'read_file':
        // Suggest exploring imports
        suggestions.push('Follow imports to understand dependencies');
        suggestions.push('Look for test files');
        break;
        
      case 'explore_directory':
        // Suggest analyzing key files
        suggestions.push('Analyze main files in directory');
        suggestions.push('Check for configuration files');
        break;
        
      case 'analyze_code':
        // Suggest finding usage
        suggestions.push('Find where this code is used');
        suggestions.push('Check for related documentation');
        break;
    }
    
    return suggestions;
  }
  
  private extractGoals(task: AutonomousTask): string[] {
    const goals: string[] = [];
    
    switch (task.type) {
      case 'explore_codebase':
        goals.push('Map project structure');
        goals.push('Identify key components');
        goals.push('Understand architecture');
        break;
        
      case 'find_implementation':
        goals.push('Locate target implementation');
        goals.push('Understand how it works');
        goals.push('Trace usage patterns');
        break;
        
      case 'analyze_architecture':
        goals.push('Identify architectural patterns');
        goals.push('Map component relationships');
        goals.push('Find design decisions');
        break;
    }
    
    return goals;
  }
  
  private extractConstraints(task: AutonomousTask): string[] {
    const constraints: string[] = [];
    
    if (task.constraints?.maxFiles) {
      constraints.push(`Limit to ${task.constraints.maxFiles} files`);
    }
    
    if (task.constraints?.timeLimit) {
      constraints.push(`Complete within ${task.constraints.timeLimit}ms`);
    }
    
    if (task.constraints?.focusAreas) {
      constraints.push(`Focus on: ${task.constraints.focusAreas.join(', ')}`);
    }
    
    return constraints;
  }
  
  private selectStrategy(task: AutonomousTask): ExplorationStrategy {
    // Select appropriate strategy based on task type
    if (task.type === 'explore_codebase' || task.type === 'analyze_architecture') {
      return this.strategies.get('comprehensive')!;
    } else {
      return this.strategies.get('focused')!;
    }
  }
  
  private async executePhase(phase: any): Promise<void> {
    logger.info(`Executing phase: ${phase.name}`);
    this.workingMemory.taskContext.currentPhase = phase.name.toLowerCase() as TaskPhase;
    
    const startTime = Date.now();
    
    // Execute actions in phase
    for (const action of phase.actions) {
      if (phase.maxDuration && Date.now() - startTime > phase.maxDuration) {
        logger.warn(`Phase ${phase.name} exceeded time limit`);
        break;
      }
      
      // Execute action based on current understanding
      await this.executeAction(action);
    }
  }
  
  private async executeAction(action: NavigationAction): Promise<void> {
    switch (action) {
      case 'explore_directory':
        await this.exploreDirectory(this.workingMemory.projectStructure.rootPath);
        break;
        
      case 'analyze_code':
        // Analyze unvisited key files
        const keyFiles = this.workingMemory.keyInsights
          .filter(i => i.filePath && !this.workingMemory.visitedFiles.has(i.filePath))
          .map(i => i.filePath!);
        
        for (const file of keyFiles.slice(0, 5)) {
          await this.analyzeFile(file);
        }
        break;
        
      case 'search_pattern':
        // Search for common patterns
        const patterns = ['TODO', 'FIXME', 'HACK', 'BUG'];
        for (const pattern of patterns) {
          await this.searchPattern(pattern);
        }
        break;
    }
  }
  
  private updateProgress(): void {
    const visited = this.workingMemory.visitedFiles.size;
    const total = this.workingMemory.projectStructure.fileCount;
    
    if (total > 0) {
      this.workingMemory.taskContext.progress = Math.min(
        100,
        Math.round((visited / total) * 100)
      );
    }
  }
  
  private generateSummary(): string {
    const memory = this.workingMemory;
    const insights = memory.keyInsights.length;
    const files = memory.visitedFiles.size;
    const decisions = memory.decisions.length;
    
    return `Explored ${files} files, generated ${insights} insights, made ${decisions} decisions. ` +
           `Project uses ${Object.keys(memory.projectStructure.languages).join(', ')}.`;
  }
  
  private extractKeyFindings(): string[] {
    return this.workingMemory.keyInsights
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10)
      .map(i => i.description);
  }
  
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const structure = this.workingMemory.projectStructure;
    
    // Language-specific recommendations
    if (structure.languages['typescript']) {
      recommendations.push('Use TypeScript strict mode for better type safety');
    }
    
    if (structure.languages['python'] && !structure.patterns.find(p => p.name.includes('Type hints'))) {
      recommendations.push('Consider adding type hints to Python code');
    }
    
    // Pattern-based recommendations
    const hasTests = this.workingMemory.keyInsights.some(i => 
      i.description.toLowerCase().includes('test')
    );
    
    if (!hasTests) {
      recommendations.push('Add unit tests to improve code reliability');
    }
    
    return recommendations;
  }
  
  private determineAction(target: string): NavigationAction {
    if (target.endsWith('.js') || target.endsWith('.ts') || target.endsWith('.py')) {
      return 'read_file';
    } else if (target.includes('/') || target.includes('\\')) {
      return 'explore_directory';
    } else if (target.includes('*') || target.includes('?')) {
      return 'search_pattern';
    } else {
      return 'analyze_code';
    }
  }
  
  private assessImpact(question: string): 'low' | 'medium' | 'high' {
    if (question.toLowerCase().includes('delete') || 
        question.toLowerCase().includes('remove')) {
      return 'high';
    } else if (question.toLowerCase().includes('change') ||
               question.toLowerCase().includes('modify')) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  private selectBestOption(options: DecisionOption[]): DecisionOption {
    // Select option with highest confidence
    return options.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  }
  
  private generateRationale(
    selected: DecisionOption,
    allOptions: DecisionOption[]
  ): string {
    const pros = selected.pros.join(', ');
    const betterThan = allOptions
      .filter(o => o.id !== selected.id && o.confidence < selected.confidence)
      .length;
    
    return `Selected "${selected.label}" because: ${pros}. ` +
           `This option has ${Math.round(selected.confidence * 100)}% confidence ` +
           `and is better than ${betterThan} other options.`;
  }
  
  private calculateRelevance(type: InsightType, description: string): number {
    let relevance = 0.5;
    
    // Type-based relevance
    const typeRelevance: Record<InsightType, number> = {
      'entry-point': 0.9,
      'architecture': 0.85,
      'issue': 0.8,
      'pattern': 0.7,
      'dependency': 0.6,
      'opportunity': 0.75,
      'convention': 0.5,
      'test-coverage': 0.65
    };
    
    relevance = typeRelevance[type] || relevance;
    
    // Adjust based on description keywords
    const keywords = ['critical', 'important', 'main', 'core', 'key'];
    if (keywords.some(k => description.toLowerCase().includes(k))) {
      relevance = Math.min(1, relevance + 0.1);
    }
    
    return relevance;
  }
  
  private async identifyTargets(goal: string): Promise<string[]> {
    const targets: string[] = [];
    
    // Extract potential file/directory names from goal
    const words = goal.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      // Check if it looks like a file or directory
      if (word.includes('.') || word.includes('/')) {
        targets.push(word);
      }
      
      // Common file patterns
      const patterns = [
        `${word}.js`, `${word}.ts`, `${word}.py`,
        `${word}/index.js`, `${word}/index.ts`
      ];
      
      for (const pattern of patterns) {
        const found = this.findFileInStructure(
          this.workingMemory.projectStructure.directories,
          pattern
        );
        if (found) {
          targets.push(found);
        }
      }
    }
    
    return [...new Set(targets)]; // Remove duplicates
  }
  
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  
  // Public methods for interactive mode
  
  /**
   * Get current working memory state
   */
  getWorkingMemory(): WorkingMemory {
    return this.workingMemory;
  }
  
  /**
   * Get current task progress
   */
  getProgress(): { phase: string; progress: number; insights: number } {
    return {
      phase: this.workingMemory.taskContext.currentPhase,
      progress: this.workingMemory.taskContext.progress,
      insights: this.workingMemory.keyInsights.length
    };
  }
  
  /**
   * Request user input for a decision
   */
  async requestUserInput(
    question: string,
    options: string[]
  ): Promise<string> {
    // In a real implementation, this would interact with the user
    // For now, return the first option
    logger.info(`User input requested: ${question}`);
    return options[0];
  }
}